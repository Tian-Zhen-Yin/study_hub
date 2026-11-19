// 手动回写 essence-md.jsonl 到 kp_nodes（幂等，可随时重跑；分片任务的最终回写同样幂等）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'data', 'essence-md.jsonl');
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

const results = fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const byId = new Map(results.map(r => [r.id, r]));
let n = 0;
for (let i = 0; i < results.length; i += 50) {
  const c = results.slice(i, i + 50);
  const sql = c.map(r => `UPDATE kp_nodes SET essence='${esc(byId.get(r.id).md)}' WHERE id=${r.id};`).join('\n');
  execFileSync('mysql', ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'], { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  n += c.length;
}
console.log('writeback:', n);
