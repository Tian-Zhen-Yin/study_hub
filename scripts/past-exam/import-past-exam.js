// 将爬取的芝士架构真题导入 study_hub:
//   1. exam_papers 建档 (按 paper.name 幂等)
//   2. kp_nodes 知识图谱节点落库 (cheko kpId 层级)
//   3. case/essay 真题全量入库 (小问进 options_json, 格式与 Simulation 案例科一致)
//   4. select 题与存量 MCQ 按归一化词面匹配: 命中→回填年份/试卷/考点/解析; 未命中→新增
//   5. question_quality 考点名精确匹配 → 补 questions.kp_node_id
//   6. 统计 kp_nodes.question_count / freq / essence
// 真题图片下载到 data/uploads/ 并改写为本地 /uploads/ 路径。
// 用法:
//   node import-past-exam.js --dry-run   匹配效果试算,不写库
//   node import-past-exam.js             正式导入(可重复执行)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');

const DATA = path.join(__dirname, 'data');
const UPLOADS = path.resolve(__dirname, '../../data/uploads');
const DRY = process.argv.includes('--dry-run');
const MYSQL = ['mysql', '-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'];

const log = (...a) => console.log(...a);

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
function runSqlFile(sql) {
  if (DRY) return;
  const tmp = path.join(__dirname, 'import-tmp.sql');
  fs.writeFileSync(tmp, 'SET NAMES utf8mb4;\n' + sql);
  execSync(MYSQL.join(' ') + ' < "' + tmp + '"', { stdio: 'pipe', shell: 'cmd.exe' });
}
// mysql -N -B 输出按行 TSV,值内特殊字符已转义;这里用 JSON_OBJECT 每行一个 JSON 再反转义解析
function unescapeMysql(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const c = s[i + 1];
      if (c === 'n') { out += '\n'; i += 2; continue; }
      if (c === 't') { out += '\t'; i += 2; continue; }
      if (c === 'r') { out += '\r'; i += 2; continue; }
      if (c === '0') { i += 2; continue; }
      if (c === 'Z') { out += '\x1a'; i += 2; continue; }
      if (c === '\\') { out += '\\'; i += 2; continue; }
      if (c === "'") { out += "'"; i += 2; continue; }
      if (c === '"') { out += '"'; i += 2; continue; }
    }
    out += s[i]; i++;
  }
  return out;
}
function queryRows(sql) {
  const out = execFileSync('mysql', MYSQL.slice(1).concat(['-N', '-B']), { input: 'SET NAMES utf8mb4;\n' + sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, shell: false });
  return out.split('\n').filter(Boolean).map(line => JSON.parse(unescapeMysql(line.replace(/\r$/, ''))));
}

function normalizeStem(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片标记
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ''); // 去空白/标点/括号占位
}
function bigrams(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  if (s.length === 1) set.add(s);
  return set;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/* ---------- 图片本地化 ---------- */
const imgCache = new Map(); // url -> 本地路径
async function localizeImages(md) {
  if (!md) return { text: md, images: [] };
  const urls = [...String(md).matchAll(/!\[[^\]]*\]\((https:\/\/oss\.cheko\.cc[^)\s]+)\)/g)].map(m => m[1]);
  const images = [];
  let text = String(md);
  let n = 0;
  for (const url of [...new Set(urls)]) {
    let local = imgCache.get(url);
    if (!local) {
      const ext = (url.match(/\.(jpe?g|png|gif|webp|svg|bmp)$/i) || [null, 'jpg'])[1];
      const name = 'cheko_' + crypto.createHash('md5').update(url).digest('hex').slice(0, 16) + '.' + ext;
      const dest = path.join(UPLOADS, name);
      if (!fs.existsSync(dest)) {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) { log('  ! 图片下载失败', res.status, url); continue; }
        fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      }
      local = '/uploads/' + name;
      imgCache.set(url, local);
    }
    n++;
    text = text.split(url).join(local);
    images.push(local);
  }
  // 题干正文中图片标记替换为占位符(quiz 渲染不支持内嵌图,首图另存 imageUrl)
  text = text.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_, u) => `【图: ${u}】`);
  return { text, images };
}

/* ---------- 读取爬取数据 ---------- */
function readJsonl(name) {
  const f = path.join(DATA, name);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

async function main() {
  const cases = readJsonl('case.jsonl');
  const essays = readJsonl('essay.jsonl');
  const selects = readJsonl('select.jsonl');
  log(`数据量: case=${cases.length} essay=${essays.length} select=${selects.length}`);
  if (!cases.length && !essays.length && !selects.length) { log('无数据,先运行 crawl-cheko.js'); return; }

  /* 1. 试卷建档 */
  const papers = new Map(); // name -> {id, subject, examDate}
  for (const r of [...cases, ...essays, ...selects]) {
    const p = r.paper;
    if (p && p.name && !papers.has(p.name)) {
      papers.set(p.name, {
        subject: p.subject === 1 ? '系统分析师' : '架构设计师',
        examDate: p.createDate || (p.name.match(/(\d{4})年(\d{1,2})月/) ? `${p.name.match(/(\d{4})年(\d{1,2})月/)[1]}-${String(p.name.match(/(\d{4})年(\d{1,2})月/)[2]).padStart(2, '0')}` : null),
      });
    }
  }
  const toInsert = [...papers.entries()];
  if (!DRY) {
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      runSqlFile(`INSERT IGNORE INTO exam_papers (name, subject, exam_date, source) VALUES ${chunk.map(([n, p]) => `('${esc(n)}','${p.subject}','${esc(p.examDate)}','CHEKO')`).join(',')};`);
    }
    for (const e of queryRows("SELECT JSON_OBJECT('id',id,'name',name) FROM exam_papers")) {
      const p = papers.get(e.name);
      if (p) papers.set(e.name, { ...p, id: e.id });
    }
    log(`试卷: 共 ${papers.size} 份`);
  } else {
    log(`[dry] 试卷: ${papers.size} 份`);
  }

  /* 2. 考点节点 */
  const kpMap = {};
  for (const f of ['kp_map_case.json', 'kp_map_essay.json', 'kp_map_select.json']) {
    const fp = path.join(DATA, f);
    if (fs.existsSync(fp)) Object.assign(kpMap, JSON.parse(fs.readFileSync(fp, 'utf8')));
  }
  const kpNodes = Object.values(kpMap); // {id, name, parentId, parentName, isParent?}
  if (!DRY) {
    for (let i = 0; i < kpNodes.length; i += 200) {
      const chunk = kpNodes.slice(i, i + 200);
      runSqlFile(`INSERT INTO kp_nodes (id, name, parent_id, is_parent, freq, essence, question_count) VALUES ${chunk.map(k =>
        `(${Number(k.id)},'${esc(k.name)}',${k.parentId == null ? 'NULL' : Number(k.parentId)},${k.isParent ? 1 : 0},'未标注',NULL,0)`
      ).join(',')} ON DUPLICATE KEY UPDATE name=VALUES(name), parent_id=VALUES(parent_id), is_parent=VALUES(is_parent);`);
    }
    log(`考点节点: ${kpNodes.length} 个`);
  } else {
    log(`[dry] 考点节点: ${kpNodes.length} 个`);
  }

  /* 3. 已导入 external_key (幂等) */
  const doneKeys = new Set();
  if (!DRY) for (const r of queryRows("SELECT JSON_OBJECT('k',external_key) FROM questions WHERE external_key IS NOT NULL")) doneKeys.add(r.k);
  const seenKeys = new Set();

  /* 4. case / essay 入库 */
  let caseNew = 0, essayNew = 0, caseSkip = 0, essaySkip = 0;
  const kpFreq = {}, kpEssence = {}; // 统计用
  function noteKp(kpId, freq, essence) {
    if (kpId == null) return;
    if (freq) kpFreq[kpId] = (kpFreq[kpId] || {}); if (freq) kpFreq[kpId][freq] = (kpFreq[kpId][freq] || 0) + 1;
    if (essence && essence.length > (kpEssence[kpId]?.length || 0)) kpEssence[kpId] = essence;
  }

  const caseRows = [];
  for (const r of cases) {
    const key = `cheko:case:${r.id}`;
    if (doneKeys.has(key) || seenKeys.has(key)) { caseSkip++; continue; }
    seenKeys.add(key);
    const stemMd = await localizeImages(r.promptMd || r.prompt || '');
    const subsRaw = (r.subQuestions && r.subQuestions.length) ? r.subQuestions : (r.subQuestionsMd || []);
    const subs = [];
    for (let i = 0; i < subsRaw.length; i++) {
      const s = subsRaw[i];
      const qMd = await localizeImages(s.question || '');
      const scoreM = String(s.question || '').match(/[（(]\s*(\d+)\s*分\s*[)）]/);
      subs.push({
        no: i + 1,
        q: qMd.text.replace(/[（(]\s*\d+\s*分\s*[)）]\s*/, ''),
        score: s.score != null ? Number(s.score) : (scoreM ? Number(scoreM[1]) : null),
        answer: (s.correctAnswer || '').replace(/<[^>]+>/g, '').trim(),
        analysis: (s.analysis || '').replace(/<[^>]+>/g, '').trim(),
        image: qMd.images[0] || null,
      });
    }
    const stem = stemMd.text.replace(/<[^>]+>/g, '').trim();
    const answer = subs.map(s => `问题${s.no}${s.score ? `（${s.score}分）` : ''}：${s.answer}`).join('\n\n');
    const analysis = subs.map(s => s.analysis).filter(Boolean).join('\n\n');
    caseRows.push({
      key, paperName: r.paper?.name, sort: r.sort, kpId: r.kpId,
      subject: '案例分析', type: 'CASE', stem,
      imageUrl: stemMd.images[0] || null,
      optionsJson: JSON.stringify(subs), answer, analysis,
      examYear: r.paper?.createDate || null, freq: r.studyFrequencyLevel,
    });
    noteKp(r.kpId, r.studyFrequencyLevel, null);
  }

  const essayRows = [];
  for (const r of essays) {
    const key = `cheko:essay:${r.id}`;
    if (doneKeys.has(key) || seenKeys.has(key)) { essaySkip++; continue; }
    seenKeys.add(key);
    const stemMd = await localizeImages(r.promptMd || r.prompt || '');
    const strategy = (r.strategyMd || r.strategy || '').replace(/<[^>]+>/g, '').trim();
    let modelText = '';
    if (Array.isArray(r.models)) {
      modelText = r.models.map(m => {
        if (typeof m === 'string') return m;
        return m.contentMd || m.content || m.md || m.text || (typeof m.content === 'object' ? (m.content.md || m.content.html || '') : '') || '';
      }).filter(Boolean).map(s => String(s).replace(/<[^>]+>/g, '').trim()).join('\n\n');
    }
    essayRows.push({
      key, paperName: r.paper?.name, sort: r.sort, kpId: r.kpId,
      subject: '论文', type: 'ESSAY',
      stem: stemMd.text.replace(/<[^>]+>/g, '').trim(),
      imageUrl: stemMd.images[0] || null,
      optionsJson: null,
      answer: strategy + (modelText ? `\n\n【范文】\n${modelText}` : ''),
      analysis: null,
      examYear: r.paper?.createDate || null, freq: r.studyFrequencyLevel,
    });
    noteKp(r.kpId, r.studyFrequencyLevel, null);
  }
  log(`case 待导入 ${caseRows.length} (已存在跳过 ${caseSkip}); essay 待导入 ${essayRows.length} (跳过 ${essaySkip})`);

  /* 5. select 匹配存量 MCQ */
  const existing = queryRows(
    "SELECT JSON_OBJECT('id',id,'stem',IFNULL(stem,''),'analysis',IFNULL(analysis,''),'exam_year',exam_year,'options',IFNULL(options_json,'')) FROM questions " +
    "WHERE (question_type='MCQ' OR question_type='') AND source NOT IN ('OUTDATED','MOCK')");
  log(`存量 MCQ: ${existing.length}`);
  const exIndex = existing.map(e => ({ ...e, norm: normalizeStem(e.stem), bg: null }));
  for (const e of exIndex) e.bg = e.norm ? bigrams(e.norm) : new Set();

  // 选项集相似度:同题的选项文本应高度一致(用于边界带二次确认)
  function optsSimilar(chekoOpts, ourOptsJson) {
    if (!chekoOpts || chekoOpts.length < 3 || !ourOptsJson) return false;
    let ours;
    try { ours = JSON.parse(ourOptsJson); } catch { return false; }
    if (!Array.isArray(ours) || ours.length < 3) return false;
    const ourBgs = ours.map(o => bigrams(normalizeStem(o)));
    let hits = 0;
    for (const o of chekoOpts) {
      const bg = bigrams(normalizeStem(o));
      let best = 0;
      for (const ob of ourBgs) best = Math.max(best, jaccard(bg, ob));
      if (best >= 0.8) hits++;
    }
    return hits >= Math.max(2, Math.ceil(chekoOpts.length * 0.6));
  }

  let selMatch = 0, selNew = 0, selAmbig = 0, selOptBoost = 0;
  const TH = 0.75;
  const selectUpdates = [], selectInserts = [];
  for (const r of selects) {
    const key = `cheko:select:${r.id}`;
    if (!DRY && doneKeys.has(key)) continue;
    const norm = normalizeStem(r.promptMd || r.prompt || '');
    const bg = bigrams(norm);
    const chekoOpts = (r.subQuestionsMd?.[0]?.options || []).map(o => o.text);
    let best = null, second = 0;
    for (const e of exIndex) {
      if (!e.norm) continue;
      const lenRatio = Math.min(norm.length, e.norm.length) / Math.max(norm.length, e.norm.length, 1);
      if (lenRatio < 0.6) continue;
      const j = jaccard(bg, e.bg);
      if (j > (best?.j ?? 0)) { second = best?.j ?? 0; best = { e, j }; }
      else if (j > second) second = j;
    }
    if (best && best.j >= TH && best.j - second < 0.05) { selAmbig++; continue; } // 前二接近,不可靠
    const ok = best && (best.j >= TH || (best.j >= 0.55 && best.j - second >= 0.05 && optsSimilar(chekoOpts, best.e.options)));
    if (ok) {
      selMatch++;
      if (best.j < TH) selOptBoost++;
      selectUpdates.push(`UPDATE questions SET external_key='${key}', paper_id=${papers.get(r.paper?.name)?.id ?? 'NULL'}, exam_sort=${r.sort ?? 'NULL'}, kp_node_id=${r.kpId ?? 'NULL'}, exam_year=IFNULL(exam_year,'${esc(r.paper?.createDate)}'), analysis=IF(analysis IS NULL OR analysis='' ,'${esc(r.subQuestionsMd?.[0]?.analysis || '')}',analysis) WHERE id=${best.e.id};`);
      noteKp(r.kpId, r.studyFrequencyLevel, r.essence);
    } else {
      selNew++;
      const opts = (r.subQuestionsMd?.[0]?.options || []).map(o => o.text);
      const idx = (r.subQuestionsMd?.[0]?.options || []).findIndex(o => o.isCorrect);
      const letters = 'ABCDEFGH';
      const stemMd = await localizeImages(r.promptMd || r.prompt || '');
      selectInserts.push({
        key, paperName: r.paper?.name, sort: r.sort, kpId: r.kpId,
        subject: '综合知识', type: 'MCQ',
        stem: stemMd.text, imageUrl: stemMd.images[0] || null,
        optionsJson: JSON.stringify(opts),
        answer: idx >= 0 ? letters[idx] : '',
        analysis: r.subQuestionsMd?.[0]?.analysis || '',
        examYear: r.paper?.createDate || null,
      });
      noteKp(r.kpId, r.studyFrequencyLevel, r.essence);
    }
    if ((selMatch + selNew + selAmbig) % 200 === 0) log(`  select 进度 ${selMatch + selNew + selAmbig} 匹配=${selMatch} 新增=${selNew} 歧义跳过=${selAmbig}`);
  }
  log(`select: 匹配存量 ${selMatch} (其中选项校验 ${selOptBoost}), 新增 ${selNew}, 歧义跳过 ${selAmbig}`);

  if (DRY) {
    log('[dry-run] 未写库。抽样匹配示例:');
    log(`  试卷 ${papers.size} 份, 考点节点 ${kpNodes.length} 个, case ${caseRows.length}, essay ${essayRows.length}`);
    return;
  }

  /* 6. 落库: case/essay/select */
  function insertQuestions(rows, label) {
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const values = chunk.map(q => {
        const pid = papers.get(q.paperName)?.id ?? null;
        return `('CHEKO','${q.subject}','${q.type}',NULL,'${esc(q.stem)}',${q.optionsJson ? `'${esc(q.optionsJson)}'` : 'NULL'},'${esc(q.answer)}',${q.analysis ? `'${esc(q.analysis)}'` : 'NULL'},'${esc(q.examYear)}','${esc(q.paperName || '')}',${q.imageUrl ? `'${esc(q.imageUrl)}'` : 'NULL'},${pid ?? 'NULL'},${q.sort ?? 'NULL'},'${q.key}',${q.kpId ?? 'NULL'})`;
      }).join(',');
      runSqlFile(`INSERT INTO questions (source, subject, question_type, domain_id, stem, options_json, answer, analysis, exam_year, source_file, image_url, paper_id, exam_sort, external_key, kp_node_id) VALUES ${values};`);
    }
    log(`${label} 入库完成: ${rows.length}`);
  }
  insertQuestions(caseRows, 'case');
  insertQuestions(essayRows, 'essay');
  insertQuestions(selectInserts, 'select新增');
  for (let i = 0; i < selectUpdates.length; i += 200) {
    runSqlFile(selectUpdates.slice(i, i + 200).join('\n'));
  }
  log(`select 回填更新完成: ${selectUpdates.length}`);

  /* 7. question_quality 考点名匹配 → kp_node_id */
  const nameToId = new Map(kpNodes.map(k => [k.name, Number(k.id)]));
  const qk = queryRows("SELECT JSON_OBJECT('qid',question_id,'kp',knowledge_point) FROM question_quality");
  const qkUpdate = new Map(); // qid -> kpId
  for (const r of qk) {
    const id = nameToId.get(r.kp);
    if (id && !qkUpdate.has(r.qid)) qkUpdate.set(r.qid, id);
  }
  if (qkUpdate.size) {
    const arr = [...qkUpdate.entries()];
    for (let i = 0; i < arr.length; i += 300) {
      const chunk = arr.slice(i, i + 300);
      runSqlFile(`UPDATE questions SET kp_node_id=ELT(FIELD(id,${chunk.map(([qid]) => qid).join(',')}),${chunk.map(([, id]) => id).join(',')}) WHERE kp_node_id IS NULL AND id IN (${chunk.map(([qid]) => qid).join(',')});`);
    }
  }
  log(`question_quality 考点名映射: ${qkUpdate.size} 题`);

  /* 8. kp_nodes 统计回填 */
  const counts = queryRows("SELECT JSON_OBJECT('kp',kp_node_id,'c',COUNT(*)) FROM questions WHERE kp_node_id IS NOT NULL GROUP BY kp_node_id");
  const countMap = new Map(counts.map(r => [Number(r.kp), Number(r.c)]));
  const all = queryRows("SELECT JSON_OBJECT('id',id) FROM kp_nodes");
  const upd = [];
  for (const r of all) {
    const id = Number(r.id);
    const c = countMap.get(id) || 0;
    const freqs = kpFreq[id] || {};
    const mode = Object.entries(freqs).sort((a, b) => b[1] - a[1])[0]?.[0] || '未标注';
    const essence = kpEssence[id] || null;
    upd.push(`UPDATE kp_nodes SET question_count=${c}, freq='${mode}', essence=${essence ? `'${esc(essence)}'` : 'NULL'} WHERE id=${id};`);
  }
  for (let i = 0; i < upd.length; i += 200) runSqlFile(upd.slice(i, i + 200).join('\n'));
  log('kp_nodes 统计回填完成');
  log('ALL DONE');
}

main().catch(e => { console.error(e); process.exit(1); });
