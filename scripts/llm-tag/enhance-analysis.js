// 步骤3: 批量补强薄弱解析 — glm-5.3-flash 生成教学级解析
// 输入: weak-questions.b64  输出: enhanced.jsonl (断点续跑)
const fs = require('fs');
const path = require('path');
const key = fs.readFileSync(path.join(__dirname, '.key'), 'utf8').trim();

const BATCH = 4;
const CONCURRENCY = 4;
const OUT = path.join(__dirname, 'enhanced.jsonl');

const questions = fs.readFileSync(path.join(__dirname, 'weak-questions.b64'), 'utf8')
  .split('\n').filter(Boolean)
  .map(l => JSON.parse(Buffer.from(l, 'base64').toString('utf8')));

const done = new Set();
if (fs.existsSync(OUT)) {
  fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).forEach(l => {
    try { done.add(JSON.parse(l).id); } catch {}
  });
}
const todo = questions.filter(q => !done.has(q.id));
console.log(`total=${questions.length} done=${done.size} todo=${todo.length}`);

const SYS = `你是软考《系统架构设计师》的资深讲师。为每道题生成教学级解析,目标是让考生举一反三。
严格返回JSON数组,不要任何其他文字:
[{"id":题号,"analysis":"解析正文"}]

解析要求(使用Markdown,**加粗**关键词):
1. **考点定位**: 一句话点明本题考察的知识点及其在知识体系中的位置
2. **正确项论证**: 说清正确答案为什么对,给出可迁移的判断依据(而非死记)
3. **干扰项辨析**: 逐项指出每个错误选项错在哪、对应什么常见误区
4. **易混淆对比**: 一行辨析最相关的易混概念(如"区分A与B:…")
总长度控制在200~400字。若题干信息不足以判断,基于最标准的学科知识作答,不要臆造。`;

let fail = 0;
async function callLlm(batch, attempt) {
  try {
    const items = batch.map(q => ({
      id: q.id, 领域: q.domain, 年份: q.year, 题干: q.stem, 选项: q.options, 正确答案: q.answer
    }));
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.3-flash',
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: '请为以下' + batch.length + '道题生成解析:\n' + JSON.stringify(items) }],
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(300000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 150));
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty content');
    const m = content.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(m ? m[0] : content);
    if (!Array.isArray(arr)) throw new Error('not array');
    return arr;
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 4000 * (attempt + 1)));
      return callLlm(batch, attempt + 1);
    }
    fail++;
    console.error('\nBATCH FAIL ids=' + batch.map(q => q.id).join(','), e.message.slice(0, 120));
    return null;
  }
}

async function worker(queue, out) {
  while (queue.length) {
    const batch = queue.shift();
    if (!batch) break;
    const arr = await callLlm(batch, 0);
    if (arr) {
      batch.forEach(q => {
        const a = arr.find(x => x.id === q.id);
        if (a && a.analysis && String(a.analysis).length > 50) {
          out.write(JSON.stringify({ id: q.id, analysis: String(a.analysis) }) + '\n');
          done.add(q.id);
        }
      });
      process.stdout.write(`\rprogress: done=${done.size}/${questions.length} fail=${fail}   `);
    }
  }
}

(async () => {
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  const out = fs.createWriteStream(OUT, { flags: 'a' });
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(batches, out)));
  out.end();
  console.log(`\nFINISHED. done=${done.size} fail=${fail}`);
})();
