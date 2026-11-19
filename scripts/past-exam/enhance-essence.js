// 考点精讲重点化改写: 纯文本 → 结构化 Markdown(加粗关键术语/分条/高频易错标记/对比表格)
// 批 3 个考点/次(防截断), 结果存 essence-md.jsonl 断点续跑, 全量完成后统一回写 kp_nodes。
// 原文备份: essence-original.jsonl
// 用法: node enhance-essence.js                    # 全量(自动跳过已完成)
//       node enhance-essence.js --sample           # 只跑 1 批试效果, 不回写
//       node enhance-essence.js --shard N/M        # 分片并发: 只处理 i%M==N 的考点
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(DATA, 'essence-md.jsonl');
const SAMPLE = process.argv.includes('--sample');
const shardArg = (process.argv.find(a => a.startsWith('--shard=')) || '').slice(8);
const SHARD = shardArg ? shardArg.split('/').map(Number) : null; // [N, M]

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
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

function parseJsonLoose(text) {
  let t = String(text).trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const s = t.indexOf('['), e = t.lastIndexOf(']');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

async function glmChat(key, baseUrl, content, maxRetry = 3) {
  for (let a = 1; a <= maxRetry; a++) {
    try {
      const res = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'glm-5.2', messages: [{ role: 'user', content }], temperature: 0.3, max_tokens: 8000 }),
        signal: AbortSignal.timeout(180000),
      });
      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 4000 * a)); continue; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      return j.choices?.[0]?.message?.content || '';
    } catch (e) {
      if (a === maxRetry) throw e;
      await new Promise(r => setTimeout(r, 3000 * a));
    }
  }
  return '';
}

const RULES = `你是软考(系统架构设计师/系统分析师)备考专家。把给定考点的精讲文本改写为"突出重点"的 Markdown:
1. 关键术语、核心结论、重要数字/公式用 **加粗**
2. 内容按逻辑分条, 用 "- " 无序列表; 有明确对比关系的内容改成 Markdown 表格
3. 特别重要、常考、易错的条目在行首加标记词: 【高频】【易错】【易混淆】【记忆】, 只在真正关键处用, 每篇 2~5 个为宜
4. 不得丢失原有信息要点, 不得编造原文没有的内容
5. 直接输出改写结果, 不要额外解释`;

(async () => {
  const cfg = queryRows("SELECT JSON_OBJECT('k',api_key,'u',base_url) FROM llm_provider_config WHERE provider='ZHIPU' AND enabled=1")[0];
  if (!cfg || !cfg.k) { console.log('无 ZHIPU key'); process.exit(1); }
  const kps = queryRows("SELECT JSON_OBJECT('id',id,'name',name,'e',essence) FROM kp_nodes WHERE essence IS NOT NULL AND essence != '' AND is_parent=0 ORDER BY question_count DESC");
  let pool = kps;
  if (SHARD) {
    const [n, m] = SHARD;
    pool = kps.filter((k, i) => i % m === n);
    console.log(`分片 ${n}/${m}: ${pool.length} 个考点`);
  }
  const done = new Set();
  if (fs.existsSync(OUT)) fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).forEach(l => { try { done.add(JSON.parse(l).id); } catch {} });
  // 分片模式: 启动即备份本分片原文(此时尚无任何回写, 原文可靠)
  if (!SAMPLE && SHARD) {
    fs.writeFileSync(path.join(DATA, `essence-original-${SHARD[0]}.jsonl`), pool.map(k => JSON.stringify({ id: k.id, e: k.e })).join('\n') + '\n');
  }
  const todo = pool.filter(k => !done.has(k.id));
  console.log(`精讲考点(本分片) ${pool.length}, 已完成 ${pool.length - todo.length}, 待处理 ${todo.length}`);
  if (!todo.length) { console.log('全部完成'); return; }

  const BATCH = 3;
  const batches = SAMPLE ? [todo.slice(0, BATCH)] : [];
  if (!SAMPLE) for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));

  let ok = 0, fail = 0;
  const stream = fs.createWriteStream(OUT, { flags: 'a' });
  for (let bi = 0; bi < batches.length; bi++) {
    const chunk = batches[bi];
    const prompt = RULES + '\n\n' + chunk.map(k => `【考点 ${k.id}】${k.name}\n<精讲>\n${k.e}\n</精讲>`).join('\n\n') +
      `\n\n输出 JSON 数组(元素个数=${chunk.length}): [{"id":考点id,"md":"改写后的Markdown"}]`;
    try {
      const out = await glmChat(cfg.k, cfg.u, prompt);
      const pairs = parseJsonLoose(out);
      let batchOk = 0;
      for (const p of pairs) {
        const k = chunk.find(c => Number(c.id) === Number(p.id));
        if (!k || !p.md) continue;
        const md = String(p.md).trim();
        if (md.length < k.e.length * 0.55) { console.log(`  ! id=${p.id} 长度不足(${md.length}/${k.e.length}), 弃用`); continue; }
        stream.write(JSON.stringify({ id: Number(p.id), name: k.name, md }) + '\n');
        batchOk++; ok++;
      }
      console.log(`[${bi + 1}/${batches.length}] 本批 ${batchOk}/${chunk.length} (累计 ok=${ok} fail=${fail})`);
      if (SAMPLE && batchOk) {
        const first = pairs.find(p => p.md);
        console.log('\n===== 试样 =====\n考点:', chunk[0].name, '\n原文前200:', chunk[0].e.slice(0, 200), '\n--- 改写后 ---\n', String(first.md).slice(0, 600));
      }
    } catch (e) { fail++; console.log(`[${bi + 1}/${batches.length}] 批次失败: ${e.message}`); }
    await new Promise(r => setTimeout(r, 500));
  }
  stream.end();
  console.log(`完成: ok=${ok} fail=${fail}`);

  // 回写(非 sample 模式)。分片时 OUT 含所有分片结果, 按id Map去重后幂等回写
  if (!SAMPLE && ok > 0) {
    const results = fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const byId = new Map(results.map(r => [r.id, r]));
    if (!SHARD) {
      const originals = [];
      for (const r of results) {
        const k = kps.find(x => x.id === r.id);
        if (k) originals.push({ id: r.id, e: k.e });
      }
      fs.writeFileSync(path.join(DATA, 'essence-original.jsonl'), originals.map(o => JSON.stringify(o)).join('\n'));
    }
    let n = 0;
    for (let i = 0; i < results.length; i += 50) {
      const c = results.slice(i, i + 50);
      const sql = c.map(r => `UPDATE kp_nodes SET essence='${esc(byId.get(r.id).md)}' WHERE id=${r.id};`).join('\n');
      execFileSync('mysql', ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'], { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
      n += c.length;
    }
    console.log(`已回写 ${n} 条精讲(累计全部结果)`);
  }
})().catch(e => { console.error(e); process.exit(1); });
