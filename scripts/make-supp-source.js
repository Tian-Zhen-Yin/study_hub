// 系分综合知识题打标：高价值(架构师同考点出题>=3) -> CHEKO_SUPP，其余 -> ARCH_EXCL
// 依据 scripts/kp-mapping.js 的语义映射，输入为库内真题标签，输出 UPDATE SQL
const { execFileSync } = require('child_process');
const fs = require('fs');
const { ARCH_MAP, SA_MAP } = require('./kp-mapping');

const MYSQL = ['-uroot', '-proot', '--default-character-set=utf8mb4', '-N', '-B', 'study_hub'];
const q = (sql) => execFileSync('mysql', [...MYSQL, '-e', sql], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));

// 架构侧各规范知识点的出题量（判定"架构师也实考"的阈值依据）
const archKeyCount = {};
for (const [id, name, cnt] of q(`SELECT kp_node_id, (SELECT name FROM kp_nodes WHERE id=kp_node_id), COUNT(*)
  FROM questions WHERE paper_id IN (SELECT id FROM exam_papers WHERE subject='架构设计师')
  AND question_type IN ('MCQ','') GROUP BY kp_node_id`)) {
  const key = ARCH_MAP[name];
  if (key) archKeyCount[key] = (archKeyCount[key] || 0) + Number(cnt);
}
// 系分综合知识题 -> 规范键
const rows = q(`SELECT q.id, (SELECT name FROM kp_nodes WHERE id=q.kp_node_id)
  FROM questions q JOIN exam_papers p ON q.paper_id=p.id
  WHERE p.subject='系统分析师' AND q.question_type IN ('MCQ','')`);

const supp = [], excl = [];
for (const [id, name] of rows) {
  const key = SA_MAP[name];
  if (!key) { console.error(`未映射标签: ${name} (q.id=${id})`); process.exit(1); }
  ((archKeyCount[key] || 0) >= 3 ? supp : excl).push(Number(id));
}
console.log(`系分综合知识 ${rows.length} 题：高价值(补充) ${supp.length}，隔离 ${excl.length}`);
if (supp.length + excl.length !== rows.length) process.exit(1);

const idList = arr => arr.join(',');
const sql = `-- 系分真题按架构师视角分档打标 (${new Date().toISOString().slice(0,10)})
-- 高价值 ${supp.length} 题 -> CHEKO_SUPP（保留在抽题池，可经 source 筛选专项刷）
-- 其余 ${excl.length} 题 -> ARCH_EXCL（移出抽题池与模拟考试，真题页仍可整卷浏览）
-- 幂等：WHERE 带原 source 条件，可重复执行
UPDATE questions SET source='CHEKO_SUPP' WHERE id IN (${idList(supp)}) AND source IN ('CHEKO','RUANKAO');
UPDATE questions SET source='ARCH_EXCL' WHERE id IN (${idList(excl)}) AND source IN ('CHEKO','RUANKAO');
-- 回滚（RUANKAO 原源不恢复，恢复为 CHEKO）：
-- UPDATE questions SET source='CHEKO' WHERE source IN ('CHEKO_SUPP','ARCH_EXCL');
`;
fs.writeFileSync(`${__dirname}/supp-source.sql`, sql);
console.log(`已生成 ${__dirname}/supp-source.sql`);

// 执行并校验
execFileSync('mysql', [...MYSQL.slice(0, -1), 'study_hub', '-e',
  `source ${__dirname.replace(/\\/g,'/')}/supp-source.sql`]);
for (const line of q(`SELECT source, COUNT(*) FROM questions WHERE paper_id IN
  (SELECT id FROM exam_papers WHERE subject='系统分析师') AND question_type IN ('MCQ','')
  GROUP BY source`)) console.log(line.join('\t'));
