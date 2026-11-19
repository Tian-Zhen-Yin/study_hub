// 由 data/papers/15-essay-sprint.md 生成手机阅读页 data/sprint.html
// 用法: node scripts/make-sprint-html.js
// data/ 目录由应用静态托管(application.yml static-locations), 生成即生效, 无需重新打包
const fs = require('fs');
const PATH = require('path');
const ROOT = PATH.resolve(__dirname, '..');
const SRC = PATH.join(ROOT, 'data/papers/15-essay-sprint.md');
const DST = PATH.join(ROOT, 'data/sprint.html');

const md = fs.readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
function isTableSep(l) { return /^\|[\s:|-]+\|?$/.test(l); }
function tableRows(block) {
  return block.filter(l => !isTableSep(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
}

let out = [];
let toc = [];
let i = 0;
let title = '';
// 收集一段连续行
function collect(pred) {
  const buf = [];
  while (i < lines.length && pred(lines[i])) { buf.push(lines[i]); i++; }
  return buf;
}

// 标题
while (i < lines.length && !lines[i].startsWith('# ')) i++;
if (i < lines.length) { title = lines[i].slice(2).trim(); i++; }

// 头部说明块(引用)
function renderBlocks(stopAtPartStart) {
  let html = '';
  while (i < lines.length) {
    const l = lines[i];
    if (stopAtPartStart && l.startsWith('## ')) break;
    if (!l.trim() || l.trim() === '---') { i++; continue; }
    if (l.startsWith('> ')) {
      const buf = collect(x => x.startsWith('> ')).map(x => x.slice(2));
      html += '<div class="note">' + buf.map(inline).join('<br>') + '</div>';
    } else if (l.startsWith('### ')) {
      i++;
      html += '<h3>' + inline(l.slice(4)) + '</h3>';
    } else if (l.startsWith('```')) {
      i++;
      const buf = collect(x => !x.startsWith('```'));
      i++; // 收尾 ```
      html += '<pre>' + esc(buf.join('\n')) + '</pre>';
    } else if (l.trim().startsWith('|')) {
      const rows = tableRows(collect(x => x.trim().startsWith('|')));
      if (rows.length) {
        html += '<div class="tw"><table><thead><tr>' +
          rows[0].map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.slice(1).map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
          '</tbody></table></div>';
      }
    } else if (/^[-*] /.test(l)) {
      const buf = collect(x => /^[-*] /.test(x)).map(x => {
        let t = x.slice(2);
        let box = '';
        if (t.startsWith('[ ] ')) { box = '<span class="cbx">&#9744;</span>'; t = t.slice(4); }
        return '<li>' + box + inline(t) + '</li>';
      });
      html += '<ul>' + buf.join('') + '</ul>';
    } else if (/^\d+\. /.test(l)) {
      const buf = collect(x => /^\d+\. /.test(x)).map(x => {
        const m = x.match(/^(\d+)\. (.*)$/);
        return '<li value="' + m[1] + '">' + inline(m[2]) + '</li>';
      });
      html += '<ol>' + buf.join('') + '</ol>';
    } else {
      const buf = collect(x => x.trim() && !/^([-*] |\d+\. |### |```|> |\|)/.test(x) && !(stopAtPartStart && x.startsWith('## ')));
      html += '<p>' + buf.map(inline).join('<br>') + '</p>';
    }
  }
  return html;
}

const introHtml = renderBlocks(true);

// 各部分
let partIdx = 0;
while (i < lines.length) {
  if (!lines[i].startsWith('## ')) { i++; continue; }
  const name = lines[i].slice(3).trim();
  i++;
  const id = 'p' + (partIdx + 1);
  toc.push({ id: id, name: name });
  const body = renderBlocks(true);
  const badge = name.match(/【背】/) ? 'b1' : (name.match(/【读】/) ? 'b2' : 'b3');
  out.push('<details class="part" id="' + id + '"' + (partIdx < 2 ? ' open' : '') + '><summary><span class="tag ' + badge + '">' +
    (name.match(/【背】/) ? '背' : name.match(/【读】/) ? '读' : '看') + '</span>' + esc(name) + '</summary><div class="pbody">' + body + '</div></details>');
  partIdx++;
}

const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
'<meta name="theme-color" content="#1e3a8a"><title>' + esc(title) + '</title><style>' +
':root{--bg:#f1f5f9;--card:#fff;--tx:#0f172a;--tx2:#475569;--line:#e2e8f0;--acc:#1d4ed8;--accbg:#dbeafe;--note:#fffbeb;--noteline:#fcd34d;--pre:#f8fafc}html.dark{--bg:#0b1120;--card:#151d2e;--tx:#e2e8f0;--tx2:#94a3b8;--line:#2a3650;--acc:#7ea2f8;--accbg:#1e293b;--note:#2a2313;--noteline:#7c5f10;--pre:#101726}' +
'*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:17px/1.85 -apple-system,BlinkMacSystemFont,"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif;padding-bottom:40px}' +
'header{position:sticky;top:0;z-index:9;background:linear-gradient(135deg,#1e3a8a,#312e81);color:#fff;padding:10px 14px calc(10px + env(safe-area-inset-top))}header .h1{font-size:17px;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
'.hd-row{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12.5px;color:#c7d2fe;flex-wrap:wrap}' +
'.days{background:#dc2626;color:#fff;border-radius:14px;padding:1px 10px;font-weight:800}' +
'button.hbtn{background:rgba(255,255,255,.16);border:none;color:#fff;border-radius:8px;padding:3px 10px;font-size:13px;font-weight:700;cursor:pointer}' +
'main{max-width:760px;margin:0 auto;padding:12px 12px 0}' +
'.toc{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:12px;overflow:hidden}' +
'.toc summary{padding:12px 14px;font-weight:800;cursor:pointer;list-style:none;display:flex;gap:8px;align-items:center}.toc summary::-webkit-details-marker{display:none}' +
'.toc summary:before{content:"☰";font-size:16px}' +
'.toc a{display:block;padding:9px 14px;border-top:1px solid var(--line);color:var(--tx);text-decoration:none;font-size:14.5px}.toc a:active{background:var(--accbg)}' +
'details.part{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:12px;overflow:hidden}' +
'details.part>summary{padding:13px 14px;font-weight:800;font-size:15.5px;cursor:pointer;list-style:none;display:flex;align-items:center;gap:9px;line-height:1.5}details.part>summary::-webkit-details-marker{display:none}' +
'details.part>summary:after{content:"▾";margin-left:auto;color:var(--tx2);transition:.15s}details.part[open]>summary:after{transform:rotate(180deg)}' +
'.tag{flex:0 0 auto;font-size:12px;font-weight:800;border-radius:8px;padding:1px 8px}.tag.b1{background:#fee2e2;color:#991b1b}.tag.b2{background:#fef3c7;color:#92400e}.tag.b3{background:#e0e7ff;color:#3730a3}html.dark .tag.b1{background:#4c1d1d;color:#fca5a5}html.dark .tag.b2{background:#453411;color:#fcd34d}html.dark .tag.b3{background:#26304d;color:#a5b4fc}' +
'.pbody{padding:2px 14px 14px;border-top:1px solid var(--line)}' +
'h3{font-size:15px;margin:18px 0 8px;padding-left:9px;border-left:4px solid var(--acc);line-height:1.5}' +
'p{margin:9px 0;font-size:15.5px}.note{background:var(--note);border:1px solid var(--noteline);border-radius:10px;padding:10px 12px;font-size:14px;margin:10px 0;line-height:1.8}' +
'.tw{overflow-x:auto;margin:10px 0;-webkit-overflow-scrolling:touch;position:relative}.tw::after{content:"⇠ 左右滑动 ⇢";display:block;text-align:center;font-size:11px;color:var(--tx2);margin-top:3px}table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:440px}th,td{border:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}th{background:var(--accbg);font-weight:800}' +
'pre{background:var(--pre);border:1px dashed var(--line);border-radius:10px;padding:11px 12px;font-size:13px;line-height:1.9;overflow-x:auto;white-space:pre-wrap;font-family:inherit;color:var(--tx)}' +
'ul,ol{margin:9px 0;padding-left:1.4em;font-size:15px}li{margin:5px 0}.cbx{margin-right:6px;color:var(--acc)}' +
'b{color:var(--tx)}html:not(.dark) .pbody b{color:#1e3a8a}' +
'footer{max-width:760px;margin:8px auto 0;padding:0 14px;color:var(--tx2);font-size:12px;text-align:center}' +
'</style></head><body>' +
'<header><div class="h1">📝 ' + esc(title) + '</div><div class="hd-row">' +
'<span class="days">距考 <span id="dd">--</span> 天</span>' +
'<span>范文ABC · 背诵卡12张 · 组装提纲D</span>' +
'<span style="margin-left:auto;display:flex;gap:6px"><a class="hbtn" href="/arch.html" style="text-decoration:none;background:rgba(255,255,255,.16);border:none;color:#fff;border-radius:8px;padding:3px 10px;font-size:13px;font-weight:700">📐 架构图</a><button class="hbtn" onclick="fsz(-1)">A−</button><button class="hbtn" onclick="fsz(1)">A＋</button><button class="hbtn" onclick="th()">{{THEMEBTN}}</button></span>' +
'</div></header><main>' +
'<details class="toc"><summary>目录 · 点开跳转</summary><div id="tocl">' +
toc.map(t => '<a href="#' + t.id + '" onclick="jump(event,\'' + t.id + '\')">' + t.name + '</a>').join('') +
'</div></details>' +
(introHtml ? '<div class="intro" style="margin-bottom:12px">' + introHtml + '</div>' : '') +
out.join('') +
'</main><footer>单文件离线可用 · 源: data/papers/15-essay-sprint.md · 生成: ' + new Date().toISOString().slice(0, 10) + '</footer>' +
'<script>' +
'var d=Math.ceil((new Date("2026-10-24")-Date.now())/864e5);document.getElementById("dd").textContent=d>0?d:0;' +
'function fsz(n){var s=parseInt(document.documentElement.style.fontSize||"17px")+n;s=Math.min(23,Math.max(14,s));document.documentElement.style.fontSize=s+"px";try{localStorage.setItem("sp-fs",s)}catch(e){}}' +
'function th(){var k=document.documentElement.classList.toggle("dark");try{localStorage.setItem("sp-th",k?"1":"0")}catch(e){}}' +
'function jump(e,id){e.preventDefault();var el=document.getElementById(id);if(el){el.open=true;el.scrollIntoView({behavior:"smooth"});}}' +
'try{var f=localStorage.getItem("sp-fs");if(f)document.documentElement.style.fontSize=f+"px";if(localStorage.getItem("sp-th")==="1")document.documentElement.classList.add("dark")}catch(e){}' +
'</script></body></html>';

fs.writeFileSync(DST, html.replace('{{THEMEBTN}}', '◐ 夜间'));
console.log('OK ->', DST, (html.length / 1024).toFixed(1) + 'KB, parts=' + toc.length);
