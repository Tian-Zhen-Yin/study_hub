// 一次性: 对剩余无父级考点做小批次 GLM 归类(批量小,降低截断率)。可重复执行。
const { execFileSync } = require('child_process');

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
  { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  .split('\n').filter(Boolean).map(l => JSON.parse(unescapeMysql(l.replace(/\r$/, ''))));
const execSql = (sql) => execFileSync('mysql', ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'],
  { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

function parseJsonLoose(text) {
  let t = String(text).trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('['), e = t.lastIndexOf(']');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

(async () => {
  const cfg = queryRows("SELECT JSON_OBJECT('k',api_key,'u',base_url) FROM llm_provider_config WHERE provider='ZHIPU' AND enabled=1")[0];
  const nodes = queryRows("SELECT JSON_OBJECT('id',id,'name',name,'parent_id',parent_id,'is_parent',CAST(is_parent AS UNSIGNED)) FROM kp_nodes");
  const roots = nodes.filter(n => n.is_parent).map(n => ({ id: Number(n.id), name: n.name }));
  const orphans = nodes.filter(n => !n.is_parent && n.parent_id == null);
  console.log('孤儿考点:', orphans.length);
  if (!orphans.length) { console.log('无孤儿, 完成'); return; }
  const rootList = roots.map(r => `${r.id}=${r.name}`).join('；');
  let done = 0;
  for (let i = 0; i < orphans.length; i += 8) {
    const chunk = orphans.slice(i, i + 8);
    const list = chunk.map(o => `${o.id}=${o.name}`).join('；');
    const prompt = `给每个软考考点分配最贴切的一个顶级分类 id。严格要求: 只输出一个 JSON 数组, 格式 [{"id":数字,"root":数字}], 数组元素个数必须等于考点个数(${chunk.length}个), 不要任何解释。\n顶级分类: ${rootList}\n考点: ${list}`;
    try {
      const res = await fetch(cfg.u.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.k },
        body: JSON.stringify({ model: 'glm-5.2', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 8000 }),
        signal: AbortSignal.timeout(180000),
      });
      const j = await res.json();
      const content = j.choices?.[0]?.message?.content || '';
      const pairs = parseJsonLoose(content);
      const updates = [];
      for (const p of pairs) {
        const kid = Number(p.id), rid = Number(p.root);
        if (roots.some(r => r.id === rid) && orphans.some(o => Number(o.id) === kid)) updates.push([kid, rid]);
      }
      if (updates.length) {
        execSql(`UPDATE kp_nodes SET parent_id=ELT(FIELD(id,${updates.map(u => u[0]).join(',')}),${updates.map(u => u[1]).join(',')}) WHERE id IN (${updates.map(u => u[0]).join(',')});`);
      }
      done += updates.length;
      console.log(`  ${Math.min(i + 8, orphans.length)}/${orphans.length} 批内成功 ${updates.length}/${chunk.length}`);
    } catch (e) { console.log(`  批次失败: ${e.message}`); }
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('本轮归类成功:', done);
})();
