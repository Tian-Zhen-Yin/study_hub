// 知识图谱语义增强（三步,可重复执行）:
//   1. 共现边: 同一试卷出现过的考点对 → kp_edges(kind='co', weight=共现卷数, ≥2)
//   2. 孤儿归类: 152 个无父级考点由 GLM 归入 36 个顶级分类 → 更新 kp_nodes.parent_id
//   3. 语义边: GLM 对每个分类组内推荐强关联考点对(易混淆/常一起考) → kp_edges(kind='semantic')
// LLM key 取自应用配置表 llm_provider_config(provider=ZHIPU), 不落日志。
const { execFileSync } = require('child_process');

const MYSQL_ARGS = ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub', '-N', '-B'];
const DRY = process.argv.includes('--dry-run');
const log = (...a) => console.log(...a);

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
  const out = execFileSync('mysql', MYSQL_ARGS, { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  return out.split('\n').filter(Boolean).map(l => JSON.parse(unescapeMysql(l.replace(/\r$/, ''))));
}
function execSql(sql) {
  if (DRY) return;
  execFileSync('mysql', MYSQL_ARGS.slice(0, 4), { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}
function esc(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n'); }

/* ---------- GLM 客户端 ---------- */
async function glmChat(key, baseUrl, messages, maxRetry = 3) {
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'glm-5.2', messages, temperature: 0.2, max_tokens: 8000, thinking: { type: 'disabled' } }),
        signal: AbortSignal.timeout(180000),
      });
      if (res.status === 429 || res.status >= 500) {
        log(`  GLM ${res.status}, 退避重试 ${attempt}/${maxRetry}`);
        await new Promise(r => setTimeout(r, 4000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
      const j = await res.json();
      return j.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (attempt === maxRetry) throw e;
      log(`  GLM ERR ${e.message}, 重试 ${attempt}/${maxRetry}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
}
function parseJsonLoose(text) {
  let t = String(text).trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('['), e = t.lastIndexOf(']');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

async function main() {
  /* 0. 取 LLM 配置 */
  const cfg = queryRows("SELECT JSON_OBJECT('k',api_key,'u',base_url) FROM llm_provider_config WHERE provider='ZHIPU' AND enabled=1")[0];
  if (!cfg || !cfg.k) { log('未找到 ZHIPU key, 跳过 LLM 步骤'); }
  const key = cfg?.k, baseUrl = cfg?.u || 'https://open.bigmodel.cn/api/coding/paas/v4';

  /* 1. 共现边 */
  const qs = queryRows("SELECT JSON_OBJECT('p',paper_id,'k',kp_node_id) FROM questions WHERE paper_id IS NOT NULL AND kp_node_id IS NOT NULL");
  const paperKps = new Map();
  for (const q of qs) {
    if (!paperKps.has(q.p)) paperKps.set(q.p, new Set());
    paperKps.get(q.p).add(Number(q.k));
  }
  const pairWeight = new Map();
  for (const kps of paperKps.values()) {
    const arr = [...kps].sort((a, b) => a - b);
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        const key2 = arr[i] + ':' + arr[j];
        pairWeight.set(key2, (pairWeight.get(key2) || 0) + 1);
      }
  }
  const coEdges = [...pairWeight.entries()].filter(([, w]) => w >= 2).sort((a, b) => b[1] - a[1]).slice(0, 600);
  log(`共现边: ${coEdges.length} 条 (≥2 卷)`);
  if (coEdges.length && !DRY) {
    execSql('DELETE FROM kp_edges WHERE kind=\'co\';');
    for (let i = 0; i < coEdges.length; i += 200) {
      const chunk = coEdges.slice(i, i + 200);
      execSql(`INSERT IGNORE INTO kp_edges (src_id, dst_id, kind, weight) VALUES ${chunk.map(([k, w]) => { const [a, b] = k.split(':'); return `(${a},${b},'co',${w})`; }).join(',')};`);
    }
  }

  /* 节点与分组 */
  const nodes = queryRows("SELECT JSON_OBJECT('id',id,'name',name,'parent_id',parent_id,'is_parent',CAST(is_parent AS UNSIGNED),'qc',question_count) FROM kp_nodes");
  const byId = new Map(nodes.map(n => [Number(n.id), n]));
  const roots = nodes.filter(n => n.is_parent).map(n => ({ id: Number(n.id), name: n.name }));
  const orphans = nodes.filter(n => !n.is_parent && n.parent_id == null);
  log(`节点: ${nodes.length}, 顶级分类: ${roots.length}, 孤儿考点: ${orphans.length}`);

  if (key) {
    /* 2. 孤儿归类 */
    if (orphans.length) {
      const rootList = roots.map(r => `${r.id}=${r.name}`).join('；');
      let done = 0;
      for (let i = 0; i < orphans.length; i += 15) {
        const chunk = orphans.slice(i, i + 15);
        const list = chunk.map(o => `${o.id}=${o.name}`).join('；');
        const prompt = `以下是软考(系统架构设计师/系统分析师)知识图谱中的顶级分类和一批未归类考点。\n请给每个考点分配最贴切的一个顶级分类 id。只输出 JSON 数组: [{"id":考点id,"root":分类id}], 不要输出其他内容。\n顶级分类: ${rootList}\n未归类考点: ${list}`;
        try {
          const out = await glmChat(key, baseUrl, [{ role: 'user', content: prompt }]);
          const pairs = parseJsonLoose(out);
          const updates = [];
          for (const p of pairs) {
            const kid = Number(p.id), rid = Number(p.root);
            if (byId.has(kid) && roots.some(r => r.id === rid)) updates.push([kid, rid]);
          }
          if (updates.length && !DRY) {
            execSql(`UPDATE kp_nodes SET parent_id=ELT(FIELD(id,${updates.map(u => u[0]).join(',')}),${updates.map(u => u[1]).join(',')}) WHERE id IN (${updates.map(u => u[0]).join(',')});`);
          }
          done += updates.length;
          log(`  归类 ${Math.min(i + 15, orphans.length)}/${orphans.length} (成功 ${done})`);
        } catch (e) { log(`  归类批次失败: ${e.message}`); }
        await new Promise(r => setTimeout(r, 600));
      }
    }

    /* 3. 组内语义边 */
    const groups = new Map();
    for (const n of nodes) {
      if (n.is_parent || n.parent_id == null) continue;
      const pid = Number(n.parent_id);
      if (!groups.has(pid)) groups.set(pid, []);
      groups.get(pid).push({ id: Number(n.id), name: n.name });
    }
    if (!DRY) execSql('DELETE FROM kp_edges WHERE kind=\'semantic\';');
    let semCount = 0;
    for (const [rootId, members] of groups) {
      if (members.length < 4) continue;
      const rootName = byId.get(rootId)?.name || '';
      const list = members.map(m => `${m.id}=${m.name}`).join('；');
      const prompt = `以下是软考「${rootName}」分类下的考点。请挑出学习上强相关的考点对(易混淆、常对比出题、一个知识的子概念等), 最多 12 对, 按相关度降序。只输出 JSON 数组: [{"a":考点id,"b":考点id,"w":1到3,"why":"一句话理由"}], 不要输出其他内容。\n考点: ${list}`;
      try {
        const out = await glmChat(key, baseUrl, [{ role: 'user', content: prompt }]);
        const pairs = parseJsonLoose(out);
        const rows = [];
        for (const p of pairs) {
          const a = Number(p.a), b = Number(p.b);
          if (a === b || !byId.has(a) || !byId.has(b)) continue;
          const [s, d] = a < b ? [a, b] : [b, a];
          const w = Math.max(1, Math.min(3, Number(p.w) || 1));
          rows.push(`(${s},${d},'semantic',${w},'${esc(String(p.why || '').slice(0, 100))}')`);
        }
        if (rows.length && !DRY) execSql(`INSERT IGNORE INTO kp_edges (src_id, dst_id, kind, weight, note) VALUES ${rows.join(',')};`);
        semCount += rows.length;
        log(`  「${rootName}」语义边 ${rows.length} 对`);
      } catch (e) { log(`  「${rootName}」失败: ${e.message}`); }
      await new Promise(r => setTimeout(r, 600));
    }
    log(`语义边合计: ${semCount}`);
  }

  log('DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
