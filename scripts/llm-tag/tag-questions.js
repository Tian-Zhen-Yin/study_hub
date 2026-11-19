// 步骤1: 批量质量分级 — 调用 glm-5.3-flash 给每题打 考点/题型/质量分
// 输入: questions.jsonl  输出: tags.jsonl (断点续跑, 每批落盘)
const fs = require('fs');
const path = require('path');
const key = fs.readFileSync(path.join(__dirname, '.key'), 'utf8').trim();

const MODEL = 'glm-5.3-flash';
const BATCH = 8;
const CONCURRENCY = 5;
const OUT = path.join(__dirname, 'tags.jsonl');

// 输入: questions.b64 (base64 编码的 JSONL, 规避 mysql 批处理输出转义问题)
const questions = fs.readFileSync(path.join(__dirname, 'questions.b64'), 'utf8')
  .split('\n').filter(Boolean)
  .map(l => JSON.parse(Buffer.from(l, 'base64').toString('utf8')));

// 断点续跑: 已完成的 id 跳过
const done = new Set();
if (fs.existsSync(OUT)) {
  fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).forEach(l => {
    try { done.add(JSON.parse(l).id); } catch {}
  });
}
const todo = questions.filter(q => !done.has(q.id));
console.log(`total=${questions.length} done=${done.size} todo=${todo.length}`);

const SYS = `你是软考《系统架构设计师》题库的质量标注专家。对每道题输出标签,严格返回JSON数组,不要任何其他文字:
[{"id":题号,"kp":"考点名","qt":"题型代码","score":1到5,"note":"≤15字评语"}]

规则:
- kp: 该题考察的具体知识点,≤10个汉字,用学科标准术语(如"页面置换算法""架构风格对比""三模冗余"),不要写领域名
- qt 只能是: CONCEPT(概念辨析/定义理解) SCENARIO(场景应用/方案选择) CALC(计算题) RECALL(纯记忆:年份/数字/纯背诵,无理解成分) CASE(案例分析题) ESSAY(论文题); type字段为CASE/ESSAY的直接标对应代码
- score 质量分: 5=题干清晰+干扰项有效+考察理解与迁移,能举一反三; 4=良好; 3=常规可用; 2=题干含糊/解析缺失导致教学价值低; 1=题干或答案有明显问题,无训练价值
- note 一句话点出质量问题或价值点`;

function buildPrompt(batch) {
  const items = batch.map(q => ({
    id: q.id, domain: q.domain, type: q.type,
    stem: q.stem, options: q.options, answer: q.answer,
    analysis: q.analysis, analysisLen: q.analysisLen
  }));
  return '请标注以下' + batch.length + '道题:\n' + JSON.stringify(items, null, 0);
}

function parseContent(text) {
  let t = text.trim();
  const m = t.match(/\[[\s\S]*\]/);
  if (m) t = m[0];
  return JSON.parse(t);
}

let fail = 0;
async function callLlm(batch, attempt) {
  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: buildPrompt(batch) }],
        temperature: 0.1
        // glm-5.3-flash 强制思考,不能传 thinking 参数(默认档位即可)
      }),
      signal: AbortSignal.timeout(180000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty content: ' + JSON.stringify(j).slice(0, 200));
    const arr = parseContent(content);
    if (!Array.isArray(arr)) throw new Error('not array');
    return arr;
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
      return callLlm(batch, attempt + 1);
    }
    fail++;
    console.error('BATCH FAIL ids=' + batch.map(q => q.id).join(','), e.message);
    return null;
  }
}

async function worker(queue, out) {
  while (queue.length) {
    const batch = queue.shift();
    if (!batch) break;
    const arr = await callLlm(batch, 0);
    if (arr) {
      const valid = batch.map(q => {
        const t = arr.find(x => x.id === q.id);
        if (!t || !t.kp) return null;
        const qt = ['CONCEPT', 'SCENARIO', 'CALC', 'RECALL', 'CASE', 'ESSAY'].includes(t.qt) ? t.qt : 'CONCEPT';
        return { id: q.id, kp: String(t.kp).slice(0, 30), qt, score: Math.max(1, Math.min(5, parseInt(t.score) || 3)), note: String(t.note || '').slice(0, 40) };
      }).filter(Boolean);
      valid.forEach(v => out.write(JSON.stringify(v) + '\n'));
      valid.forEach(v => done.add(v.id));
      process.stdout.write(`\rprogress: done=${done.size}/${questions.length} fail=${fail}   `);
    }
  }
}

(async () => {
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  const out = fs.createWriteStream(OUT, { flags: 'a' });
  // 共享同一队列数组,shift() 在单线程事件循环中安全
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(batches, out)));
  out.end();
  console.log(`\nFINISHED. done=${done.size} fail=${fail}`);
})();
