// 精讲 v2 两阶段: ① 从考点真题提取知识点清单(简单任务,思考短)
//                ② 原精讲+清单 → 深度笔记(照纲写作,思考短)
// --sample 只处理题量最大的 1 个考点; --shard=N/M 分片; 断点续跑 essence-v2.jsonl
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(DATA, 'essence-v2.jsonl');
const SAMPLE = process.argv.includes('--sample');
const shardArg = (process.argv.find(a => a.startsWith('--shard=')) || '').slice(8);
const SHARD = shardArg ? shardArg.split('/').map(Number) : null;

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
const queryRows = (sql) => execFileSync('mysql', ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub', '-N', '-B'],
  { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
  .split('\n').filter(Boolean).map(l => JSON.parse(unescapeMysql(l.replace(/\r$/, ''))));
const execSql = (sql) => execFileSync('mysql', ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'],
  { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

async function glmChat(key, baseUrl, content, maxTokens, maxRetry = 3) {
  for (let a = 1; a <= maxRetry; a++) {
    try {
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'glm-5.2', messages: [{ role: 'user', content }], temperature: 0.3, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(240000),
      });
      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 6000 * a)); continue; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const c = j.choices?.[0]?.message?.content || '';
      if (!c) console.log(`  ~GLM 空内容 finish=${j.choices?.[0]?.finish_reason} reasoning=${j.usage?.completion_tokens_details?.reasoning_tokens}`);
      return c;
    } catch (e) {
      if (a === maxRetry) throw e;
      await new Promise(r => setTimeout(r, 5000 * a));
    }
  }
  return '';
}
function betweenTags(out) {
  const m = String(out).match(/<<<BEGIN>>>\s*([\s\S]*?)<<<END>>>/);
  return m ? m[1].trim() : '';
}

(async () => {
  const cfg = queryRows("SELECT JSON_OBJECT('k',api_key,'u',base_url) FROM llm_provider_config WHERE provider='ZHIPU' AND enabled=1")[0];
  if (!cfg || !cfg.k) { console.log('无 ZHIPU key'); process.exit(1); }

  let kps = queryRows("SELECT JSON_OBJECT('id',id,'name',name,'freq',freq,'qc',question_count,'e',essence) FROM kp_nodes WHERE is_parent=0 AND question_count>0 ORDER BY question_count DESC");
  if (SHARD) {
    const [n, m] = SHARD;
    kps = kps.filter((k, i) => i % m === n);
  }
  const qrows = queryRows("SELECT JSON_OBJECT('kp',kp_node_id,'y',IFNULL(exam_year,''),'t',question_type,'s',LEFT(stem,200),'a',LEFT(IFNULL(analysis,''),260)) FROM questions WHERE kp_node_id IS NOT NULL");
  const byKp = new Map();
  for (const q of qrows) {
    if (!byKp.has(q.kp)) byKp.set(q.kp, []);
    byKp.get(q.kp).push(q);
  }

  const done = new Set();
  if (fs.existsSync(OUT)) fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).forEach(l => { try { done.add(JSON.parse(l).id); } catch {} });
  if (!SAMPLE && SHARD) {
    fs.writeFileSync(path.join(DATA, `essence-v1-backup-${SHARD[0]}.jsonl`), kps.map(k => JSON.stringify({ id: k.id, e: k.e || null })).join('\n') + '\n');
  }
  let pool = kps.filter(k => !done.has(k.id));
  const total = pool.length;
  if (SAMPLE) pool = pool.slice(0, 1);
  console.log(`考点 ${kps.length}, 本次处理 ${pool.length}${SAMPLE ? ' (sample)' : ''}`);

  const stream = fs.createWriteStream(OUT, { flags: 'a' });
  let ok = 0, fail = 0;
  for (let i = 0; i < pool.length; i++) {
    const k = pool[i];
    const qs = (byKp.get(Number(k.id)) || []).slice(0, 6);
    const mat = qs.map(q => `[${q.y || '?'}·${q.t === 'CASE' ? '案例' : q.t === 'ESSAY' ? '论文' : '单选'}] ${String(q.s || '').replace(/\s+/g, ' ')}${q.a ? ' ┃解析:' + String(q.a).replace(/\s+/g, ' ') : ''}`).join('\n');

    // 阶段①: 提取知识点清单
    const p1 = `考点「${k.name}」的软考真题如下。请逐题提取它们实际考查的知识点(概念/方法/计算/对比/细节), 合并去重为一份清单。每条一行 "- ", 简明但具体到可考核的细节。只列清单, 不解释。
输出格式: 首行 <<<BEGIN>>> 清单 末行 <<<END>>>

${mat}`;
    let points = '';
    for (let a = 1; a <= 2 && !points; a++) {
      points = betweenTags(await glmChat(cfg.k, cfg.u, p1, 9000));
      if (!points) console.log(`  ! id=${k.id} 提取第${a}次失败`);
    }
    if (!points) { fail++; console.log(`[${i + 1}/${pool.length}] 提取最终失败 id=${k.id}`); continue; }

    // 阶段②: 清单+原精讲 → 深度笔记
    const p2 = `你是软考备考专家。为考点「${k.name}」(${k.freq || '未标注'}) 写考点精讲笔记, 覆盖范围=下面的「知识点清单」(来自真实真题), 深度以能做对这些题为标准。原精讲的正确内容可吸收; 清单每条知识点都必须讲到; 不得编造清单之外的具体事实。
格式: 关键术语/结论/公式**加粗**; 要点用 "- "; 对比用 Markdown 表格; 关键处行首加【高频】【易错】【易混淆】【记忆】(3~6个); 不用一级标题。
输出格式: 首行 <<<BEGIN>>> 笔记 末行 <<<END>>>

原精讲:
${k.e ? String(k.e).slice(0, 2200) : '（无）'}

知识点清单:
${points.slice(0, 3000)}`;
    let md = '';
    for (let a = 1; a <= 2 && !md; a++) {
      md = betweenTags(await glmChat(cfg.k, cfg.u, p2, 26000));
      if (!md) console.log(`  ! id=${k.id} 写作第${a}次失败`);
      else {
        const minLen = k.e ? Math.max(300, Math.min(k.e.length, 2000) * 0.6) : 300;
        if (md.length < minLen) { console.log(`  ! id=${k.id} 长度 ${md.length}/${minLen}`); md = ''; }
      }
    }
    if (md) {
      stream.write(JSON.stringify({ id: k.id, name: k.name, md, points }) + '\n');
      ok++;
      if ((i + 1) % 5 === 0 || i === pool.length - 1) console.log(`[${i + 1}/${pool.length}] ok=${ok} fail=${fail}`);
      if (SAMPLE) {
        console.log('\n===== 知识点清单(' + k.name + ') =====\n', points.slice(0, 500));
        console.log('\n===== 笔记前 700 字 =====\n', md.slice(0, 700));
      }
    } else { fail++; console.log(`[${i + 1}/${pool.length}] 写作最终失败 id=${k.id}`); }
    await new Promise(r => setTimeout(r, 400));
  }
  stream.end();
  console.log(`完成: ok=${ok} fail=${fail} (池 ${total})`);

  if (!SAMPLE && ok > 0) {
    const results = fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const byId = new Map(results.map(r => [r.id, r]));
    let n = 0;
    for (let i2 = 0; i2 < results.length; i2 += 40) {
      const c = results.slice(i2, i2 + 40);
      execSql(c.map(r => `UPDATE kp_nodes SET essence='${esc(byId.get(r.id).md)}' WHERE id=${r.id};`).join('\n'));
      n += c.length;
    }
    console.log(`已回写 ${n} 条`);
  }
})().catch(e => { console.error(e); process.exit(1); });
