// 质量摸底:解码 questions.b64,统计各类排版/缺图问题,输出 review 文件
const fs = require('fs');
const path = require('path');

const rows = fs.readFileSync(path.join(__dirname, 'questions.b64'), 'utf8')
  .split('\n').filter(Boolean)
  .map(l => {
    const o = JSON.parse(l);
    return {
      id: o.id, src: o.src, type: o.type,
      stem: Buffer.from(o.stem, 'base64').toString('utf8'),
      opts: o.opts ? Buffer.from(o.opts, 'base64').toString('utf8') : '',
      ana: o.ana ? Buffer.from(o.ana, 'base64').toString('utf8') : ''
    };
  });
console.log('total', rows.length);

const CJK = /[\u4e00-\u9fff]/;
const cjkSpace = s => {
  let n = 0;
  for (let i = 1; i < s.length - 1; i++)
    if (s[i] === ' ' && CJK.test(s[i-1]) && CJK.test(s[i+1])) n++;
  return n;
};
// 真缺图:指代"配图"而非术语(E-R图/用例图等)
const TERM = /(E-?R|用例|控制流|流程|状态|类图|交互|数据流|顺序|活动|部署|组件|拓扑|结构|架构|关系|程序流程|层次|组织)图中/;
const IMG_REF = /(如图所示|如下图|下图|见图|根据图|观察图|看图|图所示)/;

const stats = {};
const bump = k => stats[k] = (stats[k] || 0) + 1;
const review = [];

for (const q of rows) {
  const s = q.stem;
  if (IMG_REF.test(s) && !TERM.test(s)) { bump('img_ref'); review.push({ cat: 'IMG', id: q.id, text: s.slice(0, 120) }); }
  if (s.includes('**')) bump('stem_bold');
  if (s.includes('`')) bump('stem_backtick');
  if (/(^|\n)\s*[-*]\s/.test(s)) { bump('stem_bullet'); review.push({ cat: 'BULLET', id: q.id, text: s }); }
  if (/\r/.test(s)) bump('stem_cr');
  if (/\n{2,}/.test(s)) bump('stem_blankline');
  const cs = cjkSpace(s);
  if (cs > 0) { bump('stem_cjk_space'); bump('stem_cjk_space_hits+' + cs); }
  if (q.opts && (q.opts.includes('**') || q.opts.includes('`'))) bump('opts_md');
  // OCR 乱字候选:汉字夹英文怪词、全角竖线、"1>"、"ft"、孤立"&"
  if (/[\u4e00-\u9fff](ft|丨)[\u4e00-\u9fff]/.test(s) || s.includes('弓丨') || /[\u4e00-\u9fff]&[\u4e00-\u9fff]/.test(s)) {
    bump('ocr_garble'); review.push({ cat: 'OCR', id: q.id, text: s.slice(0, 160) });
  }
  if (s.replace(/\s/g, '').length < 10) { bump('short'); review.push({ cat: 'SHORT', id: q.id, text: s }); }
}

console.log(JSON.stringify(stats, null, 1));
fs.writeFileSync(path.join(__dirname, 'review.jsonl'),
  review.map(r => JSON.stringify(r)).join('\n'));
console.log('review entries:', review.length);

// 抽样:字间空格最多的题 Top5
rows.map(q => ({ id: q.id, n: cjkSpace(q.stem) }))
  .sort((a, b) => b.n - a.n).slice(0, 5).forEach(x => console.log('cjk-space top:', x.id, x.n));
