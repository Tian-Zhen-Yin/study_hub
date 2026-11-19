const fs = require('fs');
const P = 'E:/AiProject/study_hub/src/main/resources/static/shared/pages.js';
let s = fs.readFileSync(P, 'utf8');

// 1. 在 escInlineMd 前注入 mdInlineImages 辅助
const escDef = 'function escInlineMd(t) {';
if (!s.includes(escDef)) throw new Error('escInlineMd not found');
const HELPER = `/* 题干/小问中的【图: url】占位符就地还原为图片（导入时题图下载到 /uploads/ 并替换为占位符） */
function mdInlineImages(html) {
  if (!html || html.indexOf("\u3010\u56fe") < 0) return html;
  return html.replace(/\u3010\u56fe[:\\uff1a]\\s*([^\\u3011\\s]+)\\u3011/g, function(m, url) {
    var safe = safeImageUrl(url);
    if (!safe) return m;
    return '<div style="text-align:center;margin:10px 0"><img src="' + safe + '" alt="\u9898\u56fe" loading="lazy" style="max-width:100%;max-height:440px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-low);object-fit:contain" onerror="this.parentNode.style.display=\\'none\\'"></div>';
  });
}

`;
s = s.replace(escDef, HELPER + escDef);

// 2. escInlineMd 返回值包一层 mdInlineImages
const escRet = '  return escMem(t == null ? "" : String(t).replace(/\\r/g, ""))';
const escTail = '.replace(/`([^`]+)`/g, "<code>$1</code>");';
const eIdx = s.indexOf(escRet);
if (eIdx < 0) throw new Error('escInlineMd return not found');
const tIdx = s.indexOf(escTail, eIdx);
if (tIdx < 0) throw new Error('escInlineMd tail not found');
s = s.slice(0, eIdx) + '  return mdInlineImages(' + s.slice(eIdx + 2, tIdx + escTail.length - 1) + ');' + s.slice(tIdx + escTail.length);

// 3. renderStemHtml 两个返回路径都包一层（题干经 simpleMarkdown 或 escMem 渲染后）
const rs1 = 'return simpleMarkdown(t);';
if (!s.includes(rs1)) throw new Error('renderStemHtml md branch not found');
s = s.replace(rs1, 'return mdInlineImages(simpleMarkdown(t));');
const rs2 = '  return escMem(t);\r\n}';
const r2i = s.indexOf(rs2, s.indexOf('function renderStemHtml'));
if (r2i < 0) throw new Error('renderStemHtml esc branch not found');
s = s.slice(0, r2i) + '  return mdInlineImages(escMem(t));\r\n}' + s.slice(r2i + rs2.length);

fs.writeFileSync(P, s);
console.log('mdInlineImages patch applied');
