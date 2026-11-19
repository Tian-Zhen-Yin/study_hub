// 将 enhanced.jsonl 的解析写回 questions 表,并记录到 ai_enhanced 表
const fs = require('fs');
const path = require('path');

const rows = fs.readFileSync(path.join(__dirname, 'enhanced.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
console.log('to write back:', rows.length);

// MySQL 字符串转义: 反斜杠和单引号
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let sql = 'SET NAMES utf8mb4;\n';
sql += 'CREATE TABLE IF NOT EXISTS ai_enhanced (question_id BIGINT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);\n';
rows.forEach(r => {
  sql += `UPDATE questions SET analysis='${esc(r.analysis)}' WHERE id=${r.id};\n`;
  sql += `INSERT IGNORE INTO ai_enhanced (question_id) VALUES (${r.id});\n`;
});
fs.writeFileSync(path.join(__dirname, 'writeback.sql'), sql);
console.log('writeback.sql written');
