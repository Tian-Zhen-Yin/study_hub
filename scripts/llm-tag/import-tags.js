// 将 tags.jsonl 导入 question_quality 表 (可重复执行, UPSERT)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tags = fs.readFileSync(path.join(__dirname, 'tags.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
console.log('tags to import:', tags.length);

// 批量生成 INSERT ... ON DUPLICATE KEY UPDATE
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const CHUNK = 200;
for (let i = 0; i < tags.length; i += CHUNK) {
  const chunk = tags.slice(i, i + CHUNK);
  const values = chunk.map(t =>
    `(${t.id},'${esc(t.kp)}','${esc(t.qt)}',${t.score},'${esc(t.note || '')}','glm-5.3-flash')`
  ).join(',');
  const sql = `INSERT INTO question_quality (question_id, knowledge_point, q_type, score, note, model) VALUES ${values} ` +
    `ON DUPLICATE KEY UPDATE knowledge_point=VALUES(knowledge_point), q_type=VALUES(q_type), score=VALUES(score), note=VALUES(note);`;
  fs.writeFileSync(path.join(__dirname, 'import-tmp.sql'),
    "SET NAMES utf8mb4;\n" + sql);
  execSync('mysql -uroot -proot --default-character-set=utf8mb4 study_hub < import-tmp.sql', { stdio: 'pipe' });
  process.stdout.write(`\rimported ${Math.min(i + CHUNK, tags.length)}/${tags.length}`);
}
console.log('\nDONE');
