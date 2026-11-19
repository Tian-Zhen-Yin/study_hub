// 爬取芝士架构(cheko.cc)历年真题预览页:
//   /preview/select?id=N 上午综合知识选择题 (1735)
//   /preview/case?id=N    案例分析大题 (157)
//   /preview/essay?id=N   论文题 (130)
// 数据源为页面内嵌 __NEXT_DATA__ JSON, 无需登录。可重复执行(断点续爬)。
// 产出: data/select.jsonl / case.jsonl / essay.jsonl / kp_map.json
// 用法: node crawl-cheko.js [select|case|essay|all]
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://www.cheko.cc';
const DELAY_MS = 420;      // 基础间隔(站点对连发限流,偏保守)
const JITTER = 380;        // 随机抖动
const MAX_RETRY = 4;
const COOLDOWN_MS = 60000; // 连续失败冷却

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let consecutiveFail = 0;

async function fetchText(url) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 200) { consecutiveFail = 0; return await res.text(); }
      if (res.status === 404) { consecutiveFail = 0; return null; } // 题目不存在,跳过
      console.warn(`[${new Date().toISOString()}] HTTP ${res.status} ${url}, retry ${attempt}/${MAX_RETRY}`);
      // 500 多为限流:指数退避,连续失败过半则长冷却
      if (attempt < MAX_RETRY) {
        const backoff = Math.min(3000 * Math.pow(2.5, attempt - 1), 20000);
        await sleep(backoff);
        if (consecutiveFail >= 6) { console.warn('  ...连续失败,冷却 60s'); await sleep(COOLDOWN_MS); }
      }
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] ERR ${e.message} ${url}, retry ${attempt}/${MAX_RETRY}`);
      if (attempt < MAX_RETRY) await sleep(2000 * attempt);
    }
  }
  consecutiveFail++;
  if (consecutiveFail >= 6) { console.warn('  ...连续失败,冷却 60s'); await sleep(COOLDOWN_MS); }
  return undefined; // 彻底失败
}

function parseNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  const j = JSON.parse(m[1]);
  return j.props && j.props.pageProps ? j.props.pageProps : null;
}

// 从 pageProps 中取出题目对象(select/case/essay 三种 key 之一)
function extractQuestion(pageProps) {
  for (const k of ['select', 'case', 'essay']) {
    if (pageProps[k] && pageProps[k].id != null) return { kind: k, q: pageProps[k] };
  }
  return null;
}

function loadDoneIds(file) {
  const done = new Set();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { done.add(JSON.parse(line).id); } catch { /* 忽略坏行 */ }
    }
  }
  return done;
}

async function sitemapUrls(kind) {
  const xml = await fetchText(`${BASE}/sitemap/${kind}.xml`);
  if (!xml) throw new Error('sitemap 拉取失败: ' + kind);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

async function crawlKind(kind) {
  const outFile = path.join(DATA_DIR, `${kind}.jsonl`);
  const done = loadDoneIds(outFile);
  const urls = await sitemapUrls(kind);
  const pending = urls.filter(u => {
    const id = Number(new URL(u).searchParams.get('id'));
    return !done.has(id);
  });
  console.log(`[${kind}] 共 ${urls.length} 个, 已完成 ${done.size}, 待爬 ${pending.length}`);
  if (!pending.length) return 0;

  let ok = 0, miss = 0, fail = 0;
  const kpMap = {};
  const kpFile = path.join(DATA_DIR, `kp_map_${kind}.json`);
  if (fs.existsSync(kpFile)) Object.assign(kpMap, JSON.parse(fs.readFileSync(kpFile, 'utf8')));

  const stream = fs.createWriteStream(outFile, { flags: 'a' });
  for (let i = 0; i < pending.length; i++) {
    const url = pending[i];
    const id = Number(new URL(url).searchParams.get('id'));
    const html = await fetchText(url);
    if (html === undefined) { fail++; continue; }
    if (html === null) { miss++; continue; }
    const pageProps = parseNextData(html);
    const hit = pageProps && extractQuestion(pageProps);
    if (!hit) { fail++; console.warn(`  ! id=${id} 无题目数据`); continue; }

    const rec = hit.q;
    // 采集考点层级 (select 有 parentKp, case/essay 部分有)
    for (const [nodeId, name, parentId, parentName] of [
      [rec.kpId, rec.kpName, rec.parentKpId, rec.parentKpName],
    ]) {
      if (nodeId != null && name) kpMap[String(nodeId)] = { id: nodeId, name, parentId: parentId ?? null, parentName: parentName ?? null };
      if (parentId != null && parentName) kpMap['p' + parentId] = { id: parentId, name: parentName, parentId: null, parentName: null, isParent: true };
    }
    stream.write(JSON.stringify(rec) + '\n');
    ok++;
    if (ok % 25 === 0) {
      fs.writeFileSync(kpFile, JSON.stringify(kpMap, null, 0));
      console.log(`[${kind}] ${ok}/${pending.length} (miss=${miss} fail=${fail})`);
    }
    await sleep(DELAY_MS + Math.random() * JITTER);
  }
  stream.end();
  fs.writeFileSync(kpFile, JSON.stringify(kpMap, null, 0));
  console.log(`[${kind}] DONE ok=${ok} miss(404)=${miss} fail=${fail}`);
  return ok;
}

(async () => {
  const kinds = process.argv[2] && process.argv[2] !== 'all'
    ? [process.argv[2]]
    : ['case', 'essay', 'select']; // 小数据集先行,便于尽早开发导入
  for (const k of kinds) {
    try { await crawlKind(k); } catch (e) { console.error(`[${k}] FATAL`, e.message); }
  }
  console.log('ALL DONE');
})();
