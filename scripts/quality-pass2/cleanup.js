// 质量清洗 pass2:修复 MCQ 题干/选项排版,标记缺图/坏题 → 生成 update.sql
// 规则见 README;CASE/ESSAY 是特意写的 markdown 富文本,仅归一 CR,不动其他
const fs = require('fs');
const path = require('path');

const rows = fs.readFileSync(path.join(__dirname, 'questions.b64'), 'utf8')
  .split('\n').filter(Boolean)
  .map(l => {
    const o = JSON.parse(l);
    return {
      id: o.id, src: o.src, type: o.type,
      stem: Buffer.from(o.stem, 'base64').toString('utf8'),
      opts: o.opts ? Buffer.from(o.opts, 'base64').toString('utf8') : ''
    };
  });

// 边角残留统计
let link = 0, imgmd = 0, singleStar = 0;
for (const q of rows) {
  if (/\[[^\]]+\]\([^)]+\)/.test(q.stem)) link++;
  if (/!\[[^\]]*\]\([^)]+\)/.test(q.stem)) imgmd++;
  if (/[^*]\*[^*\n]+[^*]\*[^*]/.test(q.stem)) singleStar++;
}
console.log('extra counts: link=', link, 'imgmd=', imgmd, 'singleStar=', singleStar);

const TERM = /(E-?R|用例|控制流|流程|状态|类图|交互|数据流|顺序|活动|部署|组件|拓扑|结构|架构|关系|程序流程|层次|组织)图中/;
const IMG_REF = /(如图所示|如下图|下图|见图|根据图|观察图|看图|图所示)/;

const cleanMcq = s => {
  let t = s.replace(/\r\n?/g, '\n');
  t = t.replace(/\*\*([^*]*)\*\*/g, '$1');   // **加粗** → 纯文本
  t = t.replace(/\*\*/g, '');
  t = t.replace(/\*([^*\n]+)\*/g, '$1');      // *斜体* → 纯文本
  t = t.replace(/`([^`]*)`/g, '$1');          // `code` → 纯文本
  t = t.replace(/([\u4e00-\u9fff]) +(?=[\u4e00-\u9fff])/g, '$1'); // 汉字间 PDF 断字空格
  t = t.replace(/\n[ \t]+/g, '\n').replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{2,}/g, '\n');             // 连续空行折叠
  t = t.replace(/\n\s*Options:\s*$/i, '');    // 尾随 Options: 杂质
  return t.trim();
};

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const sqls = [];
const diffs = [];
let nStem = 0, nOpts = 0, nCrSubj = 0;

for (const q of rows) {
  const isMcq = q.type === '';
  if (isMcq) {
    const ns = cleanMcq(q.stem);
    if (ns !== q.stem) { nStem++; sqls.push(`UPDATE questions SET stem='${esc(ns)}' WHERE id=${q.id};`); diffs.push({ id: q.id, field: 'stem', before: q.stem, after: ns }); }
    if (q.opts) {
      try {
        const arr = JSON.parse(q.opts);
        let changed = false;
        const na = arr.map(o => {
          if (typeof o !== 'string') return o;
          const t = cleanMcq(o).replace(/\n+/g, ' ');
          if (t !== o) { changed = true; return t; }
          return o;
        });
        if (changed) {
          const no = JSON.stringify(na);
          nOpts++;
          sqls.push(`UPDATE questions SET options_json='${esc(no)}' WHERE id=${q.id};`);
          diffs.push({ id: q.id, field: 'opts', before: q.opts, after: no });
        }
      } catch (e) { console.log('opts JSON parse fail', q.id); }
    }
  } else if (/\r/.test(q.stem)) {
    // CASE/ESSAY:仅归一换行符
    const ns = q.stem.replace(/\r\n?/g, '\n');
    nCrSubj++;
    sqls.push(`UPDATE questions SET stem='${esc(ns)}' WHERE id=${q.id};`);
    diffs.push({ id: q.id, field: 'stem-subj-cr', before: q.stem.slice(0, 50), after: ns.slice(0, 50) });
  }

  // 标记(不覆盖已有 flag)
  if (IMG_REF.test(q.stem) && !TERM.test(q.stem)) {
    sqls.push(`UPDATE questions SET flag_type='MISSING_IMAGE', flag_note='题干引用配图(如图所示/下图),原图在PDF导入时丢失,无法作答', flagged_at=NOW() WHERE id=${q.id} AND flag_type IS NULL;`);
  }
  if (/^- [A-D][.、]/m.test(q.stem)) {
    sqls.push(`UPDATE questions SET flag_type='INCOMPLETE_STEM', flag_note='题干仅剩选项列表,原英文完形填空段落丢失', flagged_at=NOW() WHERE id=${q.id} AND flag_type IS NULL;`);
  }
}

console.log(`stem updated: ${nStem}, opts updated: ${nOpts}, subj CR: ${nCrSubj}, sqls: ${sqls.length}`);
fs.writeFileSync(path.join(__dirname, 'update.sql'),
  'SET NAMES utf8mb4;\n' + sqls.join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'diffs.jsonl'),
  diffs.map(d => JSON.stringify(d)).join('\n'));
console.log('update.sql + diffs.jsonl written');

// 抽样 diff 预览
diffs.filter(d => d.field === 'stem').slice(0, 5).forEach(d =>
  console.log('---', d.id, '\n  B:', JSON.stringify(d.before.slice(0, 120)), '\n  A:', JSON.stringify(d.after.slice(0, 120))));
