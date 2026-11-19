// 批量修复"双空真题拆分失败"坏题：按各拷贝保留的答案重写题干为干净单空题
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MYSQL = ['-uroot', '-proot', '--default-character-set=utf8mb4', 'study_hub'];
const key = fs.readFileSync(path.join(__dirname, '.fixkey'), 'utf8').trim();

// 1. 导出受影响题目 (base64 规避转义)
const b64 = execFileSync('mysql', [...MYSQL, '-N', '-e',
  "SELECT REPLACE(TO_BASE64(JSON_OBJECT('id', id, 'stem', stem, 'options', options_json, 'answer', answer)), CHAR(10), '') FROM questions WHERE stem LIKE '%第2空%' OR stem LIKE '%第1空%';"
]).toString().split('\n').filter(Boolean).map(l => JSON.parse(Buffer.from(l, 'base64').toString('utf8')));
console.log('受影响题目:', b64.length);

// 2. 简单类: 仅一个冗余 第1空 标记 → 直接删标记
const simple = b64.filter(q => !q.stem.includes('第2空') && (q.stem.match(/第1空/g) || []).length === 1);
const complex = b64.filter(q => !simple.includes(q));
for (const q of simple) {
  const cleaned = q.stem.replace(/（第1空）/g, '').replace(/（第2空）/g, '');
  runSql(`UPDATE questions SET stem='${esc(cleaned)}' WHERE id=${q.id};`);
  console.log('简单修复 id=' + q.id);
}

// 3. 复杂类: LLM 重写
const SYS = `你是软考题库修复专家。输入的每道题都是从"双空真题"错误拆分出来的拷贝：原题有第1空、第2空，拆分后两份拷贝题干相同，但各自携带其中一个空的真实答案（answer 字段，为选项字母）与该空的候选项（options）。
任务：根据本拷贝的 answer 所指的正确选项与题干上下文，把题干改写成一道干净、自洽的单选题题干。
要求:
1. 只保留与该空对应的句子，把该空位置统一写成"（ ）"；删除另一空的句子及其所有"（第1空）（第2空）"标记
2. 改写后的题干不得再出现"第1空"或"第2空"字样，必须恰好包含一个"（ ）"
3. 不得改变题目考察的知识点，不得改动选项
4. 改写后，answer 所指的选项必须是唯一正确答案
5. 若发现该拷贝的 answer 与其 options 明显矛盾、无法自洽，输出 {"id":编号,"skip":true}
严格返回 JSON 数组: [{"id":编号,"stem":"新题干","analysis":"简短解析:正确项论证+易混项辨析,100字内"}]`;

let fail = 0, fixed = 0, skipped = [];
const results = [];

async function callLlm(batch, attempt) {
  try {
    const res = await fetch('https://open.bigmodel.cn/api/coding/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.2',
        messages: [{ role: 'system', content: SYS },
          { role: 'user', content: '请修复以下' + batch.length + '道题:\n' + JSON.stringify(batch) }],
        temperature: 0.2, max_tokens: 4000, response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(180000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content || '';
    const m = content.match(/\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : content);
  } catch (e) {
    if (attempt < 2) { await new Promise(r => setTimeout(r, 3000)); return callLlm(batch, attempt + 1); }
    throw e;
  }
}

function valid(item) {
  return item && item.stem && !item.stem.includes('第1空') && !item.stem.includes('第2空')
    && item.stem.includes('（ ）') && item.stem.length > 20;
}

(async () => {
  const batches = [];
  for (let i = 0; i < complex.length; i += 4) batches.push(complex.slice(i, i + 4));
  for (const batch of batches) {
    try {
      const arr = await callLlm(batch.map(q => ({ id: q.id, stem: q.stem, options: q.options, answer: q.answer })), 0);
      for (const item of arr) {
        const q = batch.find(b => b.id === item.id);
        if (!q) continue;
        if (item.skip) { skipped.push(q.id); continue; }
        if (!valid(item)) { fail++; console.error('校验失败 id=' + q.id); continue; }
        runSql(`UPDATE questions SET stem='${esc(item.stem)}', analysis='${esc(item.analysis || '')}' WHERE id=${q.id};`);
        fixed++;
        results.push({ id: q.id, stem: item.stem });
      }
    } catch (e) {
      fail++;
      console.error('批次失败:', e.message.slice(0, 100));
    }
  }
  console.log(`DONE complex=${complex.length} fixed=${fixed} skipped=${skipped.length} fail=${fail}`);
  fs.writeFileSync(path.join(__dirname, 'multiblank-results.json'), JSON.stringify(results, null, 2));
})();

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function runSql(sql) {
  execFileSync('mysql', MYSQL, { input: 'SET NAMES utf8mb4;\n' + sql, stdio: ['pipe', 'ignore', 'pipe'] });
}
