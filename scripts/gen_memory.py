# -*- coding: utf-8 -*-
import os

f = r"E:\AiProject\study_hub\src\main\resources\static\shared\pages.js"
c = open(f, encoding="utf-8").read()

start = c.index("/* ===== Memory Forge ===== */")
end = c.index("/* ===== Simulation ===== */")
before = c[:start]
after = c[end:]

new_mem = """/* ===== Memory Forge ===== */
var memCards = [], memIdx = 0;

async function renderMemory(c) {
  var stats = {total: 0, due: 0, mastered: 0};
  try { stats = await apiGet("/memory/stats"); } catch(e) {}
  memCards = [];
  try { memCards = await apiGet("/memory/cards"); } catch(e) { memCards = []; }
  memIdx = 0;

  var dueCount = stats.due || 0;
  var masteredCount = stats.mastered || 0;
  var totalCount = stats.total || memCards.length;

  c.innerHTML = '<div class="page-title">记忆熔炉</div>' +
    '<div class="page-subtitle">间隔重复 \u00b7 知识锻造 \u00b7 SM-2 算法</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="flex-between">' +
        '<div style="display:flex;gap:20px">' +
          '<div><span class="text-muted">总卡片</span><br><strong style="font-size:20px">' + totalCount + '</strong></div>' +
          '<div><span class="text-muted">待复习</span><br><strong style="font-size:20px;color:var(--warning-5)">' + dueCount + '</strong></div>' +
          '<div><span class="text-muted">已掌握</span><br><strong style="font-size:20px;color:var(--success-5)">' + masteredCount + '</strong></div>' +
        '</div>' +
        '<button onclick="addMemoryCard()" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">+ 添加卡片</button>' +
      '</div>' +
      '<div class="content-card" id="memory-card-display"></div>' +
    '</div>';
  renderMemoryCard();
}

function renderMemoryCard() {
  var el = document.getElementById("memory-card-display");
  if (!el) return;
  if (!memCards.length) {
    el.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>暂无记忆卡片</p><p class="text-muted">将重要知识点制作成卡片，开始锻造记忆</p><button onclick="addMemoryCard()" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">+ 创建第一张卡片</button></div>';
    return;
  }
  var card = memCards[memIdx];
  if (!card) {
    el.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>\U0001f389 本轮复习完成！</p><p class="text-muted">下次复习时间已由 SM-2 算法自动安排</p><button onclick="navigate(\'memory\')" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">刷新</button></div>';
    return;
  }
  var stateLabel = card.state === "mastered" ? "已掌握" : (card.state === "learning" ? "学习中" : "新卡");
  var stateColor = card.state === "mastered" ? "var(--success-5)" : (card.state === "learning" ? "var(--warning-5)" : "var(--text-3)");
  el.innerHTML = '<div class="content-card-body" style="text-align:center;padding:40px">' +
    '<div style="margin-bottom:8px"><span style="font-size:12px;padding:2px 10px;border-radius:12px;background:' + stateColor + ';color:#fff">' + stateLabel + '</span> <span class="text-muted">' + (memIdx+1) + '/' + memCards.length + '</span></div>' +
    '<div class="text-muted">点击卡片翻转</div>' +
    '<div id="memory-flashcard" style="margin:20px auto;width:320px;height:200px;perspective:1000px;cursor:pointer" onclick="flipCard()">' +
      '<div id="memory-card-inner" style="position:relative;width:100%;height:100%;transition:transform .6s;transform-style:preserve-3d">' +
        '<div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:var(--bg-card);border:2px solid var(--border-2);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:20px;font-size:16px;font-weight:600" id="mem-front">' + (card.question || "无问题") + '</div>' +
        '<div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:var(--primary-1);border:2px solid var(--primary-3);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:20px;font-size:14px;transform:rotateY(180deg)" id="mem-back">' + (card.answer || "无答案") + '</div>' +
      '</div>' +
    '</div>' +
    '<div id="memory-actions" style="display:flex;gap:10px;justify-content:center;margin-top:16px">' +
      '<button onclick="rateMemory(0,' + card.id + ')" style="padding:10px 20px;border:1px solid var(--danger-5);border-radius:8px;background:var(--danger-2);color:var(--danger-6);cursor:pointer;font-weight:600">\U0001f630 忘记了</button>' +
      '<button onclick="rateMemory(1,' + card.id + ')" style="padding:10px 20px;border:1px solid var(--warning-5);border-radius:8px;background:var(--warning-1);color:var(--warning-6);cursor:pointer;font-weight:600">\U0001f914 模糊</button>' +
      '<button onclick="rateMemory(2,' + card.id + ')" style="padding:10px 20px;border:1px solid var(--success-5);border-radius:8px;background:var(--success-1);color:var(--success-6);cursor:pointer;font-weight:600">\U0001f60e 认识</button>' +
    '</div>' +
  '</div>';
}

function flipCard() {
  var inner = document.getElementById("memory-card-inner");
  if (inner) inner.style.transform = inner.style.transform === "rotateY(180deg)" ? "" : "rotateY(180deg)";
}

async function rateMemory(quality, cardId) {
  flipCard();
  try { await apiPost("/memory/cards/" + cardId + "/review", {quality: quality}); } catch(e) { console.warn("review failed", e); }
  setTimeout(function() {
    memIdx++;
    if (memIdx >= memCards.length) {
      var el = document.getElementById("memory-card-display");
      if (el) el.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>\U0001f389 本轮复习完成！</p><p class="text-muted">下次复习时间已由 SM-2 算法自动安排</p><button onclick="navigate(\'memory\')" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">刷新</button></div>';
      return;
    }
    renderMemoryCard();
  }, 600);
}

function addMemoryCard() {
  var q = prompt("正面（问题/概念）：");
  if (!q) return;
  var a = prompt("背面（答案/解析）：");
  if (!a) return;
  apiPost("/memory/cards", {question: q, answer: a}).then(function() { navigate("memory"); }).catch(function() { alert("添加失败"); });
}

"""
c = before + new_mem + after
open(f, "w", encoding="utf-8").write(c)
print("Memory module updated, len=" + str(len(c)))