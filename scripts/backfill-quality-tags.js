// 任务3：1802 题 question_quality 考点标签回填 + domain_id 回填（零 LLM，规则+映射表）
// 用法：
//   node scripts/backfill-quality-tags.js --dry-run   # 只打印统计，不写库（默认）
//   node scripts/backfill-quality-tags.js --apply     # 写库（先自动备份到 backups/）
// 幂等：question_quality 用 INSERT IGNORE（不覆盖既有 5 行 CHEKO_SUPP LLM 标签）；
//       domain_id 只更新 IS NULL 的行；可重复执行。
// 范围：CHEKO 767 + CHEKO_SUPP 620（5 行已有标签跳过）+ YUCE_WEN 75 + GENERATED 62；
//       ARCH_EXCL 276 不补（被隔离出抽题池，且补了会进变式池，见汇报）。
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const M = require('./kp-quality-mapping.js');

const DRY = !process.argv.includes('--apply');
const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');
const STAMP = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const MYSQL_ARGS = ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'];
const log = (...a) => console.log(...a);

function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
function unescapeMysql(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const c = s[i + 1];
      const map = { n: '\n', t: '\t', r: '\r', Z: '\x1a', '\\': '\\', "'": "'", '"': '"' };
      if (map[c] !== undefined) { out += map[c]; i += 2; continue; }
      if (c === '0') { i += 2; continue; }
    }
    out += s[i]; i++;
  }
  return out;
}
function queryRows(sql) {
  const out = execFileSync('mysql', MYSQL_ARGS.slice(0, 4).concat(['-N', '-B']), {
    input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, shell: false,
  });
  return out.split('\n').filter(Boolean).map(l => JSON.parse(unescapeMysql(l.replace(/\r$/, ''))));
}
function runSql(sql) {
  if (DRY) return;
  const tmp = path.join(__dirname, 'tmp-task3', 'backfill-tmp.sql');
  fs.writeFileSync(tmp, 'SET NAMES utf8mb4;\n' + sql);
  execSync('mysql ' + MYSQL_ARGS.join(' ') + ' < "' + tmp + '"', { stdio: 'pipe', shell: 'cmd.exe' });
}

/* ---------- 备份 ---------- */
function backup() {
  if (DRY) { log('[backup] dry-run 跳过'); return; }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const f = path.join(BACKUP_DIR, `pre-task3-quality-${STAMP}.sql`);
  const whereQ = "--where=\"source IN ('CHEKO','CHEKO_SUPP','YUCE_WEN','GENERATED')\"";
  execSync(`mysqldump -uroot -proot --default-character-set=utf8mb4 study_hub questions ${whereQ} > "${f}"`, { shell: 'cmd.exe', stdio: 'pipe' });
  execSync(`mysqldump -uroot -proot --default-character-set=utf8mb4 study_hub question_quality >> "${f}"`, { shell: 'cmd.exe', stdio: 'pipe' });
  log('[backup] 已写入', f, `(${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
}

/* ---------- q_type 规则（顺序判定） ---------- */
const RE_CALC = /(计算|求出|至少需要|最多需要|需要多少|多少个|多少条|多少位|利用率为|可靠度为|可靠度|吞吐率|执行时间|时钟周期|带宽|误码率|码元|子网掩码|可用主机|关键路径|总时差|最迟开始|最早开始|净收益|回收期|盈亏平衡|周转时间|平均页服务|命中率)/;
const RE_SCEN = /(某(企业|公司|单位|银行|学校|医院|项目|系统|软件|电商|平台|团队|部门|省|市)|该项目|该企业|该公司|该系统|项目组|开发小组|运维团队)/;
const RE_RECALL = /(属于|不属于|包括|不包括|正确的是|错误的是|不正确的是|正确的有|错误的有)/;

function ruleQType(qtype, stem) {
  if (qtype === 'CASE') return 'CASE';
  if (qtype === 'ESSAY') return 'ESSAY';
  const t = String(stem || '');
  if (RE_CALC.test(t)) return 'CALC';
  if (RE_SCEN.test(t)) return 'SCENARIO';
  if (t.length < 80 && RE_RECALL.test(t)) return 'RECALL';
  return 'CONCEPT';
}

/* ---------- score 规则：历年真题 4；flag_type 非空降为 2 并注原因；其余 3 ---------- */
function ruleScore(source, flag) {
  const isPast = source === 'CHEKO' || source === 'CHEKO_SUPP';
  let s = isPast ? 4 : 3;
  if (flag) s = Math.max(1, s - 1); // 降 1 分
  return s;
}

/* ---------- YUCE_WEN 关键词 -> 规范考点（有序，先专后泛） ---------- */
const YUCE_RULES = [
  [/RAG|检索增强|向量数据库|知识库问答/, 'RAG检索增强生成'],
  [/(大模型|LLM|提示词|智能体|Agent(?!架构)|监督学习|机器学习)/, '大模型与工业智能架构'],
  [/(雪崩|穿透|击穿|秒杀|高并发)/, '分布式缓存与高并发'],
  [/Redis|缓存/, '数据库缓存'],
  [/(消息队列|MQ|Kafka|RabbitMQ|RocketMQ|削峰)/, '中间件架构'],
  [/(弹性伸缩|扩缩容|自动扩容)/, '云服务弹性伸缩'],
  [/(微服务|服务网格|注册中心|服务拆分)/, '微服务架构'],
  [/(限界上下文|领域驱动|DDD)/, '领域驱动设计'],
  [/(CAP|BASE理论|一致性哈希|最终一致|分布式事务|两阶段提交|Paxos|Raft)/, '分布式事务'],
  [/负载均衡/, '负载均衡'],
  [/RESTful|REST /, 'REST与Web Service'],
  [/(净室)/, '净室软件工程'],
  [/ABSD|基于架构的软件/, '基于架构的软件开发'],
  [/DSSA/, '特定领域软件架构'],
  [/(协同过滤|推荐算法)/, '推荐系统与机器学习架构'],
  [/(GPL|LGPL|开源协议)/, '知识产权'],
  [/(国家强制标准|强制标准|标准规范)/, '标准化'],
  [/(位示图|空闲存储空间)/, '文件系统'],
  [/(中断方式|DMA)/, 'DMA传输方式'],
  [/(三层C\/S|C\/S架构|B\/S)/, 'C/S架构模式'],
  [/(Hofmeister|4 ?视图|4\+1)/, '4+1视图模型'],
  [/(战略信息|战略规划|信息工程)/, '信息系统战略规划方法'],
  [/(N ?版本|容错设计)/, '可靠性与容错架构'],
  [/(每日构建|Daily ?Build)/, '自动化测试'],
  [/(边界值|等价类|测试用例)/, '黑盒测试'],
  [/(回归|修复没有对|不良影响)/, '回归测试'],
  [/(集成测试|组装测试|组合在一起)/, '集成测试'],
  [/(验收测试|真实用户|确认测试)/, '软件测试基础'],
  [/(设计原则)/, '面向对象设计'],
  [/(制品|配置管理)/, '配置管理'],
  [/(软件维护类型|维护类型|适应性维护|完善性维护|纠正性维护|预防性维护)/, '软件维护'],
  [/(内聚|耦合)/, '模块化设计'],
  [/(函数依赖|主键|候选码)/, '函数依赖与候选键'],
  [/(状态转换|控制规格|结构化分析)/, '结构化分析'],
  [/(需求规格说明书|SRS)/, '需求规格说明'],
  [/(需求获取)/, '需求获取'],
  [/(RUP|统一软件开发过程)/, '统一过程(RUP)'],
  [/(敏捷|Scrum)/, '敏捷开发与Scrum'],
  [/著作权法|著作权/, '著作权'],
  [/(商业智能|BI)/, '商业智能'],
  [/(分段存储|页面置换|内存)/, '内存管理'],
  [/(关系代数|元组)/, '关系代数'],
  [/(数据流图|DFD)/, '数据流图与数据字典'],
  [/^[\x00-\x7F]{80,}$/, '专业英语'],  // 纯 ASCII 长题干 → 英语
  [/(UML|用例图|类图|顺序图|状态图)/, 'UML'],
  [/(设计模式|工厂模式|单例|观察者|策略模式|装饰器|代理模式|命令模式|请求封装)/, '设计模式'],
  [/(架构风格|管道|过滤器|仓库风格|解释器|分层架构|层次式架构|架构模式)/, '软件架构风格'],
  [/(ATAM|效用树|架构评估)/, '架构评估方法'],
  [/(质量属性|可用性|可修改性|安全性需求)/, '软件质量属性'],
  [/(可靠性|MTBF|MTTF|容错|冗余|平均故障间隔|故障间隔)/, '系统可靠性'],
  [/(加密|防火墙|攻击|安全协议|数字签名|PKI)/, '信息安全基础知识'],
  [/(死锁|进程|线程)/, '进程管理'],
  [/(子网|IP地址|路由|协议|网络)/, 'IP地址与子网划分'],
  [/(范式|候选键|索引|事务|SQL|数据库)/, '数据库设计'],
  [/(线性规划|动态规划|最短路径|最小生成树|图论|贪心)/, '数学建模'],
  [/(关键路径|进度|挣值|风险管理|项目)/, '进度管理'],
  [/(中间件|Web服务|SOA)/, '中间件架构'],
];

function main() {
  log(`== 任务3 回填（${DRY ? 'DRY-RUN' : 'APPLY'}）==`);
  backup();

  // 1. 新建 3 个域（幂等）
  const domainRows = queryRows('SELECT JSON_OBJECT(\'id\',id,\'name\',name) FROM domains');
  const haveNames = new Set(domainRows.map(r => r.name));
  const toCreate = M.NEW_DOMAINS.filter(d => !haveNames.has(d.name));
  if (toCreate.length) {
    log('[domains] 新建:', toCreate.map(d => `${d.id}:${d.name}`).join(', '));
    runSql(toCreate.map(d =>
      `INSERT INTO domains (name,pct,priority,state) SELECT '${esc(d.name)}',0,'${d.priority}','待诊断' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM domains WHERE name='${esc(d.name)}');`
    ).join('\n'));
  } else log('[domains] 3 个新域已存在，跳过');

  // 2. 拉取目标题（CHEKO/SUPP/YUCE 全量 + GENERATED）
  const qs = queryRows(
    `SELECT JSON_OBJECT('id',id,'src',source,'qtype',question_type,'kpid',kp_node_id,'stem',stem,'flag',flag_type,'sfile',source_file,'dom',domain_id)
     FROM questions WHERE source IN ('CHEKO','CHEKO_SUPP','YUCE_WEN','GENERATED') ORDER BY id`
  );
  // 已有标签的题（只补不删，不覆盖）
  const tagged = new Set(queryRows('SELECT JSON_OBJECT(\'qid\',question_id) FROM question_quality').map(r => r.qid));

  const tagInserts = [];   // question_quality INSERT IGNORE
  const domainUpdates = []; // questions.domain_id 仅 IS NULL
  const uncovered = [];    // 映射不上的 kp 名（应=0）
  const yuceUnmatched = [];
  const stats = { bySource: {}, qtype: {}, domain: {}, canon: {}, note: [] };

  for (const q of qs) {
    const st = stats.bySource[q.src] = stats.bySource[q.src] || { total: 0, tagged: 0, newTag: 0, domainFix: 0, skip: 0 };
    st.total++;
    let canon = null, basis = null;
    if (q.src === 'GENERATED') {
      canon = /math/.test(q.sfile || '') ? '应用数学' : '未来信息综合技术';
      basis = `gen 分类直取 ${q.sfile}`;
    } else if (q.src === 'YUCE_WEN') {
      const stem = q.stem || '';
      const hit = YUCE_RULES.find(([re]) => re.test(stem));
      if (hit) { canon = hit[1]; basis = `yuce 规则=${hit[0].source.slice(0, 24)}→${canon}`.slice(0, 110); }
      else { yuceUnmatched.push(q.id); basis = null; }
    } else { // CHEKO / CHEKO_SUPP
      const node = kpNameOf(q.kpid);
      if (!node) { uncovered.push({ qid: q.id, kp: q.kpid }); continue; }
      const r = M.resolveKp(node);
      if (!r.domain) { uncovered.push({ qid: q.id, kp: node }); continue; }
      canon = r.canon;
      basis = `${q.src.toLowerCase()} kp=${node}${r.canon !== node ? ' 归一至' + r.canon : ''}`;
    }
    if (q.flag) basis += `；flag_type=${q.flag} 降分`;
    if (!canon) continue; // YUCE 未命中，稍后汇总
    stats.canon[canon] = (stats.canon[canon] || 0) + 1;

    const qtype = ruleQType(q.qtype || (q.src === 'GENERATED' || q.src === 'YUCE_WEN' ? 'MCQ' : ''), q.stem);
    const score = ruleScore(q.src, q.flag);
    stats.qtype[qtype] = (stats.qtype[qtype] || 0) + 1;

    // 领域：CASE→10 / ESSAY→11 覆盖；其余按规范名
    let dom;
    if (qtype === 'CASE') dom = 10;
    else if (qtype === 'ESSAY') dom = 11;
    else dom = M.CANON2DOMAIN[canon] ?? (M.KEYWORD_DOMAIN.find(([re]) => re.test(canon)) || [null])[1];

    if (!tagged.has(q.id)) {
      tagInserts.push(`INSERT IGNORE INTO question_quality (question_id,knowledge_point,q_type,score,note,model) VALUES (${q.id},'${esc(canon)}','${qtype}',${score},'${esc(basis)}','kp-rule');`);
      st.newTag++;
    } else st.skip++;

    if (q.dom == null && dom != null) {
      domainUpdates.push(`UPDATE questions SET domain_id=${dom} WHERE id=${q.id} AND domain_id IS NULL;`);
      st.domainFix++;
    }
  }

  log('[统计] 按 source:', JSON.stringify(stats.bySource));
  log('[统计] q_type 分布:', JSON.stringify(stats.qtype));
  log('[统计] 规范考点簇 top20:', Object.entries(stats.canon).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}:${v}`).join(' | '));
  log('[统计] uncovered kp:', uncovered.length, JSON.stringify(uncovered.slice(0, 10)));
  log('[统计] YUCE 未命中:', yuceUnmatched.length, yuceUnmatched.join(','));
  log(`[写入] question_quality INSERT ${tagInserts.length} 条; questions.domain_id UPDATE ${domainUpdates.length} 条`);

  if (!DRY) {
    const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
    for (const c of chunk(tagInserts, 200)) runSql(c.join('\n'));
    for (const c of chunk(domainUpdates, 200)) runSql(c.join('\n'));
    log('[写入] 完成');
  }
  fs.writeFileSync(path.join(__dirname, 'tmp-task3', `backfill-plan-${STAMP}.json`),
    JSON.stringify({ uncovered, yuceUnmatched, stats }, null, 2));
}

// kp_node_id -> name 查询缓存（避免逐题查库）
let kpMap = null;
function kpNameOf(id) {
  if (!kpMap) {
    kpMap = new Map(queryRows("SELECT JSON_OBJECT('id',id,'name',name) FROM kp_nodes").map(r => [r.id, r.name]));
  }
  return kpMap.get(id) || null;
}

main();
