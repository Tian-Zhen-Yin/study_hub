/* ============================================================
   pages.js - All Module Page Renderers (Chinese)
   ============================================================ */

const $ = (id) => document.getElementById(id);
const content = () => $("app-content");

async function renderPage() {
  const c = content();
  c.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>加载中...</p></div>';
  try {
    switch (state.page) {
      case "dashboard": await renderDashboard(c); break;
      case "quiz":      await renderQuiz(c); break;
      case "memory":    await renderMemory(c); break;
      case "simulation":await renderSimulation(c); break;
      case "diagnosis": await renderDiagnosis(c); break;
      case "plan":      await renderPlan(c); break;
      case "bank":      await renderBank(c); break;
      case "data":      await renderData(c); break;
      case "llm-settings": await renderLlmSettings(c); break;
      default:          await renderDashboard(c);
    }
  } catch (e) {
    c.innerHTML = '<div class="state-error"><p>加载失败: ' + e.message + '</p></div>';
  }
  lucide.createIcons();
}

async function loadDomains() {
  try { state.domains = await apiGet("/domains"); } catch { state.domains = []; }
  return state.domains;
}
async function loadTerritories() {
  try { state.territories = await apiGet("/territories"); } catch { state.territories = []; }
  return state.territories;
}
async function loadQuestions(domainId, count) {
  try {
    const params = new URLSearchParams();
    if (domainId) params.set("domainId", domainId);
    params.set("count", count || 30);
    return await apiGet("/questions?" + params);
  } catch { return []; }
}

/* ===== Dashboard ===== */
async function renderDashboard(c) {
  const territories = state.territories.length ? state.territories : await loadTerritories();
  const domains = state.domains.length ? state.domains : await loadDomains();
  const conquered = territories.filter(t => t.bossDefeated).length;
  const total = territories.length || 9;

  c.innerHTML = '<div class="page-title">冒险者大厅</div>' +
    '<div class="page-subtitle">欢迎回来！今天也要加油。</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="content-card">' +
        '<div class="content-card-header"><div class="content-card-title">阴阳五合画像</div><span class="text-muted" id="five-elements-balance">平衡度 --</span></div>' +
        '<div class="content-card-body" style="display:flex;flex-wrap:wrap;gap:20px;align-items:center">' +
          '<canvas id="five-elements-radar" width="300" height="300" style="flex:0 0 300px"></canvas>' +
          '<div id="five-elements-info" style="flex:1;min-width:200px"></div>' +
        '</div>' +
      '</div>' +
      '<div class="grid-2">' +
        '<div class="content-card">' +
          '<div class="content-card-header"><div class="content-card-title">每日任务</div><span class="text-muted">6小时后刷新</span></div>' +
          '<div class="content-card-body" id="daily-tasks"></div>' +
        '</div>' +
        '<div class="content-card">' +
          '<div class="content-card-header"><div class="content-card-title">成就殿堂</div><span class="text-muted" id="ach-count">0/8</span></div>' +
          '<div class="content-card-body" id="achievements-list"></div>' +
        '</div>' +
      '</div>' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">学习趋势</div></div><div class="content-card-body"><canvas id="trend-chart" height="200"></canvas></div></div>' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">领地征服</div><span class="text-muted">' + conquered + '/' + total + ' 已征服</span></div><div class="content-card-body"><div class="grid-9" id="territory-grid"></div></div></div>' +
    '</div>';

  renderDailyTasks();
  renderAchievements();
  renderTerritories(territories, domains);
  renderTrendChart();
  renderFiveElements();
}

async function renderFiveElements() {
  const canvas = document.getElementById("five-elements-radar");
  const infoDiv = document.getElementById("five-elements-info");
  const balanceSpan = document.getElementById("five-elements-balance");
  if (!canvas || !infoDiv) return;

  let profile;
  try {
    profile = await apiGet("/profile/five-elements");
  } catch(e) {
    infoDiv.innerHTML = '<p class="text-muted">五合数据加载失败</p>';
    return;
  }

  const dims = [
    { key: "metal", label: "金·精准", value: profile.metal ? profile.metal.value : 0.5 },
    { key: "wood",  label: "木·成长", value: profile.wood ? profile.wood.value : 0.5 },
    { key: "water", label: "水·流畅", value: profile.water ? profile.water.value : 0.5 },
    { key: "fire",  label: "火·热情", value: profile.fire ? profile.fire.value : 0.5 },
    { key: "earth", label: "土·稳固", value: profile.earth ? profile.earth.value : 0.5 }
  ];

  drawFiveElementsRadar(canvas, dims);

  if (balanceSpan) {
    const pct = (profile.balanceScore * 100).toFixed(1);
    balanceSpan.textContent = "平衡度 " + pct + "%";
  }

  const crisisMap = {
    metal: "金(精准度)", wood: "木(成长性)", water: "水(流畅度)",
    fire: "火(热情度)", earth: "土(稳固度)"
  };
  const crisisLabel = crisisMap[profile.crisisDimension] || "";

  infoDiv.innerHTML =
    '<div style="margin-bottom:12px">' +
      dims.map(d => {
        const pct = (d.value * 100).toFixed(1);
        const barColor = d.value < 0.35 ? "#ef4444" : d.value > 0.85 ? "#f59e0b" : "#7c3aed";
        return '<div style="margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">' +
            '<span>' + d.label + '</span><span>' + pct + '%</span>' +
          '</div>' +
          '<div style="height:6px;background:var(--bg-surface-low);border-radius:3px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:3px;transition:width 0.3s"></div>' +
          '</div>' +
        '</div>';
      }).join("") +
    '</div>' +
    (crisisLabel ? '<div style="padding:8px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;color:#dc2626;font-size:13px;margin-bottom:8px">⚠ ' + crisisLabel + ' 需要加强</div>' : '') +
    '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-secondary)">' +
      '<span>累计 ' + (profile.totalRounds || 0) + ' 题</span>' +
      '<span>正确率 ' + ((profile.accuracy || 0) * 100).toFixed(1) + '%</span>' +
      '<span>连击 ' + (profile.currentStreak || 0) + '</span>' +
    '</div>';
}

function drawFiveElementsRadar(canvas, dims) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxRadius = Math.min(cx, cy) - 45;
  const n = dims.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "var(--border-2, #e0e0e0)";
  ctx.lineWidth = 1;
  for (let level = 1; level <= 5; level++) {
    const r = (maxRadius * level) / 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = "var(--border-2, #e0e0e0)";
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxRadius * Math.cos(angle), cy + maxRadius * Math.sin(angle));
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(124, 58, 237, 0.15)";
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = startAngle + idx * angleStep;
    const r = maxRadius * Math.max(0.02, dims[idx].value);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7c3aed";
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const r = maxRadius * Math.max(0.02, dims[i].value);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "var(--text-primary, #333)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const labelR = maxRadius + 22;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);
    ctx.fillText(dims[i].label, x, y);
  }
}

function renderDailyTasks() {
  var tasks = [
    { text: "刷题 30 题", done: false, icon: "⚔️" },
    { text: "记忆 10 张卡片", done: false, icon: "🔥" },
    { text: "完成一次模拟考", done: false, icon: "🏆" },
    { text: "回顾昨日错题", done: false, icon: "📝" }
  ];
  var el = document.getElementById("daily-tasks");
  if (!el) return;
  el.innerHTML = tasks.map(function(t) {
    return '<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-1)"><span>' + t.icon + ' ' + t.text + '</span><input type="checkbox" ' + (t.done?'checked':'') + ' style="accent-color:var(--primary-6)"></div>';
  }).join("");
}

function renderAchievements() {
  var achievements = [
    { key: "combo_king", name: "连击之王", desc: "连续答对 20 题", icon: "⚡" },
    { key: "boss_slayer", name: "Boss 杀手", desc: "击败 3 个 Boss", icon: "🐉" },
    { key: "streak_7", name: "七日之约", desc: "连续打卡 7 天", icon: "🔥" },
    { key: "conqueror", name: "征服者", desc: "征服全部领地", icon: "👑" },
    { key: "speed_demon", name: "极速达人", desc: "5 分钟完成 20 题", icon: "⚡" },
    { key: "scholar", name: "学者", desc: "累计答对 500 题", icon: "📚" },
    { key: "perfectionist", name: "完美主义", desc: "模拟考全对", icon: "💎" },
    { key: "collector", name: "收藏家", desc: "掌握所有记忆卡", icon: "🃏" }
  ];
  var el = document.getElementById("achievements-list");
  if (!el) return;
  el.innerHTML = achievements.map(function(a) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-1);opacity:0.4"><span style="font-size:20px">🔒</span><div><div style="font-weight:500">' + a.name + '</div><div class="text-muted">' + a.desc + '</div></div></div>';
  }).join("");
}

function renderTerritories(territories, domains) {
  var el = document.getElementById("territory-grid");
  if (!el) return;
  if (!territories.length) { el.innerHTML = '<div class="text-muted">暂无领地数据</div>'; return; }
  el.innerHTML = territories.map(function(t) {
    var name = t.domainName || ("领域 " + t.domainId);
    var answered = t.questionsAnswered || 0;
    var total = t.totalQuestions || 0;
    var accPct = answered > 0 ? Math.round((t.accuracy || 0) * 100) : 0;
    // 进度：已答题数占总题数的比例（用于配色渐变）
    var progressPct = total > 0 ? Math.min(100, Math.round(answered / total * 100)) : 0;

    // 按进度 HSL 渐变：0%灰 → 30%红 → 60%橙 → 100%绿
    var hue, sat, lightBg, lightBar, lightText;
    if (answered === 0) {
      hue = 0; sat = 0; lightBg = 90; lightBar = 65; lightText = 55;
    } else if (t.bossDefeated) {
      hue = 140; sat = 60; lightBg = 88; lightBar = 42; lightText = 35;
    } else {
      // 进度 0→100 映射到色相 0→120（红→橙→黄→绿）
      hue = Math.round(progressPct * 1.2);
      sat = 70;
      lightBg = 92;
      lightBar = 50;
      lightText = 38;
    }
    var bg = 'hsl(' + hue + ',' + sat + '%,' + lightBg + '%)';
    var bar = 'hsl(' + hue + ',' + sat + '%,' + lightBar + '%)';
    var txt = 'hsl(' + hue + ',' + (sat > 0 ? 60 : 0) + '%,' + lightText + '%)';

    var cls = "locked";
    var icon = "🔒";
    var statusText = "迷雾未开";
    if (t.bossDefeated) {
      cls = "conquered"; icon = "✓"; statusText = "已征服";
    } else if (answered > 0 && accPct >= 80) {
      cls = "in-progress"; icon = "⚔️"; statusText = "Boss 已解锁";
    } else if (answered > 0 && progressPct >= 60) {
      cls = "in-progress"; icon = "⚔️"; statusText = "深入征伐";
    } else if (answered > 0 && progressPct >= 20) {
      cls = "in-progress"; icon = "⏳"; statusText = "征伐中";
    } else if (answered > 0) {
      cls = "in-progress"; icon = "🌱"; statusText = "初探";
    }

    var barWidth = Math.max(progressPct, answered > 0 ? 6 : 0);

    return '<div class="territory-item ' + cls + '" style="cursor:pointer;background:' + bg + ';border-left:4px solid ' + bar + ';border-radius:8px;padding:10px 12px;transition:all .25s" onclick="navigate(\'quiz\')">' +
      '<div class="territory-icon">' + icon + '</div>' +
      '<div class="territory-info" style="flex:1;min-width:0">' +
        '<div class="territory-name">' + name + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:5px">' +
          '<div style="flex:1;height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden;min-width:40px">' +
            '<div style="height:100%;width:' + barWidth + '%;background:' + bar + ';border-radius:3px;transition:width .4s"></div>' +
          '</div>' +
          '<span style="font-size:12px;font-weight:600;color:var(--text-primary);white-space:nowrap">' + answered + '/' + total + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">' +
          '<span style="color:' + txt + ';font-weight:500">' + statusText + '</span>' +
          '<span style="color:var(--text-3,#555);font-weight:500">' + (answered > 0 ? '正确率 ' + accPct + '%' : '—') + '</span>' +
        '</div>' +
      '</div></div>';
  }).join("");
}

async function renderTrendChart() {
  var canvas = document.getElementById("trend-chart");
  if (!canvas || typeof Chart === "undefined") return;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#888";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("加载中...", canvas.width / 2, 40);

  var labels = [], answeredArr = [], correctArr = [];
  var totalAnswered = 0, totalCorrect = 0, overallAcc = 0;
  try {
    var res = await apiGet("/dashboard/trend");
    var data = res && res.data ? res.data : res;
    var series = data.series || [];
    series.forEach(function(p) {
      labels.push(p.weekday);
      answeredArr.push(p.answered);
      correctArr.push(p.correct);
    });
    totalAnswered = data.totalAnswered || 0;
    totalCorrect = data.totalCorrect || 0;
    overallAcc = data.overallAccuracy || 0;
  } catch (e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("数据加载失败", canvas.width / 2, 40);
    return;
  }

  // 重画 chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "答题数", data: answeredArr, backgroundColor: "rgba(124,58,237,0.55)", borderRadius: 4, order: 2 },
        { label: "答对数", data: correctArr, backgroundColor: "rgba(16,185,129,0.7)", borderRadius: 4, order: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: {
          footer: function(items) {
            var idx = items[0].dataIndex;
            var a = answeredArr[idx], c = correctArr[idx];
            return a > 0 ? "正确率 " + Math.round(c * 1000 / a) / 10 + "%" : "正确率 —";
          }
        } }
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });

  // 在标题旁补充本周汇总
  var headerSpan = document.querySelector("#trend-chart").closest(".content-card").querySelector(".content-card-header .text-muted");
  if (headerSpan) {
    headerSpan.textContent = "近7天 " + totalAnswered + " 题 · 正确率 " + overallAcc + "%";
  } else {
    var header = document.querySelector("#trend-chart").closest(".content-card").querySelector(".content-card-header");
    if (header) {
      var span = document.createElement("span");
      span.className = "text-muted";
      span.style.fontSize = "12px";
      span.textContent = "近7天 " + totalAnswered + " 题 · 正确率 " + overallAcc + "%";
      header.appendChild(span);
    }
  }
}

/* ===== Quiz Battle ===== */
var quizState = { mode: "practice", domainId: null, questions: [], currentIdx: 0, answers: [], combo: 0, maxCombo: 0, hp: 100, startTime: 0, timer: null };

async function renderQuiz(c) {
  var domains = state.domains.length ? state.domains : await loadDomains();
  var territories = state.territories.length ? state.territories : await loadTerritories();
  var domainOpts = domains.map(function(d) { return '<option value="' + d.id + '">' + d.name + '</option>'; }).join("");
  var modeNames = {practice:"自由练习",sequence:"顺序通关",random:"随机挑战",timed:"限时速答",intensive:"强化训练",endless:"无尽模式",daily:"每日挑战"};
  var modeDescs = {practice:"自选领域，无压力",sequence:"按顺序逐个击破",random:"随机抽取，考验应变",timed:"每题限时，考验速度",intensive:"高频错题集中攻克",endless:"无限刷题，冲击高分",daily:"每日限时 20 题"};
  var modeBtns = ["practice","sequence","random","timed","intensive","endless","daily"].map(function(m) {
    return '<button class="quiz-mode-btn" data-mode="' + m + '" onclick="startQuiz(\'' + m + '\')" style="padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-card);cursor:pointer;text-align:left;transition:all .15s"><div style="font-weight:600">' + modeNames[m] + '</div><div class="text-muted">' + modeDescs[m] + '</div></button>';
  }).join("");

  c.innerHTML = '<div id="quiz-layout-grid" style="display:grid;grid-template-columns:260px 1fr 260px;gap:20px;min-height:calc(100vh - 160px);transition:grid-template-columns .25s">' +
    '<div class="content-card" id="quiz-territory-card" style="max-height:calc(100vh - 160px);overflow-y:auto"><div class="content-card-header" style="cursor:pointer;user-select:none" onclick="toggleTerritoryPanel()"><div class="content-card-title">领地征伐</div><span id="quiz-territory-toggle" style="font-size:12px;color:var(--text-secondary);transition:transform .2s">▼</span></div><div class="content-card-body" id="quiz-territories"></div></div>' +
    '<div class="stack">' +
      '<div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none"><div class="content-card-body"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><div style="font-size:var(--font-size-h4);font-weight:600" id="quiz-mode-label">选择模式</div><div style="font-size:var(--font-size-caption);color:var(--hud-text-dim)" id="quiz-progress">--</div></div><div style="display:flex;flex-direction:column;gap:6px;flex:1;max-width:300px"><div class="hud-stat-row"><span class="hud-stat-label">HP</span><div class="stat-bar"><div class="stat-bar-fill hp" id="quiz-hp-bar" style="width:100%"></div></div><span id="quiz-hp-text" style="color:var(--hud-text);font-size:12px">100</span></div><div class="hud-stat-row"><span class="hud-stat-label">⚡</span><div class="stat-bar"><div class="stat-bar-fill exp" id="quiz-combo-bar" style="width:0%"></div></div><span id="quiz-combo-text" style="color:var(--hud-text);font-size:12px">Combo x0</span></div></div></div></div></div>' +
      '<div class="content-card" id="quiz-mode-select"><div class="content-card-header"><div class="content-card-title">选择战斗模式</div></div><div class="content-card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + modeBtns + '</div><div style="margin-top:12px;display:flex;gap:10px;align-items:center"><label style="font-size:14px;white-space:nowrap">领域：</label><select id="quiz-domain-select" style="flex:1;padding:8px;border:1px solid var(--border-2);border-radius:6px">' + domainOpts + '</select><button onclick="startBossBattle()" style="padding:8px 16px;background:linear-gradient(135deg,var(--danger-5),var(--danger-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Boss 战</button></div></div></div>' +
      '<div class="content-card" id="quiz-question-card" style="display:none"><div class="content-card-header"><div class="content-card-title" id="quiz-q-num">第 1 题</div><span class="text-muted" id="quiz-q-source"></span><span id="quiz-q-history"></span><span id="quiz-flag-area" style="margin-left:auto"></span><span id="quiz-timer" style="display:none;font-size:14px;font-weight:700;padding:2px 10px;border-radius:6px;background:var(--danger-2);color:var(--danger-6)">⏱ 30s</span></div><div class="content-card-body"><div id="quiz-flag-panel" style="display:none;margin-bottom:14px;padding:12px;border:1px solid var(--danger-3,#fa9ea3);border-radius:8px;background:var(--danger-1,#fef4f4)"></div><div id="quiz-q-image" class="quiz-stem-image"></div><div style="font-size:16px;line-height:1.7;margin-bottom:20px" id="quiz-q-stem"></div><div id="quiz-options" style="display:flex;flex-direction:column;gap:10px"></div><div id="quiz-feedback" style="display:none;margin-top:16px;padding:12px;border-radius:8px"></div><div style="margin-top:16px;display:flex;gap:10px"><button id="quiz-next-btn" style="display:none;padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="nextQuestion()">下一题</button><button id="quiz-finish-btn" style="display:none;padding:10px 24px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="finishQuiz()">完成战斗</button></div></div></div>' +
    '</div>' +
    '<div class="content-card" style="max-height:calc(100vh - 160px);overflow-y:auto"><div class="content-card-header"><div class="content-card-title">答题阵法</div><span class="text-muted" id="quiz-sheet-progress" style="font-size:12px"></span></div><div class="content-card-body"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px" id="quiz-sheet-grid"></div><div id="quiz-sheet-legend" style="margin-top:10px;display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-2)"><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--success-2);border:1.5px solid var(--success-5)"></span><span>已答对</span></div><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--danger-2);border:1.5px solid var(--danger-5)"></span><span>已答错</span></div><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--bg-card);border:1.5px solid var(--border-2)"></span><span>未作答</span></div></div></div></div>' +
    '</div>';
  renderQuizTerritories(territories, domains);
  restoreTerritoryPanel();
}

function toggleTerritoryPanel() {
  var card = document.getElementById("quiz-territory-card");
  var toggle = document.getElementById("quiz-territory-toggle");
  var title = card ? card.querySelector(".content-card-title") : null;
  var body = document.getElementById("quiz-territories");
  var grid = document.getElementById("quiz-layout-grid");
  if (!card || !toggle) return;
  var collapsed = card.classList.contains("collapsed");
  if (collapsed) {
    card.classList.remove("collapsed");
    if (title) title.style.display = "";
    if (body) body.style.display = "";
    card.style.padding = "";
    card.querySelector(".content-card-header").style.flexDirection = "";
    card.querySelector(".content-card-header").style.justifyContent = "";
    toggle.textContent = "▼";
    toggle.style.transform = "rotate(0deg)";
    if (grid) grid.style.gridTemplateColumns = "260px 1fr 260px";
    localStorage.setItem("quiz-territory-collapsed", "0");
  } else {
    card.classList.add("collapsed");
    if (title) title.style.display = "none";
    if (body) body.style.display = "none";
    card.style.padding = "0";
    var header = card.querySelector(".content-card-header");
    header.style.flexDirection = "column";
    header.style.justifyContent = "center";
    header.style.padding = "12px 0";
    toggle.textContent = "▶";
    toggle.style.transform = "rotate(0deg)";
    if (grid) grid.style.gridTemplateColumns = "36px 1fr 260px";
    localStorage.setItem("quiz-territory-collapsed", "1");
  }
}

function restoreTerritoryPanel() {
  var collapsed = localStorage.getItem("quiz-territory-collapsed") === "1";
  if (collapsed) {
    var card = document.getElementById("quiz-territory-card");
    var toggle = document.getElementById("quiz-territory-toggle");
    var title = card ? card.querySelector(".content-card-title") : null;
    var body = document.getElementById("quiz-territories");
    var grid = document.getElementById("quiz-layout-grid");
    if (card) {
      card.classList.add("collapsed");
      card.style.padding = "0";
      var header = card.querySelector(".content-card-header");
      if (header) {
        header.style.flexDirection = "column";
        header.style.justifyContent = "center";
        header.style.padding = "12px 0";
      }
    }
    if (title) title.style.display = "none";
    if (body) body.style.display = "none";
    if (toggle) toggle.textContent = "▶";
    if (grid) grid.style.gridTemplateColumns = "36px 1fr 260px";
  }
}

function renderQuizTerritories(territories, domains) {
  var el = document.getElementById("quiz-territories");
  if (!el) return;
  if (!territories.length) { el.innerHTML = '<div class="text-muted">暂无数据</div>'; return; }
  el.innerHTML = territories.map(function(t) {
    var name = t.domainName || ((domains.find(function(dd) { return dd.id === t.domainId; }) || {}).name) || ("领域 " + t.domainId);
    var answered = t.questionsAnswered || 0;
    var total = t.totalQuestions || 0;
    var accPct = answered > 0 ? Math.round((t.accuracy || 0) * 100) : 0;
    var progressPct = total > 0 ? Math.min(100, Math.round(answered / total * 100)) : 0;
    // 颜色按进度 HSL 平滑渐变：0% 红 → 50% 黄 → 100% 绿
    var hue = Math.round(progressPct * 1.2);
    var sat = progressPct === 0 ? 0 : 65;
    var bg = 'hsl(' + hue + ',' + sat + '%,95%)';
    var border = 'hsl(' + hue + ',' + sat + '%,55%)';
    var text = 'hsl(' + hue + ',' + sat + '%,35%)';
    var icon = progressPct === 0 ? "🔒" : progressPct < 50 ? "⏳" : progressPct < 100 ? "⚔️" : "✓";
    var statusText = progressPct === 0 ? "迷雾未开" : progressPct < 50 ? "初探" : progressPct < 80 ? "深入" : progressPct < 100 ? "将克" : "已征服";
    if (t.bossDefeated) { icon = "✓"; statusText = "已征服"; }
    return '<div class="territory-item" style="margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:' + bg + ';border:1px solid ' + border + ';border-left:4px solid ' + border + ';transition:all .2s" onclick="document.getElementById(\'quiz-domain-select\').value=\'' + t.domainId + '\'">' +
      '<div style="font-size:18px;width:24px;text-align:center">' + icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:600;font-size:13px;color:var(--text-primary)">' + name + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' +
          '<div style="flex:1;height:4px;background:rgba(0,0,0,0.08);border-radius:2px;overflow:hidden;min-width:30px">' +
            '<div style="height:100%;width:' + Math.max(progressPct, answered > 0 ? 4 : 0) + '%;background:' + border + ';border-radius:2px"></div>' +
          '</div>' +
          '<span style="font-size:10px;color:' + text + ';white-space:nowrap;font-weight:600">' + progressPct + '%</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;color:var(--text-secondary)">' +
          '<span>' + statusText + ' · ' + answered + '/' + total + '</span>' +
          '<span>' + (answered > 0 ? '准' + accPct + '%' : '—') + '</span>' +
        '</div>' +
      '</div></div>';
  }).join("");
}

async function startQuiz(mode) {
  quizState.mode = mode;
  quizState.domainId = parseInt(document.getElementById("quiz-domain-select").value) || null;
  quizState.combo = 0; quizState.maxCombo = 0; quizState.hp = 100;
  quizState.currentIdx = 0; quizState.answers = []; quizState.startTime = Date.now();

  try {
    var body = { mode: mode, count: (mode === "timed" || mode === "daily") ? 20 : 30 };
    if (quizState.domainId) body.domainId = quizState.domainId;
    quizState.questions = await apiPost("/quiz/set", body);
  } catch(e) { quizState.questions = await loadQuestions(quizState.domainId, 30); }

  if (!quizState.questions.length) { alert("该领域暂无题目"); return; }

  document.getElementById("quiz-mode-select").style.display = "none";
  document.getElementById("quiz-question-card").style.display = "";
  var names = {practice:"自由练习",sequence:"顺序通关",random:"随机挑战",timed:"限时速答",intensive:"强化训练",endless:"无尽模式",daily:"每日挑战"};
  document.getElementById("quiz-mode-label").textContent = names[mode];
  renderQuizSheet();
  showQuestion();
}

function renderQuizSheet() {
  var grid = document.getElementById("quiz-sheet-grid");
  if (!grid) return;
  grid.innerHTML = quizState.questions.map(function(q, i) {
    var histClass = '';
    if (q.answered === true) {
      histClass = q.lastCorrect === true ? ' hist-correct' : ' hist-wrong';
    }
    return '<div id="sheet-' + i + '" class="sheet-cell' + histClass + '" style="position:relative;width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--border-2);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;background:var(--bg-card);color:var(--text-1);transition:background .2s,border-color .2s,color .2s,transform .2s,outline .2s;user-select:none" onclick="quizState.currentIdx=' + i + ';showQuestion()">' + (i+1) + '</div>';
  }).join("");
}

function updateQuizSheet() {
  var i = quizState.currentIdx;
  var sheetCells = document.querySelectorAll("#quiz-sheet-grid [id^='sheet-']");
  if (!sheetCells.length) {
    sheetCells = document.querySelectorAll("[id^='sheet-']");
  }
  var answered = 0, correctCount = 0, wrongCount = 0;
  sheetCells.forEach(function(el) {
    var si = parseInt(el.id.replace("sheet-", ""));
    if (isNaN(si)) return;
    var ans = quizState.answers[si];
    var cell = el;
    if (!cell) return;
    if (ans) {
      answered++;
      var qa = quizState.questions[si];
      // 优先用会话内记录的判分结果（主观题自评没有字母可比对）
      var correct;
      if (qa && qa.answered === true) {
        correct = qa.lastCorrect === true;
      } else {
        var correctAns = (qa && qa.answer != null) ? String(qa.answer).trim().toUpperCase() : "";
        correct = correctAns !== "" && String(ans).trim().toUpperCase() === correctAns;
      }
      if (correct) {
        correctCount++;
        cell.style.background = "var(--success-2)";
        cell.style.borderColor = "var(--success-5)";
        cell.style.color = "var(--success-6)";
        cell.innerHTML = '<span style="font-size:14px;font-weight:700;line-height:1">✓</span>';
      } else {
        wrongCount++;
        cell.style.background = "var(--danger-2)";
        cell.style.borderColor = "var(--danger-5)";
        cell.style.color = "var(--danger-6)";
        cell.innerHTML = '<span style="font-size:14px;font-weight:700;line-height:1">✗</span>';
      }
      cell.dataset.answered = "1";
    } else {
      cell.style.background = "var(--bg-card)";
      cell.style.borderColor = "var(--border-2)";
      cell.style.color = "";
      cell.innerHTML = (si + 1);
      cell.dataset.answered = "";
    }
    var isCurrent = si === i;
    cell.style.fontWeight = isCurrent ? "700" : "600";
    cell.style.outline = isCurrent ? "2px solid var(--primary-5)" : "none";
    cell.style.outlineOffset = isCurrent ? "1px" : "0";
    cell.style.transform = isCurrent ? "scale(1.08)" : "scale(1)";
    cell.style.zIndex = isCurrent ? "2" : "1";
  });
  var prog = document.getElementById("quiz-sheet-progress");
  if (prog) {
    var total = quizState.questions.length || 0;
    var sessCorrect = 0, sessWrong = 0, histCorrect = 0, histWrong = 0, histAnswered = 0;
    quizState.questions.forEach(function(q, qi) {
      var sessAns = quizState.answers[qi];
      if (sessAns) {
        // 当前会话已答：以会话内判分结果为准（主观题自评无字母可比对）
        if (q.answered === true && q.lastCorrect === true) sessCorrect++;
        else if (q.answered !== true && q.answer && String(sessAns).toUpperCase() === String(q.answer).toUpperCase()) sessCorrect++;
        else sessWrong++;
      } else if (q.answered === true) {
        // 仅有历史记录
        histAnswered++;
        if (q.lastCorrect === true) histCorrect++; else histWrong++;
      }
    });
    var sessTotal = sessCorrect + sessWrong;
    prog.innerHTML = '<span style="color:var(--success-6);font-weight:600">' + sessCorrect + ' 答对</span>' +
      ' / <span style="color:var(--danger-6);font-weight:600">' + sessWrong + ' 答错</span>' +
      ' / ' + total +
      (histAnswered > 0 ? ' <span style="color:var(--text-3)">(历史 ' + histCorrect + '对/' + histWrong + '错)</span>' : '');
  }
}

function showQuestion() {
  var i = quizState.currentIdx;
  var q = quizState.questions[i];
  if (!q) return;
  document.getElementById("quiz-q-num").textContent = "第 " + (i+1) + "/" + quizState.questions.length + " 题";
  document.getElementById("quiz-q-source").textContent = q.source || q.examYear || "";
  var histEl = document.getElementById("quiz-q-history");
  if (histEl) {
    if (q.answered === true) {
      var ok = q.lastCorrect === true;
      histEl.innerHTML = '<span style="font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;' + (ok ? 'background:var(--success-2);color:var(--success-7)' : 'background:var(--danger-2);color:var(--danger-7)') + '">' + (ok ? '✓ 历史答对' : '✗ 历史答错') + '</span>';
    } else {
      histEl.innerHTML = '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--bg-surface-high);color:var(--text-3);font-weight:600">未答过</span>';
    }
  }
  updateFlagArea(q);
  var imgEl = document.getElementById("quiz-q-image");
  if (imgEl) {
    var html = (typeof renderQuestionImageHtml === "function") ? renderQuestionImageHtml(q.imageUrl) : "";
    imgEl.innerHTML = html;
    imgEl.style.display = html ? "" : "none";
  }
  var stemEl = document.getElementById("quiz-q-stem");
  stemEl.textContent = q.stem || "";
  var qType = q.type || "MCQ";
  var isSubjective = qType === "CASE" || qType === "ESSAY";
  stemEl.style.whiteSpace = isSubjective ? "pre-wrap" : "";
  document.getElementById("quiz-progress").textContent = (i+1) + "/" + quizState.questions.length;

  var answered = quizState.answers[i];
  var options = [];
  try { options = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch(e) {}
  if (!options.length && !isSubjective) options = ["A","B","C","D"];

  if (isSubjective) {
    renderSubjective(i, q, qType, !!answered);
    document.getElementById("quiz-feedback").style.display = answered ? "" : "none";
    document.getElementById("quiz-next-btn").style.display = answered ? "" : "none";
    document.getElementById("quiz-finish-btn").style.display = (answered && i === quizState.questions.length - 1) ? "" : "none";
    updateQuizSheet();
    updateQuizHUD();
    startQuestionTimer(answered);
    return;
  }

  document.getElementById("quiz-options").innerHTML = options.map(function(opt, oi) {
    var letter = String.fromCharCode(65 + oi);
    var cls = "";
    if (answered) {
      if (letter === q.answer) cls = "background:#e2f5eb;border-color:#8dd8b3";
      else if (letter === answered) cls = "background:#feeced;border-color:#fa9ea3";
      else cls = "opacity:0.5";
    }
    return '<button class="quiz-option" data-letter="' + letter + '" style="padding:12px 16px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-card);cursor:pointer;text-align:left;font-size:14px;transition:all .15s;' + cls + '" ' + (answered ? "disabled" : "") + ' onclick="selectAnswer(' + i + ',\'' + letter + '\')"><strong>' + letter + '.</strong> ' + opt + '</button>';
  }).join("");

  document.getElementById("quiz-feedback").style.display = answered ? "" : "none";
  document.getElementById("quiz-next-btn").style.display = answered ? "" : "none";
  document.getElementById("quiz-finish-btn").style.display = (answered && i === quizState.questions.length - 1) ? "" : "none";

  updateQuizSheet();
  updateQuizHUD();
  startQuestionTimer(answered);
}

/* ===== 题目问题打标 ===== */
var FLAG_TYPES = [
  { code: "INCOMPLETE_STEM", name: "题干不全" },
  { code: "MISSING_IMAGE", name: "缺图/图失效" },
  { code: "BROKEN_OPTIONS", name: "选项不全" },
  { code: "WRONG_ANSWER", name: "答案错误" },
  { code: "MISSING_ANALYSIS", name: "解析缺失" },
  { code: "OTHER", name: "其他" }
];
var flagSelectedType = null;

function flagTypeName(code) {
  var t = FLAG_TYPES.find(function(x) { return x.code === code; });
  return t ? t.name : code;
}

function currentQuizQuestion() {
  return quizState.questions[quizState.currentIdx];
}

// 刷新题目卡片头部的标记按钮状态
function updateFlagArea(q) {
  var area = document.getElementById("quiz-flag-area");
  if (!area) return;
  hideFlagPanel();
  if (q && q.flagType) {
    area.innerHTML = '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--danger-2);color:var(--danger-6);font-weight:600;cursor:pointer" title="点击取消标记，恢复该题" onclick="unflagCurrent()">🚩 已标记·' + flagTypeName(q.flagType) + ' ✕</span>';
  } else {
    area.innerHTML = '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--bg-surface-high);color:var(--text-3);font-weight:600;cursor:pointer" title="信息不完整？标记后不再出现" onclick="toggleFlagPanel()">🚩 标记问题</span>';
  }
}

function hideFlagPanel() {
  var panel = document.getElementById("quiz-flag-panel");
  if (panel) { panel.style.display = "none"; panel.innerHTML = ""; }
  flagSelectedType = null;
}

function toggleFlagPanel() {
  var panel = document.getElementById("quiz-flag-panel");
  if (!panel) return;
  if (panel.style.display !== "none") { hideFlagPanel(); return; }
  flagSelectedType = null;
  var btns = FLAG_TYPES.map(function(t) {
    return '<button type="button" data-flag-type="' + t.code + '" onclick="selectFlagType(this)" style="padding:6px 12px;border:1px solid var(--border-2);border-radius:6px;background:var(--bg-card);cursor:pointer;font-size:12px">' + t.name + '</button>';
  }).join("");
  panel.innerHTML =
    '<div style="font-size:13px;font-weight:600;color:var(--danger-6);margin-bottom:8px">🚩 标记本题（标记后将不再出现在抽题范围）</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + btns + '</div>' +
    '<input id="quiz-flag-note" placeholder="备注（可选），如：缺少图3" style="width:100%;padding:6px 10px;border:1px solid var(--border-2);border-radius:6px;font-size:12px;margin-bottom:8px" />' +
    '<div style="display:flex;gap:8px">' +
      '<button onclick="submitFlag()" style="padding:6px 16px;background:var(--danger-5);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px">确认标记</button>' +
      '<button onclick="hideFlagPanel()" style="padding:6px 16px;background:var(--bg-card);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;font-size:12px">取消</button>' +
    '</div>';
  panel.style.display = "";
}

function selectFlagType(btn) {
  flagSelectedType = btn.getAttribute("data-flag-type");
  var panel = document.getElementById("quiz-flag-panel");
  if (!panel) return;
  panel.querySelectorAll("button[data-flag-type]").forEach(function(b) {
    var on = b === btn;
    b.style.background = on ? "var(--danger-5)" : "var(--bg-card)";
    b.style.color = on ? "#fff" : "";
    b.style.borderColor = on ? "var(--danger-5)" : "var(--border-2)";
  });
}

async function submitFlag() {
  var q = currentQuizQuestion();
  if (!q || !q.id) return;
  if (!flagSelectedType) { alert("请先选择问题类型"); return; }
  var note = "";
  var noteEl = document.getElementById("quiz-flag-note");
  if (noteEl) note = noteEl.value.trim();
  try {
    await apiPost("/questions/" + q.id + "/flag", { type: flagSelectedType, note: note });
    q.flagType = flagSelectedType;
    q.flagNote = note;
    updateFlagArea(q);
  } catch (e) {
    alert("标记失败：" + e.message);
  }
}

async function unflagCurrent() {
  var q = currentQuizQuestion();
  if (!q || !q.id) return;
  try {
    await apiDelete("/questions/" + q.id + "/flag");
    q.flagType = null;
    q.flagNote = null;
    updateFlagArea(q);
  } catch (e) {
    alert("取消标记失败：" + e.message);
  }
}

function startQuestionTimer(answered) {
  if (quizState.timer) { clearInterval(quizState.timer); quizState.timer = null; }
  var timerEl = document.getElementById("quiz-timer");
  var cur = quizState.questions[quizState.currentIdx];
  var subjective = cur && (cur.type === "CASE" || cur.type === "ESSAY");
  if (quizState.mode === "timed" && !answered && !subjective) {
    var remaining = 30;
    if (timerEl) {
      timerEl.style.display = "";
      timerEl.textContent = "⏱ " + remaining + "s";
    }
    quizState.timer = setInterval(function() {
      remaining--;
      if (timerEl) timerEl.textContent = "⏱ " + remaining + "s";
      if (remaining <= 5 && timerEl) timerEl.style.background = "var(--danger-5)";
      if (remaining <= 0) {
        clearInterval(quizState.timer);
        quizState.timer = null;
        var idx = quizState.currentIdx;
        if (!quizState.answers[idx]) {
          var q = quizState.questions[idx];
          var wrongAns = "A";
          if (q && q.answer) {
            var opts = ["A","B","C","D"];
            wrongAns = opts.find(function(o) { return o !== q.answer; }) || "A";
          }
          selectAnswer(idx, wrongAns);
        }
      }
    }, 1000);
  } else {
    if (timerEl) timerEl.style.display = "none";
  }
}

/* ===== 主观题（案例 CASE / 论文 ESSAY）作答与自评 ===== */
function subjectTypeName(t) { return t === "ESSAY" ? "论文题" : "案例分析"; }

function renderSubjective(i, q, qType, answered) {
  var el = document.getElementById("quiz-options");
  if (!el) return;
  var parts = [];
  try { parts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch(e) {}
  if (!Array.isArray(parts)) parts = [];

  var html = '<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
    '<span style="font-size:11px;padding:2px 10px;border-radius:10px;background:var(--primary-1);color:var(--primary-6);font-weight:600">' + subjectTypeName(qType) + '</span>' +
    '<span style="font-size:12px;color:var(--text-secondary)">作答后对照参考答案自评（AI 批改即将接入）</span></div>';

  if (qType === "CASE") {
    // 小问列表 + 每问作答框
    parts.forEach(function(p, k) {
      html += '<div style="margin-bottom:12px;padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-surface,#fafafa)">' +
        '<div style="font-weight:600;font-size:14px;margin-bottom:8px">问题' + (p.no || (k + 1)) + (p.score ? '（' + p.score + '分）' : '') + '：' + escMem(p.q || p.question || "") + '</div>' +
        subjectiveAnswerBox(i, k, answered) +
        '</div>';
    });
  } else {
    // 论文：写作要求 + 大作答框
    if (parts.length) {
      html += '<div style="padding:10px 12px;border-left:3px solid var(--primary-5);background:var(--primary-1);border-radius:6px;margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:4px">写作要求</div>' +
        parts.map(function(p) { return '<div style="font-size:12px;color:var(--text-2);margin:3px 0">· <strong>' + escMem(p.label || '') + '</strong> ' + escMem(p.req || p.requirement || String(p)) + '</div>'; }).join("") +
        '</div>';
    }
    html += subjectiveAnswerBox(i, 0, answered, true);
  }

  // 未作答：提交按钮；已作答：参考答案 + 评分标准 + 自评结果
  if (!answered) {
    html += '<div style="margin-top:14px;display:flex;gap:10px">' +
      '<button onclick="revealSubjectiveAnswer(' + i + ')" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">提交作答，对照参考答案</button>' +
      '<button onclick="revealSubjectiveAnswer(' + i + ',true)" style="padding:10px 24px;background:var(--bg-card);border:1px solid var(--border-2);border-radius:8px;cursor:pointer">略过作答，直接看答案</button>' +
      '</div>';
  } else {
    html += subjectiveReviewPanel(i, q);
  }
  el.innerHTML = html;
}

function subjectiveAnswerBox(i, k, answered, isEssay) {
  if (answered) {
    var mine = (quizState.subjectiveAnswers || {})[i + "-" + k];
    return '<div style="font-size:13px;line-height:1.7;padding:10px;border-radius:6px;background:var(--bg-card);border:1px dashed var(--border-2);white-space:pre-wrap">' +
      (mine ? '我的作答：' + escMem(mine) : '<span style="color:var(--text-3)">（本次未作答，直接查看了参考答案）</span>') + '</div>';
  }
  return '<textarea id="subq-' + i + '-' + k + '" placeholder="' + (isEssay ? "写下论文提纲或全文（建议先写摘要+四段式提纲）..." : "写下你的答案要点...") + '" style="width:100%;min-height:' + (isEssay ? 180 : 80) + 'px;padding:10px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;line-height:1.7;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>';
}

function subjectiveReviewPanel(i, q) {
  var grade = quizState.answers[i];
  var gradeNames = { SELF_PASS: "✓ 已掌握", SELF_PARTIAL: "◐ 部分掌握", SELF_FAIL: "✗ 未掌握" };
  var gradeColors = { SELF_PASS: "var(--success-2);color:var(--success-7)", SELF_PARTIAL: "var(--warning-1,#fef7e6);color:var(--warning-6,#b45309)", SELF_FAIL: "var(--danger-2);color:var(--danger-7)" };
  var answerText = q.answer || "暂无参考答案";
  var isMarkdownAnswer = /(^|\n)#{1,3}\s|(^|\n)\|.*\||\*\*.+?\*\*/.test(answerText);
  var answerHtml = isMarkdownAnswer
    ? '<div class="material-body" style="font-size:13px;line-height:1.9;color:var(--text-primary)">' + simpleMarkdown(answerText) + '</div>'
    : '<div style="font-size:13px;line-height:1.9;white-space:pre-wrap;color:var(--text-primary)">' + escMem(answerText) + '</div>';
  var html = '<div style="margin-top:14px;padding:14px;border-radius:8px;border:1px solid var(--success-5,#34d399);background:var(--success-1,#f0fdf4)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
    '<div style="font-weight:600;font-size:14px;color:var(--success-6,#059669)">参考答案要点</div>' +
    (grade ? '<span style="font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;background:' + (gradeColors[grade] || "") + '">自评：' + (gradeNames[grade] || grade) + '</span>' : '') +
    '</div>' +
    answerHtml +
    (q.analysis ? '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-2);font-size:12px;line-height:1.8;color:var(--text-2)"><strong>评分标准：</strong>' + escMem(q.analysis) + '</div>' : '') +
    '</div>';
  return html;
}

function revealSubjectiveAnswer(i, skipWriting) {
  var q = quizState.questions[i];
  if (!q || quizState.answers[i]) return;
  // 收集作答文本
  quizState.subjectiveAnswers = quizState.subjectiveAnswers || {};
  var qType = q.type || "MCQ";
  var boxes = document.querySelectorAll('textarea[id^="subq-' + i + '-"]');
  if (qType === "ESSAY") {
    quizState.subjectiveAnswers[i + "-0"] = boxes[0] ? boxes[0].value.trim() : "";
  } else {
    boxes.forEach(function(b) {
      var k = b.id.replace("subq-" + i + "-", "");
      quizState.subjectiveAnswers[i + "-" + k] = b.value.trim();
    });
  }
  // 展示参考答案 + 三档自评按钮（尚未提交自评）
  var el = document.getElementById("quiz-options");
  if (!el) return;
  var html = '<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
    '<span style="font-size:11px;padding:2px 10px;border-radius:10px;background:var(--primary-1);color:var(--primary-6);font-weight:600">' + subjectTypeName(qType) + '</span></div>';
  // 保留我的作答展示
  var keys = Object.keys(quizState.subjectiveAnswers).filter(function(k) { return k.indexOf(i + "-") === 0; });
  keys.forEach(function(k) {
    var v = quizState.subjectiveAnswers[k];
    html += '<div style="font-size:13px;line-height:1.7;padding:10px;border-radius:6px;background:var(--bg-card);border:1px dashed var(--border-2);margin-bottom:8px;white-space:pre-wrap">' +
      (v ? '我的作答：' + escMem(v) : '<span style="color:var(--text-3)">（本次未作答）</span>') + '</div>';
  });
  html += subjectiveReviewPanel(i, Object.assign({}, q, { answer: q.answer }));
  html += '<div style="margin-top:14px;padding:12px;border-radius:8px;background:var(--bg-surface-high,#f5f5f5);border:1px solid var(--border-2)">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">对照参考答案，给自己评分：</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button onclick="selectSelfGrade(' + i + ',\'SELF_PASS\')" style="padding:8px 20px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">✓ 完全掌握</button>' +
    '<button onclick="selectSelfGrade(' + i + ',\'SELF_PARTIAL\')" style="padding:8px 20px;background:var(--warning-5,#f59e0b);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">◐ 部分掌握</button>' +
    '<button onclick="selectSelfGrade(' + i + ',\'SELF_FAIL\')" style="padding:8px 20px;background:var(--danger-5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">✗ 未掌握</button>' +
    '</div></div>';
  el.innerHTML = html;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectSelfGrade(idx, grade) {
  if (quizState.answers[idx]) return;
  quizState.answers[idx] = grade;
  var q = quizState.questions[idx];
  var correct = grade === "SELF_PASS";
  if (correct) { quizState.combo++; if (quizState.combo > quizState.maxCombo) quizState.maxCombo = quizState.combo; }
  else { quizState.combo = 0; quizState.hp = Math.max(0, quizState.hp - 10); }
  q.answered = true;
  q.lastCorrect = correct;

  var fb = document.getElementById("quiz-feedback");
  var gradeText = grade === "SELF_PASS" ? "完全掌握，继续征伐！" : grade === "SELF_PARTIAL" ? "部分掌握，建议记入错题巩固要点。" : "未掌握，重点攻克后开启 AI 批改强化。";
  fb.style.display = "";
  fb.style.background = correct ? "var(--success-1)" : "var(--danger-2)";
  fb.style.color = correct ? "var(--success-6)" : "var(--danger-6)";
  fb.innerHTML = (correct ? "自评：完全掌握！" : grade === "SELF_PARTIAL" ? "自评：部分掌握" : "自评：未掌握") + " " + gradeText;

  document.getElementById("quiz-next-btn").style.display = "";
  if (idx === quizState.questions.length - 1) {
    document.getElementById("quiz-next-btn").style.display = "none";
    document.getElementById("quiz-finish-btn").style.display = "";
  }
  updateQuizSheet();
  updateQuizHUD();
  showQuestion();

  if (q.id) {
    apiPost("/quiz/answer", { questionId: q.id, userAnswer: grade }).then(function(res) {
      if (res && res.answerRecordId) {
        quizState.answerRecordIds = quizState.answerRecordIds || {};
        quizState.answerRecordIds[idx] = res.answerRecordId;
      }
    }).catch(function(e) { console.warn("self-grade submit failed", e); });
  }
}

function selectAnswer(idx, letter) {
  if (quizState.answers[idx]) return;
  quizState.answers[idx] = letter;
  var q = quizState.questions[idx];
  var correct = letter === q.answer;
  if (correct) { quizState.combo++; if (quizState.combo > quizState.maxCombo) quizState.maxCombo = quizState.combo; }
  else { quizState.combo = 0; quizState.hp = Math.max(0, quizState.hp - 10); }
  // 同步更新 questions 数组的答题状态，让进度统计包含当前会话
  q.answered = true;
  q.lastCorrect = correct;

  var fb = document.getElementById("quiz-feedback");
  fb.style.display = "";
  fb.style.background = correct ? "var(--success-1)" : "var(--danger-2)";
  fb.style.color = correct ? "var(--success-6)" : "var(--danger-6)";
  fb.innerHTML = correct ? ("正确！" + (q.analysis ? "<br><small>" + q.analysis + "</small>" : "")) : ("错误！正确答案是 <strong>" + q.answer + "</strong>" + (q.analysis ? "<br><small>" + q.analysis + "</small>" : ""));

  if (!correct) {
    fb.innerHTML += '<div id="ai-tutor-area" style="margin-top:10px"><button id="ai-tutor-btn" onclick="requestAiTutor(' + q.id + ',\'' + letter + '\')" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">🤖 AI 辅导</button></div>';
  }

  document.getElementById("quiz-next-btn").style.display = "";
  if (idx === quizState.questions.length - 1) {
    document.getElementById("quiz-next-btn").style.display = "none";
    document.getElementById("quiz-finish-btn").style.display = "";
  }
  updateQuizSheet();
  updateQuizHUD();
  showQuestion();

  if (q.id) {
    apiPost("/quiz/answer", { questionId: q.id, userAnswer: letter }).then(function(res) {
      if (res && res.answerRecordId) {
        quizState.answerRecordIds = quizState.answerRecordIds || {};
        quizState.answerRecordIds[idx] = res.answerRecordId;
      }
      if (res && res.memory) {
        if (res.memory.state === "mastered") {
          var mc = document.getElementById("mem-mastered-" + q.id);
          if (mc) mc.style.display = "";
        }
      }
    }).catch(function(e) { console.warn("answer submit failed", e); });
  }
}

async function requestAiTutor(questionId, userAnswer) {
  var btn = document.getElementById("ai-tutor-btn");
  var area = document.getElementById("ai-tutor-area");
  if (btn) { btn.disabled = true; btn.textContent = "AI 分析中..."; }
  if (area) area.innerHTML = '<div style="padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--primary-3)"><div class="spinner" style="margin:0 auto;width:24px;height:24px;border:3px solid var(--border-2);border-top-color:var(--primary-6);border-radius:50%;animation:spin 0.8s linear infinite"></div><p class="text-muted" style="text-align:center;margin-top:8px">AI 正在分析错因...</p></div>';
  try {
    var recordId = null;
    if (quizState.answerRecordIds && quizState.answerRecordIds[quizState.currentIdx]) {
      recordId = quizState.answerRecordIds[quizState.currentIdx];
    }
    if (!recordId) {
      var answerRes = await apiPost("/quiz/answer", { questionId: questionId, userAnswer: userAnswer });
      recordId = answerRes ? answerRes.answerRecordId : null;
    }
    if (!recordId) throw new Error("无法获取答题记录");
    var tutor = await apiPost("/tutor/explain", { answerRecordId: recordId });
    var html = formatTutorCard(tutor);
    if (area) area.innerHTML = html;
  } catch(e) {
    if (area) area.innerHTML = '<div style="padding:12px;background:var(--danger-1);border-radius:8px;border:1px solid var(--danger-5);color:var(--danger-6)">AI 辅导暂时不可用: ' + escMem(e.message) + '<br><button onclick="requestAiTutor(' + questionId + ',\'' + userAnswer + '\')" style="margin-top:8px;padding:6px 12px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer">重试</button></div>';
  }
}

function formatTutorCard(tutor) {
  var html = '<div style="padding:16px;background:var(--bg-card);border-radius:10px;border:1px solid var(--primary-3)">';
  // 头部：错因标签 + 置信度 + 状态
  html += '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px dashed var(--border-2)">';
  if (tutor.errorTypeLabel) {
    html += '<span style="font-size:12px;padding:4px 12px;border-radius:12px;background:var(--warning-1);color:var(--warning-6);font-weight:600">⚠ 错因: ' + escMem(tutor.errorTypeLabel) + '</span>';
  }
  if (tutor.confidence && !tutor.degraded) {
    var pct = Math.round(tutor.confidence * 100);
    html += '<span style="font-size:12px;padding:4px 10px;border-radius:12px;background:var(--primary-1);color:var(--primary-6);font-weight:600">置信度 ' + pct + '%</span>';
  }
  if (tutor.cached) html += '<span class="text-muted" style="font-size:12px">📦 缓存</span>';
  if (tutor.degraded) html += '<span class="text-muted" style="font-size:12px">⚠ 降级模式</span>';
  html += '</div>';
  // 内容：分段显示
  var explanation = tutor.explanation || "暂无解析";
  html += '<div style="font-size:14px;line-height:1.85;color:var(--text-primary)">' + formatTutorExplanation(explanation) + '</div>';
  html += '</div>';
  return html;
}

function formatTutorExplanation(text) {
  var safe = escMem(text);
  // 按换行符分段
  var lines = safe.split(/\n+/);
  // 如果只有一段且较长，按关键连接词进一步分段
  if (lines.length === 1 && lines[0].length > 80) {
    lines = [lines[0]];
    var segs = lines[0].split(/(?=首先|其次|然后|最后|另外|此外|因此|建议[^将]|结合你|注意)/);
    if (segs.length > 1) lines = segs;
  }
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    // 识别序号开头的段落（1. 2. 首先 其次 最后 等）
    if (/^(首先|其次|然后|最后|另外|此外|因此|建议|注意)/.test(line) || /^\d+[.、）)]/.test(line)) {
      html += '<p style="margin:10px 0 6px;padding-left:10px;border-left:3px solid var(--primary-4)">' + highlightKeywords(line) + '</p>';
    } else {
      html += '<p style="margin:8px 0">' + highlightKeywords(line) + '</p>';
    }
  }
  return html || safe;
}

function highlightKeywords(text) {
  // 高亮"正确答案"相关关键词
  return text
    .replace(/(正确答案[是为：:]*\s*[A-D]+)/g, '<strong style="color:var(--success-6)">$1</strong>')
    .replace(/(你选了\s*[A-D])/g, '<strong style="color:var(--danger-6)">$1</strong>')
    .replace(/(建议[^。！]+。)/g, '<strong style="color:var(--primary-6)">$1</strong>');
}

function nextQuestion() {
  quizState.currentIdx++;
  if (quizState.currentIdx >= quizState.questions.length) {
    if (quizState.mode === "endless") {
      loadMoreQuestions();
      return;
    }
    finishQuiz();
    return;
  }
  document.getElementById("quiz-feedback").style.display = "none";
  document.getElementById("quiz-next-btn").style.display = "none";
  document.getElementById("quiz-finish-btn").style.display = "none";
  showQuestion();
}

async function loadMoreQuestions() {
  var body = { mode: "endless", count: 20 };
  if (quizState.domainId) body.domainId = quizState.domainId;
  try {
    var more = await apiPost("/quiz/set", body);
    if (more && more.length) {
      quizState.questions = quizState.questions.concat(more);
      renderQuizSheet();
      document.getElementById("quiz-feedback").style.display = "none";
      document.getElementById("quiz-next-btn").style.display = "none";
      document.getElementById("quiz-finish-btn").style.display = "none";
      showQuestion();
    } else {
      finishQuiz();
    }
  } catch(e) {
    finishQuiz();
  }
}

function updateQuizHUD() {
  var hpBar = document.getElementById("quiz-hp-bar");
  var comboBar = document.getElementById("quiz-combo-bar");
  var hpText = document.getElementById("quiz-hp-text");
  var comboText = document.getElementById("quiz-combo-text");
  if (hpBar) hpBar.style.width = quizState.hp + "%";
  if (hpText) hpText.textContent = quizState.hp;
  if (comboBar) comboBar.style.width = Math.min(100, quizState.combo * 5) + "%";
  if (comboText) comboText.textContent = "Combo x" + quizState.combo;
}

async function finishQuiz() {
  var correct = quizState.questions.filter(function(q, i) {
    if (!quizState.answers[i]) return false;
    if (q.answered === true) return q.lastCorrect === true; // 主观题自评/已判分
    return String(quizState.answers[i]).toUpperCase() === String(q.answer || "").toUpperCase();
  }).length;
  var total = quizState.questions.length;
  var accuracy = total ? correct / total : 0;
  var elapsed = Math.round((Date.now() - quizState.startTime) / 1000);

  document.getElementById("quiz-question-card").innerHTML = '<div class="content-card-header"><div class="content-card-title">战斗结束</div></div><div class="content-card-body" style="text-align:center"><div style="font-size:48px;font-weight:700;color:' + (accuracy >= 0.6 ? "var(--success-5)" : "var(--danger-5)") + '">' + Math.round(accuracy*100) + '%</div><div style="margin-top:8px">' + correct + ' / ' + total + ' 题正确</div><div>最大连击: ' + quizState.maxCombo + '</div><div>用时: ' + elapsed + '秒</div><div style="margin-top:16px"><button onclick="navigate(\'quiz\')" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">再来一局</button><button onclick="navigate(\'dashboard\')" style="padding:10px 24px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;margin-left:8px">返回大厅</button></div></div>';

  try {
    await apiPost("/game/quiz/result", { correct: correct, total: total, accuracy: accuracy, maxCombo: quizState.maxCombo, domainId: quizState.domainId, mode: quizState.mode });
    var gs = await apiGet("/game/state");
    if (gs) { state.hp = gs.hp; state.exp = gs.exp; state.level = gs.level; state.coin = gs.coin; updateHUD(); }
  } catch(e) {}
}

async function startBossBattle() {
  var domainId = parseInt(document.getElementById("quiz-domain-select").value);
  if (!domainId) { alert("请先选择领域"); return; }
  try { await fetch(API + "/game/boss/" + domainId + "/can-battle"); }
  catch(e) { alert("Boss 尚未解锁，需要准确率 >= 80%"); return; }
  quizState.mode = "boss";
  quizState.domainId = domainId;
  await startQuiz("boss");
}

/* ===== Memory Forge ===== */
var memCards = [], memIdx = 0;

function escMem(s) {
  if (s == null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmtDate(s) {
  if (!s) return "待安排";
  var d = new Date(s);
  if (isNaN(d)) return s;
  return (d.getMonth()+1) + "月" + d.getDate() + "日";
}

async function renderMemory(c) {
  var stats = {total: 0, due: 0, mastered: 0, newCount: 0};
  try { stats = await apiGet("/memory/stats"); } catch(e) {}
  memCards = [];
  try { memCards = await apiGet("/memory/cards"); } catch(e) { memCards = []; }
  memIdx = 0;

  var dueCount = stats.due || 0;
  var masteredCount = stats.mastered || 0;
  var learningCount = stats.learning || 0;
  var totalCount = stats.total || memCards.length;
  var newCount = stats.new || stats.newCount || 0;

  c.innerHTML = '<div class="page-title">记忆熔炉</div>' +
    '<div class="page-subtitle">间隔重复 · 知识锻造 · SM-2 算法</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="flex-between">' +
        '<div style="display:flex;gap:28px;flex-wrap:wrap">' +
          '<div><span class="text-muted">总卡片</span><br><strong style="font-size:22px">' + totalCount + '</strong></div>' +
          '<div><span class="text-muted">待复习</span><br><strong style="font-size:22px;color:var(--warning-5)">' + dueCount + '</strong></div>' +
          '<div><span class="text-muted">学习中</span><br><strong style="font-size:22px;color:var(--primary-5)">' + learningCount + '</strong></div>' +
          '<div><span class="text-muted">已掌握</span><br><strong style="font-size:22px;color:var(--success-5)">' + masteredCount + '</strong></div>' +
          '<div><span class="text-muted">新卡</span><br><strong style="font-size:22px;color:var(--text-3)">' + newCount + '</strong></div>' +
        '</div>' +
        '<button onclick="addMemoryCard()" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap">+ 添加卡片</button>' +
      '</div>' +
      '<div class="content-card" id="memory-card-display"></div>' +
      '<div class="content-card" id="memory-list-display"></div>' +
    '</div>';
  renderMemoryCard();
  renderMemoryList();
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
    el.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>🎉 本轮复习完成！</p><p class="text-muted">下次复习时间已由 SM-2 算法自动安排</p><button onclick="navigate(\'memory\')" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">刷新</button></div>';
    return;
  }
  var stateLabel = card.state === "mastered" ? "已掌握" : (card.state === "learning" ? "学习中" : "新卡");
  var stateColor = card.state === "mastered" ? "var(--success-5)" : (card.state === "learning" ? "var(--warning-5)" : "var(--text-3)");
  var interval = card.intervalDays || 1;
  var streak = card.streak || 0;
  var wrongCount = card.wrongCount || 0;
  var correctCount = card.correctCount || 0;
  var nextReview = fmtDate(card.nextReviewAt);
  var ease = card.easeFactor ? Number(card.easeFactor).toFixed(2) : "2.50";
  var prevDisabled = memIdx === 0;
  var nextDisabled = memIdx >= memCards.length - 1;
  var prevStyle = prevDisabled ? "opacity:.4;cursor:not-allowed" : "cursor:pointer";
  var nextStyle = nextDisabled ? "opacity:.4;cursor:not-allowed" : "cursor:pointer";

  var isQuestionCard = card.questionStem != null;
  var frontHtml, backHtml, cardTypeLabel;

  if (isQuestionCard) {
    cardTypeLabel = "错题知识点";
    var options = [];
    try { options = JSON.parse(card.questionOptions || "[]"); } catch(e) { options = []; }
    var optionsHtml = options.map(function(opt, i) {
      var letter = String.fromCharCode(65 + i);
      return '<div style="text-align:left;padding:8px 12px;margin:4px 0;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-1)"><strong style="color:var(--primary-6)">' + letter + '.</strong> ' + escMem(opt) + '</div>';
    }).join("");
    var domainTag = card.domainName ? '<span style="font-size:11px;padding:2px 10px;border-radius:10px;background:var(--primary-5);color:#fff;display:inline-block;margin-bottom:10px">' + escMem(card.domainName) + '</span>' : '';
    frontHtml = '<div style="text-align:left;width:100%">' +
      domainTag +
      '<div style="font-size:15px;font-weight:600;margin-bottom:12px;line-height:1.7">' + escMem(card.questionStem) + '</div>' +
      '<div style="font-size:12px;color:var(--text-3);margin-bottom:6px">请思考正确答案，然后翻转卡片查看解析</div>' +
      optionsHtml +
    '</div>';
    backHtml = '<div style="text-align:left;width:100%">' +
      '<div style="margin-bottom:16px;text-align:center"><span style="font-size:16px;padding:6px 20px;border-radius:10px;background:var(--success-5);color:#fff;font-weight:700">✅ 正确答案: ' + escMem(card.questionAnswer || "") + '</span></div>' +
      '<div style="font-size:13px;color:var(--text-3);margin-bottom:8px;font-weight:600">📝 知识点解析</div>' +
      '<div style="font-size:14px;line-height:1.8;background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border-1)">' + escMem(card.questionAnalysis || "暂无解析") + '</div>' +
    '</div>';
  } else {
    cardTypeLabel = "自定义知识点";
    frontHtml = '<div style="text-align:left;width:100%;font-size:16px;font-weight:600;line-height:1.7">' + escMem(card.question || "无问题") + '</div>';
    backHtml = '<div style="text-align:left;width:100%"><div style="font-size:13px;color:var(--text-3);margin-bottom:8px;font-weight:600">📝 知识点</div><div style="font-size:15px;line-height:1.8">' + escMem(card.answer || "无答案") + '</div></div>';
  }

  el.innerHTML = '<div class="content-card-header">' +
      '<div class="content-card-title">' + cardTypeLabel + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span style="font-size:12px;padding:2px 10px;border-radius:12px;background:' + stateColor + ';color:#fff">' + stateLabel + '</span>' +
        '<span class="text-muted">' + (memIdx+1) + ' / ' + memCards.length + '</span>' +
        '<button onclick="memPrev()" ' + (prevDisabled?'disabled':'') + ' style="padding:4px 12px;border:1px solid var(--border-2);border-radius:6px;background:var(--bg-card);' + prevStyle + '">← 上一张</button>' +
        '<button onclick="memNext()" ' + (nextDisabled?'disabled':'') + ' style="padding:4px 12px;border:1px solid var(--border-2);border-radius:6px;background:var(--bg-card);' + nextStyle + '">下一张 →</button>' +
      '</div>' +
    '</div>' +
    '<div class="content-card-body" style="text-align:center">' +
      '<div class="text-muted" style="margin-bottom:14px">点击卡片翻转查看解析</div>' +
      '<div id="memory-flashcard" style="margin:0 auto;width:100%;max-width:640px;min-height:280px;max-height:520px;perspective:1000px;cursor:pointer" onclick="flipCard()">' +
        '<div id="memory-card-inner" style="position:relative;width:100%;min-height:280px;max-height:520px;transition:transform .6s;transform-style:preserve-3d">' +
          '<div style="position:absolute;inset:0;backface-visibility:hidden;background:var(--bg-surface-high);border:2px solid var(--border-2);border-radius:12px;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto;word-break:break-word;white-space:pre-wrap;text-align:left;line-height:1.7" id="mem-front">' + frontHtml + '</div>' +
          '<div style="position:absolute;inset:0;backface-visibility:hidden;background:var(--primary-1);border:2px solid var(--primary-3);border-radius:12px;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto;word-break:break-word;white-space:pre-wrap;text-align:left;line-height:1.7;transform:rotateY(180deg)" id="mem-back">' + backHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="memory-actions" style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap">' +
        '<button onclick="rateMemory(0,' + card.id + ')" style="padding:10px 24px;border:1px solid var(--danger-5);border-radius:8px;background:var(--danger-2);color:var(--danger-6);cursor:pointer;font-weight:600">😰 忘记了</button>' +
        '<button onclick="rateMemory(1,' + card.id + ')" style="padding:10px 24px;border:1px solid var(--warning-5);border-radius:8px;background:var(--warning-1);color:var(--warning-6);cursor:pointer;font-weight:600">🤔 模糊</button>' +
        '<button onclick="rateMemory(2,' + card.id + ')" style="padding:10px 24px;border:1px solid var(--success-5);border-radius:8px;background:var(--success-1);color:var(--success-6);cursor:pointer;font-weight:600">😎 认识</button>' +
      '</div>' +
      '<div style="display:flex;gap:20px;justify-content:center;margin-top:16px;flex-wrap:wrap">' +
        '<span class="text-muted">📅 下次复习: <strong>' + nextReview + '</strong></span>' +
        '<span class="text-muted">⏱️ 间隔: <strong>' + interval + '天</strong></span>' +
        '<span class="text-muted">🔥 连续: <strong>' + streak + '</strong></span>' +
        '<span class="text-muted">✅ 正确: <strong>' + correctCount + '</strong></span>' +
        '<span class="text-muted">❌ 错误: <strong>' + wrongCount + '</strong></span>' +
        '<span class="text-muted">📈 难度: <strong>' + ease + '</strong></span>' +
      '</div>' +
    '</div>';
}

function memPrev() {
  if (memIdx > 0) { memIdx--; renderMemoryCard(); }
}

function memNext() {
  if (memIdx < memCards.length - 1) { memIdx++; renderMemoryCard(); }
}

function renderMemoryList() {
  var el = document.getElementById("memory-list-display");
  if (!el) return;
  if (!memCards.length) { el.innerHTML = ""; return; }
  var rows = memCards.map(function(card, i) {
    var stateLabel = card.state === "mastered" ? "已掌握" : (card.state === "learning" ? "学习中" : "新卡");
    var stateColor = card.state === "mastered" ? "var(--success-5)" : (card.state === "learning" ? "var(--warning-5)" : "var(--text-3)");
    var q = escMem(card.questionStem || card.question || "无问题");
    var qShort = q.length > 60 ? q.substring(0, 60) + "…" : q;
    var active = i === memIdx;
    var typeTag = card.questionStem ? '<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:var(--primary-3);color:#fff;flex-shrink:0">错题</span>' : '<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:var(--text-3);color:#fff;flex-shrink:0">自定义</span>';
    var domainTag = card.domainName ? '<span class="text-muted" style="font-size:11px;flex-shrink:0">' + escMem(card.domainName) + '</span>' : '';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border-1)' + (active ? ';background:var(--primary-1);border-radius:6px;padding-left:8px;padding-right:8px' : '') + '">' +
      '<span class="text-muted" style="min-width:28px">#' + (i+1) + '</span>' +
      typeTag +
      '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + q + '">' + qShort + '</span>' +
      domainTag +
      '<span style="font-size:12px;padding:2px 8px;border-radius:10px;background:' + stateColor + ';color:#fff;flex-shrink:0">' + stateLabel + '</span>' +
      '<span class="text-muted" style="flex-shrink:0;white-space:nowrap">📅 ' + fmtDate(card.nextReviewAt) + '</span>' +
      '<button onclick="jumpToCard(' + i + ')" style="padding:4px 10px;border:1px solid var(--border-2);border-radius:6px;background:var(--bg-card);cursor:pointer;flex-shrink:0">查看</button>' +
      '<button onclick="deleteMemoryCard(' + card.id + ')" style="padding:4px 10px;border:1px solid var(--danger-5);border-radius:6px;background:var(--danger-1);color:var(--danger-6);cursor:pointer;flex-shrink:0">删除</button>' +
    '</div>';
  }).join("");
  el.innerHTML = '<div class="content-card-header"><div class="content-card-title">全部卡片 (' + memCards.length + ')</div></div>' +
    '<div class="content-card-body">' + rows + '</div>';
}

function jumpToCard(i) {
  memIdx = i;
  renderMemoryCard();
  renderMemoryList();
  var el = document.getElementById("memory-card-display");
  if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
}

async function deleteMemoryCard(id) {
  if (!confirm("确定删除这张卡片？此操作不可撤销。")) return;
  try {
    await apiDelete("/memory/cards/" + id);
    navigate("memory");
  } catch(e) { alert("删除失败"); }
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
      if (el) el.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>🎉 本轮复习完成！</p><p class="text-muted">下次复习时间已由 SM-2 算法自动安排</p><button onclick="navigate(\'memory\')" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">刷新</button></div>';
      return;
    }
    renderMemoryCard();
    renderMemoryList();
  }, 600);
}

function addMemoryCard() {
  var q = prompt("正面（问题/概念）：");
  if (!q) return;
  var a = prompt("背面（答案/解析）：");
  if (!a) return;
  apiPost("/memory/cards", {question: q, answer: a}).then(function() { navigate("memory"); }).catch(function() { alert("添加失败"); });
}

/* ===== Simulation ===== */
var simState = { phase:"idle", sections:[], currentSection:0, answers:{}, currentIdx:0, startTime:0, durationSec:7200, timer:null, sectionTimers:{} };

async function renderSimulation(c) {
  var sims = [];
  try { sims = await apiGet("/simulations"); } catch(e) {}

  if (simState.phase === "exam") { renderSimExam(c); return; }
  if (simState.phase === "result") { renderSimResult(c); return; }

  simState.phase = "idle";
  c.innerHTML = '<div class="page-title">全真模拟</div>' +
    '<div class="page-subtitle">三科联考 · 真实计时 · 检验实力</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none">' +
        '<div class="content-card-body" style="text-align:center;padding:40px">' +
          '<div style="font-size:36px;font-weight:700">软考高级 · 全真模拟</div>' +
          '<div style="margin-top:8px;color:var(--hud-text-dim)">综合知识 75题 · 案例分析 5题 · 论文 1篇</div>' +
          '<div style="margin-top:4px;color:var(--hud-text-dim)">三科分别计时 · 各科及格线 45 分</div>' +
          '<button onclick="startSimulation()" style="margin-top:20px;padding:12px 40px;background:linear-gradient(135deg,var(--success-5),var(--success-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:700">开始挑战</button>' +
        '</div>' +
      '</div>' +
      '<div class="content-card">' +
        '<div class="content-card-header"><div class="content-card-title">历史记录</div></div>' +
        '<div class="content-card-body">' +
          (sims.length ? sims.slice(0,10).map(function(s) {
            return '<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-1)">' +
              '<div><strong>' + (s.simDate||"--") + '</strong> ' +
              '<span class="text-muted">综合:' + (s.knowledgeScore||0) + ' 案例:' + (s.caseScore||0) + ' 论文:' + (s.essayScore||0) + '</span></div>' +
              '<span style="color:' + (s.convergence?"var(--success-5)":"var(--danger-5)") + ';font-weight:600">' + (s.convergence?"通过":"未过") + '</span></div>';
          }).join("") : '<div class="state-empty"><p>暂无模拟考记录</p></div>') +
        '</div>' +
      '</div>' +
    '</div>';
}

async function startSimulation() {
  simState.phase = "loading";
  var c = content();
  c.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>正在抽取考题...</p></div>';
  try {
    var data = await apiPost("/simulations/start", {});
    simState.sections = data.sections || [];
    simState.answers = {};
    simState.currentSection = 0;
    simState.currentIdx = 0;
    simState.startTime = Date.now();
    simState.durationSec = simState.sections.reduce(function(sum, s) { return sum + s.durationMinutes * 60; }, 0);
    simState.phase = "exam";
    renderSimExam(c);
    startSimTimer();
  } catch(e) {
    simState.phase = "idle";
    c.innerHTML = '<div class="state-error"><p>启动失败: ' + e.message + '</p><button onclick="navigate(\'simulation\')" style="margin-top:12px;padding:8px 20px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer">返回</button></div>';
  }
}

function renderSimExam(c) {
  var sec = simState.sections[simState.currentSection];
  if (!sec) return;
  var tabsHtml = simState.sections.map(function(s, i) {
    var active = i === simState.currentSection;
    var answered = countSectionAnswered(s);
    return '<button onclick="switchSection(' + i + ')" style="padding:8px 16px;border:' + (active?"2px solid var(--primary-5)":"1px solid var(--border-2)") + ';background:' + (active?"var(--primary-3)":"var(--bg-card)") + ';border-radius:8px;cursor:pointer;font-weight:' + (active?"700":"500") + ';font-size:13px">' + s.name + ' (' + answered + '/' + s.totalQuestions + ')</button>';
  }).join("");

  c.innerHTML = '<div style="display:grid;grid-template-columns:1fr 240px;gap:20px;min-height:calc(100vh - 160px)">' +
    '<div class="stack">' +
      '<div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none">' +
        '<div class="content-card-body" style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:18px;font-weight:600">' + sec.name + '</div>' +
          '<div style="font-size:12px;color:var(--hud-text-dim)">第 ' + (simState.currentIdx+1) + ' / ' + sec.totalQuestions + ' 题 · ' + sec.questionType + ' · ' + sec.scoringRule + '</div></div>' +
          '<div style="text-align:right"><div id="sim-timer" style="font-size:28px;font-weight:700;font-family:monospace">' + formatTime(simState.durationSec) + '</div>' +
          '<div style="font-size:12px;color:var(--hud-text-dim)">总剩余时间</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + tabsHtml + '</div>' +
      '<div class="content-card" id="sim-question-card"><div class="content-card-body" id="sim-question-body"></div></div>' +
      '<div style="display:flex;gap:10px;justify-content:space-between">' +
        '<button id="sim-prev-btn" onclick="simPrev()" style="padding:10px 24px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-weight:600">上一题</button>' +
        '<button onclick="confirmSubmitSim()" style="padding:10px 24px;background:var(--danger-5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">交卷</button>' +
        '<button id="sim-next-btn" onclick="simNext()" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">下一题</button>' +
      '</div>' +
    '</div>' +
    '<div class="content-card" style="max-height:calc(100vh - 160px);overflow-y:auto">' +
      '<div class="content-card-header"><div class="content-card-title">' + sec.name + ' 答题卡</div>' +
      '<span class="text-muted" id="sim-sheet-progress" style="font-size:12px">0/' + sec.totalQuestions + '</span></div>' +
      '<div class="content-card-body"><div id="sim-sheet-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px"></div></div>' +
    '</div>' +
  '</div>';
  showSimQuestion();
  renderSimSheet();
}

function showSimQuestion() {
  var sec = simState.sections[simState.currentSection];
  if (!sec) return;
  var q = sec.questions[simState.currentIdx];
  if (!q) return;
  var body = document.getElementById("sim-question-body");
  if (!body) return;

  var answerKey = sec.key + "_" + q.id;
  var contentHtml = "";

  if (sec.key === "essay") {
    var userText = simState.answers[answerKey] || "";
    contentHtml = '<div style="font-size:16px;line-height:1.8;margin-bottom:20px;white-space:pre-wrap">' + escMem(q.stem) + '</div>' +
      '<textarea id="essay-textarea" oninput="updateEssayAnswer(' + q.id + ', this.value)" placeholder="请在此处撰写论文..." style="width:100%;min-height:400px;padding:16px;border:1.5px solid var(--border-2);border-radius:8px;font-size:14px;line-height:1.8;resize:vertical;font-family:inherit;background:var(--bg-card);color:var(--text-primary)">' + escMem(userText) + '</textarea>' +
      '<div style="margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:var(--text-2)"><span>字数: <span id="essay-word-count">' + userText.length + '</span></span><span>建议 2000-3000 字</span></div>' +
      '<div style="margin-top:12px;padding:12px;background:var(--bg-surface-high);border-radius:8px"><div style="font-weight:600;margin-bottom:6px;font-size:13px">自评打分</div>' +
      '<div style="display:flex;align-items:center;gap:12px"><input type="range" id="essay-self-score" min="0" max="75" value="' + (simState.answers[answerKey + "_score"] || 0) + '" oninput="updateEssayScore(' + q.id + ', this.value)" style="flex:1"><span id="essay-score-display" style="font-weight:700;font-size:18px;color:var(--primary-5)">' + (simState.answers[answerKey + "_score"] || 0) + '</span><span class="text-muted">/75</span></div>' +
      '<div style="margin-top:8px;font-size:12px;color:var(--text-2)">交卷后可查看评分标准进行对照</div></div>';
  } else {
    var optionsHtml = "";
    if (q.optionsJson) {
      try {
        var opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : q.optionsJson;
        if (Array.isArray(opts)) {
          optionsHtml = opts.map(function(opt, i) {
            var letter = String.fromCharCode(65 + i);
            var selected = simState.answers[answerKey] === letter ? "var(--primary-3);border-color:var(--primary-5)" : "var(--bg-card)";
            return '<div onclick="selectSimAnswer(\'' + letter + '\')" style="padding:12px;border:1.5px solid var(--border-2);border-radius:8px;cursor:pointer;background:' + selected + ';transition:all .15s"><span style="font-weight:600;margin-right:8px">' + letter + '.</span><span>' + escMem(opt) + '</span></div>';
          }).join("");
        }
      } catch(e) { optionsHtml = '<p class="text-muted">选项解析失败</p>'; }
    }
    contentHtml = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<span style="padding:2px 8px;border-radius:4px;background:var(--primary-5);color:#fff;font-size:12px">第' + (simState.currentIdx+1) + '题</span>' +
      (q.examYear ? '<span style="padding:2px 8px;border-radius:4px;background:var(--bg-surface-high);font-size:12px">' + q.examYear + '年</span>' : '') +
      '</div>' +
      '<div style="font-size:16px;line-height:1.7;margin-bottom:20px;white-space:pre-wrap">' + escMem(q.stem) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' + optionsHtml + '</div>';
  }

  body.innerHTML = contentHtml;

  var prevBtn = document.getElementById("sim-prev-btn");
  var nextBtn = document.getElementById("sim-next-btn");
  if (prevBtn) prevBtn.style.visibility = (simState.currentSection === 0 && simState.currentIdx === 0) ? "hidden" : "visible";
  if (nextBtn) {
    var isLastQ = simState.currentSection === simState.sections.length - 1 && simState.currentIdx === sec.questions.length - 1;
    nextBtn.textContent = isLastQ ? "最后一题" : "下一题";
  }
  renderSimSheet();
}

function selectSimAnswer(letter) {
  var sec = simState.sections[simState.currentSection];
  var q = sec.questions[simState.currentIdx];
  simState.answers[sec.key + "_" + q.id] = letter;
  showSimQuestion();
}

function updateEssayAnswer(qId, text) {
  var sec = simState.sections[simState.currentSection];
  simState.answers[sec.key + "_" + qId] = text;
  var wc = document.getElementById("essay-word-count");
  if (wc) wc.textContent = text.length;
}

function updateEssayScore(qId, val) {
  var sec = simState.sections[simState.currentSection];
  simState.answers[sec.key + "_" + qId + "_score"] = parseInt(val);
  var disp = document.getElementById("essay-score-display");
  if (disp) disp.textContent = val;
}

function simPrev() {
  if (simState.currentIdx > 0) {
    simState.currentIdx--;
  } else if (simState.currentSection > 0) {
    simState.currentSection--;
    simState.currentIdx = simState.sections[simState.currentSection].questions.length - 1;
  }
  showSimQuestion();
}

function simNext() {
  var sec = simState.sections[simState.currentSection];
  if (simState.currentIdx < sec.questions.length - 1) {
    simState.currentIdx++;
  } else if (simState.currentSection < simState.sections.length - 1) {
    simState.currentSection++;
    simState.currentIdx = 0;
  }
  showSimQuestion();
}

function switchSection(idx) {
  simState.currentSection = idx;
  simState.currentIdx = 0;
  renderSimExam(content());
}

function simJump(idx) {
  simState.currentIdx = idx;
  showSimQuestion();
}

function countSectionAnswered(sec) {
  var count = 0;
  sec.questions.forEach(function(q) {
    if (simState.answers[sec.key + "_" + q.id]) count++;
  });
  return count;
}

function renderSimSheet() {
  var sec = simState.sections[simState.currentSection];
  if (!sec) return;
  var grid = document.getElementById("sim-sheet-grid");
  if (!grid) return;
  var answered = 0;
  grid.innerHTML = sec.questions.map(function(q, i) {
    var isAnswered = !!simState.answers[sec.key + "_" + q.id];
    var isCurrent = i === simState.currentIdx;
    if (isAnswered) answered++;
    var bg = isCurrent ? "var(--warning-2);border-color:var(--warning-5)" : (isAnswered ? "var(--primary-3);border-color:var(--primary-5)" : "var(--bg-card);border-color:var(--border-2)");
    return '<div onclick="simJump(' + i + ')" style="padding:6px 0;text-align:center;border:1.5px solid;border-radius:4px;cursor:pointer;font-size:12px;background:' + bg + '">' + (i+1) + '</div>';
  }).join("");
  var prog = document.getElementById("sim-sheet-progress");
  if (prog) prog.textContent = answered + "/" + sec.totalQuestions;
}

function formatTime(sec) {
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = sec % 60;
  return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m + ":" + (s<10?"0":"") + s;
}

function startSimTimer() {
  if (simState.timer) clearInterval(simState.timer);
  simState.timer = setInterval(function() {
    var elapsed = Math.floor((Date.now() - simState.startTime) / 1000);
    var remaining = simState.durationSec - elapsed;
    if (remaining <= 0) {
      clearInterval(simState.timer);
      simState.timer = null;
      alert("时间到，自动交卷！");
      submitSim();
      return;
    }
    var el = document.getElementById("sim-timer");
    if (el) {
      el.textContent = formatTime(remaining);
      if (remaining < 300) el.style.color = "#ef4444";
    }
  }, 1000);
}

function confirmSubmitSim() {
  var totalAnswered = 0;
  var totalQs = 0;
  simState.sections.forEach(function(sec) {
    totalQs += sec.totalQuestions;
    sec.questions.forEach(function(q) {
      if (simState.answers[sec.key + "_" + q.id]) totalAnswered++;
    });
  });
  var msg = "已答 " + totalAnswered + "/" + totalQs + " 题";
  if (totalQs - totalAnswered > 0) msg += "，还有 " + (totalQs - totalAnswered) + " 题未作答";
  msg += "\n\n确定交卷吗？";
  if (confirm(msg)) submitSim();
}

async function submitSim() {
  if (simState.timer) { clearInterval(simState.timer); simState.timer = null; }
  simState.phase = "submitting";
  var c = content();
  c.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>正在阅卷评分...</p></div>';

  try {
    var body = {};
    if (!simState.sections || !simState.sections.length) {
      throw new Error("没有考试数据，请重新开始");
    }
    simState.sections.forEach(function(sec) {
      var answers = (sec.questions || []).map(function(q) {
        var ans = { questionId: q.id, userAnswer: simState.answers[sec.key + "_" + q.id] || "" };
        if (sec.key === "essay") {
          ans.selfScore = simState.answers[sec.key + "_" + q.id + "_score"] || 0;
        }
        return ans;
      });
      body[sec.key] = answers;
    });

    var result = await apiPost("/simulations/submit", body);
    simState.result = result;
    simState.phase = "result";
    renderSimResult(c);
  } catch(e) {
    console.error("submitSim error:", e);
    simState.phase = "idle";
    c.innerHTML = '<div class="state-error"><p>交卷失败: ' + (e.message || e) + '</p><button onclick="navigate(\'simulation\')" style="margin-top:12px;padding:8px 20px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer">返回</button></div>';
  }
}

function renderSimResult(c) {
  var r = simState.result || {};
  var scores = r.scores || {};
  var k = scores.knowledge || {};
  var ca = scores.case || {};
  var es = scores.essay || {};
  var passed = r.passed;
  var scoreColor = passed ? "var(--success-5)" : "var(--danger-5)";
  var essayFeedback = r.essayFeedback || [];

  function scoreCard(s) {
    if (!s || !s.name) return "";
    var color = s.passed ? "var(--success-5)" : "var(--danger-5)";
    return '<div style="text-align:center;padding:20px;background:var(--bg-surface-high);border-radius:12px;border:1px solid var(--border-1)">' +
      '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">' + s.name + '</div>' +
      '<div style="font-size:36px;font-weight:700;color:' + color + '">' + (s.score||0) + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted)">满分' + (s.fullScore||75) + ' · 及格' + (s.passThreshold||45) + '</div>' +
      '<div style="margin-top:6px;font-size:13px;font-weight:600;color:' + color + '">' + (s.passed ? "✓ 通过" : "✗ 未过") + '</div>' +
      '</div>';
  }

  var essayHtml = essayFeedback.length ? essayFeedback.map(function(fb) {
    return '<div style="padding:16px;margin-bottom:12px;background:var(--bg-surface-high);border-radius:8px;border-left:3px solid var(--primary-5)">' +
      '<div style="font-weight:600;margin-bottom:8px">论文题</div>' +
      '<div style="margin-bottom:12px;line-height:1.6;font-size:14px;white-space:pre-wrap">' + escMem(fb.stem) + '</div>' +
      '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">你的答卷:</div><div style="padding:12px;background:var(--bg-surface-low);border-radius:6px;font-size:13px;line-height:1.7;white-space:pre-wrap;max-height:300px;overflow-y:auto">' + escMem(fb.userEssay||"未作答") + '</div></div>' +
      '<div style="display:flex;gap:12px;margin-bottom:12px"><span>自评得分: <strong style="color:var(--primary-5)">' + (fb.selfScore||0) + '</strong>/75</span></div>' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:4px">评分标准:</div><div style="padding:12px;background:var(--bg-surface-low);border-radius:6px;font-size:13px;line-height:1.7;white-space:pre-wrap">' + escMem(fb.scoringCriteria||"") + '</div>' +
    '</div>';
  }).join("") : "";

  c.innerHTML = '<div class="page-title">模拟考成绩</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="content-card" style="text-align:center;padding:30px">' +
        '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">' + (r.simDate||"--") + ' · 总分 ' + (r.totalScore||0) + '/225</div>' +
        '<div style="font-size:48px;font-weight:700;color:' + scoreColor + '">' + (passed ? "✓ 三科通过" : "✗ 未通过") + '</div>' +
        (r.insights ? '<div style="margin-top:12px;padding:10px 16px;background:var(--bg-surface-high);border-radius:8px;font-size:14px">' + escMem(r.insights) + '</div>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(' + (essayFeedback.length ? 3 : 2) + ',1fr);gap:16px">' +
        scoreCard(k) + scoreCard(ca) + scoreCard(es) +
      '</div>' +
      (essayHtml ? '<div class="content-card"><div class="content-card-header"><div class="content-card-title">论文详情</div></div><div class="content-card-body">' + essayHtml + '</div></div>' : '') +
      '<div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">' +
        '<button onclick="simState.phase=\'idle\';navigate(\'simulation\')" style="padding:12px 32px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">再次挑战</button>' +
        '<button onclick="navigate(\'dashboard\')" style="padding:12px 32px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-weight:600">返回大厅</button>' +
      '</div>' +
    '</div>';
}

/* ===== Diagnosis ===== */
async function renderDiagnosis(c) {
  var diagnoses = [];
  try { diagnoses = await apiGet("/diagnosis/history"); } catch(e) { diagnoses = []; }
  if (!state.domains.length) { try { await loadDomains(); await loadTerritories(); } catch(e) {} }

  c.innerHTML = '<div class="page-title">弱点诊断</div>' +
    '<div class="page-subtitle">AI 分析薄弱点 · 精准打击</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="content-card">' +
        '<div class="content-card-header">' +
          '<div class="content-card-title">领域能力雷达</div>' +
          '<button id="diagnosis-generate-btn" onclick="startDiagnosis()" style="padding:6px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">🤖 AI 诊断</button>' +
        '</div>' +
        '<div class="content-card-body"><div id="diagnosis-bars"></div></div>' +
      '</div>' +
      '<div class="content-card" id="diagnosis-report-card" style="display:none"></div>' +
      (diagnoses.length ? '<div class="content-card"><div class="content-card-header"><div class="content-card-title">历史诊断报告</div></div><div class="content-card-body">' + diagnoses.slice(0,5).map(function(d) {
        return '<div style="padding:12px;margin-bottom:8px;background:var(--bg-surface-high);border-radius:8px;cursor:pointer" onclick="showDiagnosisDetail(' + d.id + ')">' +
          '<div class="flex-between"><strong>' + (d.diagDate || "诊断") + '</strong> <span style="font-size:12px;padding:2px 8px;border-radius:8px;background:var(--primary-5);color:#fff">' + (d.triggerType || "AI") + '</span></div>' +
          (d.learnerProfile && d.learnerProfile.summary ? '<div class="text-muted" style="margin-top:6px">' + escMem(d.learnerProfile.summary) + '</div>' : '') +
          (d.weakDomains && d.weakDomains.length ? '<div style="margin-top:6px"><span class="text-muted">薄弱领域: </span>' + d.weakDomains.map(function(w) { return '<span style="font-size:12px;padding:2px 8px;border-radius:8px;background:var(--danger-2);color:var(--danger-6);margin-right:4px">' + escMem(w.domainName) + ' ' + Math.round((w.accuracy||0)*100) + '%</span>'; }).join("") + '</div>' : '') +
        '</div>';
      }).join("") + '</div></div>' : '') +
    '</div>';
  renderDiagnosisBars();
  loadLatestDiagnosis();
}

async function loadLatestDiagnosis() {
  try {
    var latest = await apiGet("/diagnosis/latest");
    if (latest && !latest.degraded) {
      showDiagnosisReport(latest);
    }
  } catch(e) {}
}

function showDiagnosisReport(report) {
  var card = document.getElementById("diagnosis-report-card");
  if (!card) return;
  card.style.display = "";
  var profile = report.learnerProfile || {};
  var weakDomains = report.weakDomains || [];
  var errorDist = report.errorDistribution || {};
  var advice = report.weeklyAdvice || "";

  var weakHtml = weakDomains.map(function(w) {
    var pct = Math.round((w.accuracy || 0) * 100);
    var color = pct >= 80 ? "var(--success-5)" : (pct >= 50 ? "var(--warning-5)" : "var(--danger-5)");
    return '<div style="margin-bottom:8px">' +
      '<div class="flex-between" style="margin-bottom:4px"><span>' + escMem(w.domainName) + '</span><span style="font-weight:600;color:' + color + '">' + pct + '% (' + (w.errorCount||0) + '错)</span></div>' +
      '<div class="stat-bar" style="height:8px;background:var(--bg-surface-highest)"><div class="stat-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
    '</div>';
  }).join("");

  var errorHtml = Object.keys(errorDist).map(function(k) {
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="min-width:80px;font-size:13px">' + escMem(k) + '</span><div class="stat-bar" style="flex:1;height:6px;background:var(--bg-surface-highest)"><div class="stat-bar-fill" style="width:' + Math.round((errorDist[k]||0)*100) + '%;background:var(--danger-5)"></div></div><span class="text-muted" style="min-width:40px;text-align:right">' + Math.round((errorDist[k]||0)*100) + '%</span></div>';
  }).join("");

  var strengthsHtml = profile.strengths && profile.strengths.length ? profile.strengths.map(function(s) { return '<span style="display:inline-block;padding:4px 10px;margin:2px;border-radius:8px;background:var(--success-1);color:var(--success-6);font-size:13px">💪 ' + escMem(s) + '</span>'; }).join("") : '<span class="text-muted">暂无</span>';
  var weaknessesHtml = profile.weaknesses && profile.weaknesses.length ? profile.weaknesses.map(function(s) { return '<span style="display:inline-block;padding:4px 10px;margin:2px;border-radius:8px;background:var(--danger-2);color:var(--danger-6);font-size:13px">⚠️ ' + escMem(s) + '</span>'; }).join("") : '<span class="text-muted">暂无</span>';

  card.innerHTML = '<div class="content-card-header"><div class="content-card-title">🤖 AI 诊断报告</div><span class="text-muted">' + (report.diagDate || "") + '</span></div>' +
    '<div class="content-card-body">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">' +
        '<div><div class="text-muted" style="margin-bottom:4px">学习者画像</div><div style="font-size:20px;font-weight:700">Lv.' + (profile.level||1) + ' ' + escMem(profile.title||'冒险者') + '</div><div class="text-muted" style="margin-top:2px">答题 ' + (profile.totalAnswered||0) + ' · 正确率 ' + Math.round((profile.overallAccuracy||0)*100) + '% · 连续 ' + (profile.loginStreak||0) + ' 天</div></div>' +
        '<div><div class="text-muted" style="margin-bottom:4px">AI 评语</div><div style="font-size:14px;line-height:1.6">' + escMem(profile.summary || '暂无评语') + '</div></div>' +
      '</div>' +
      '<div style="margin-bottom:16px"><div class="text-muted" style="margin-bottom:6px">💪 优势</div>' + strengthsHtml + '</div>' +
      '<div style="margin-bottom:16px"><div class="text-muted" style="margin-bottom:6px">⚠️ 待提升</div>' + weaknessesHtml + '</div>' +
      (weakHtml ? '<div style="margin-bottom:16px"><div class="text-muted" style="margin-bottom:8px">📊 薄弱领域</div>' + weakHtml + '</div>' : '') +
      (errorHtml ? '<div style="margin-bottom:16px"><div class="text-muted" style="margin-bottom:8px">🔍 错因分布</div>' + errorHtml + '</div>' : '') +
      (advice ? '<div style="padding:12px;background:var(--primary-1);border-radius:8px;border:1px solid var(--primary-3)"><div class="text-muted" style="margin-bottom:6px">📋 本周建议</div><div style="font-size:14px;line-height:1.7">' + escMem(advice) + '</div></div>' : '') +
    '</div>';
}

function showDiagnosisDetail(id) {
  navigate("diagnosis");
  setTimeout(function() {
    apiGet("/diagnosis/history").then(function(list) {
      var report = list.find(function(d) { return d.id === id; });
      if (report) showDiagnosisReport(report);
    }).catch(function() {});
  }, 100);
}

function renderDiagnosisBars() {
  var el = document.getElementById("diagnosis-bars");
  if (!el) return;
  var domains = state.domains.length ? state.domains : [];
  var territories = state.territories;
  el.innerHTML = domains.map(function(d) {
    var t = territories.find(function(tt) { return tt.domainId === d.id; }) || {};
    var pct = Math.round((t.accuracy || 0) * 100);
    var color = pct >= 80 ? "var(--success-5)" : (pct >= 50 ? "var(--warning-5)" : "var(--danger-5)");
    return '<div style="margin-bottom:12px"><div class="flex-between" style="margin-bottom:4px"><span>' + d.name + '</span><span style="font-weight:600;color:' + color + '">' + pct + '%</span></div><div class="stat-bar" style="height:10px;background:var(--bg-surface-highest)"><div class="stat-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div>';
  }).join("") || '<div class="state-empty"><p>暂无数据</p><p class="text-muted">完成答题后查看薄弱点分析</p></div>';
}

async function startDiagnosis() {
  var btn = document.getElementById("diagnosis-generate-btn");
  if (btn) { btn.disabled = true; btn.textContent = "AI 分析中..."; }
  var card = document.getElementById("diagnosis-report-card");
  if (card) { card.style.display = ""; card.innerHTML = '<div class="content-card-body" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto;width:32px;height:32px;border:3px solid var(--border-2);border-top-color:var(--primary-6);border-radius:50%;animation:spin 0.8s linear infinite"></div><p style="margin-top:12px" class="text-muted">AI 正在分析你的答题数据，请稍候...</p></div>'; }
  try {
    var report = await apiPost("/diagnosis/generate", {});
    if (report && report.degraded) {
      if (card) card.innerHTML = '<div class="content-card-body state-empty" style="padding:40px"><p>📊 ' + escMem(report.message || "数据量不足") + '</p><p class="text-muted">多答一些题后再来诊断吧</p></div>';
    } else {
      showDiagnosisReport(report);
    }
  } catch(e) {
    if (card) card.innerHTML = '<div class="content-card-body state-error" style="padding:40px"><p>诊断失败: ' + escMem(e.message) + '</p><button onclick="startDiagnosis()" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">重试</button></div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🤖 AI 诊断"; }
  }
}

/* ===== Plan ===== */
async function renderPlan(c) {
  var plan = null;
  try { plan = await apiGet("/plan/current"); } catch(e) { plan = null; }

  c.innerHTML = '<div class="page-title">学习计划</div>' +
    '<div class="page-subtitle">AI 基于诊断报告 · 智能周计划</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="flex-between">' +
        '<div></div>' +
        '<button id="plan-generate-btn" onclick="generatePlan()" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">🤖 AI 生成计划</button>' +
      '</div>' +
      '<div id="plan-content"></div>' +
    '</div>';
  renderPlanContent(plan);
}

function renderPlanContent(plan) {
  var el = document.getElementById("plan-content");
  if (!el) return;
  if (!plan || plan.degraded) {
    el.innerHTML = '<div class="content-card"><div class="content-card-body state-empty" style="padding:40px">' +
      '<p>' + (plan && plan.message ? escMem(plan.message) : "暂无学习计划") + '</p>' +
      '<p class="text-muted">点击「AI 生成计划」按钮，AI 将基于你的诊断报告生成针对性的周学习计划</p>' +
      '<button onclick="generatePlan()" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">立即生成</button>' +
    '</div></div>';
    return;
  }

  var tasks = plan.tasks || [];
  var planItems = plan.planItems || [];
  var days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  var dayTasks = {};
  days.forEach(function(d) { dayTasks[d] = []; });
  tasks.forEach(function(t) {
    var day = t.day || "周一";
    if (!dayTasks[day]) dayTasks[day] = [];
    dayTasks[day].push(t);
  });

  var totalMin = plan.totalEstimatedMinutes || 0;
  var doneCount = tasks.filter(function(t) { return t.done; }).length;
  var progress = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;

  var dayHtml = days.map(function(day) {
    var dtasks = dayTasks[day] || [];
    if (!dtasks.length) return '';
    var taskRows = dtasks.map(function(t) {
      var checked = t.done ? "checked" : "";
      var textStyle = t.done ? "text-decoration:line-through;opacity:.5" : "";
      var focusTag = t.focus ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--primary-3);color:#fff;margin-left:6px">' + escMem(t.focus) + '</span>' : '';
      var minTag = t.estimatedMinutes ? '<span class="text-muted" style="margin-left:6px">' + t.estimatedMinutes + 'min</span>' : '';
      return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px;margin-bottom:4px;background:var(--bg-surface-high);border-radius:6px">' +
        '<input type="checkbox" ' + checked + ' onchange="togglePlanTask(' + t.id + ')" style="margin-top:3px;cursor:pointer;accent-color:var(--primary-6)">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="' + textStyle + '">' + escMem(t.text || '') + focusTag + minTag + '</div>' +
          (t.source === "AI" ? '<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:var(--primary-5);color:#fff">AI</span>' : '') +
        '</div>' +
      '</div>';
    }).join("");
    return '<div style="margin-bottom:12px">' +
      '<div style="font-weight:600;margin-bottom:6px;color:var(--primary-6)">' + day + ' <span class="text-muted" style="font-weight:400">(' + dtasks.length + '项)</span></div>' +
      taskRows +
    '</div>';
  }).join("");

  var itemsHtml = planItems.length ? '<div class="content-card"><div class="content-card-header"><div class="content-card-title">📋 AI 规划建议</div></div><div class="content-card-body">' + planItems.map(function(item) {
    if (typeof item === "string") {
      return '<div style="padding:10px;margin-bottom:6px;background:var(--bg-surface-high);border-radius:8px;font-size:14px;line-height:1.6">' + escMem(item) + '</div>';
    }
    var domainName = item.domainName || "未知领域";
    var focus = item.focus || "";
    var reason = item.reason || "";
    var accuracy = item.accuracy != null ? Math.round(item.accuracy * 100) + "%" : "";
    var errorCount = item.errorCount != null ? item.errorCount + "错" : "";
    var estMin = item.estimatedMinutes ? item.estimatedMinutes + "min" : "";
    var subTasks = item.tasks || [];
    var subTasksHtml = subTasks.length ? '<ul style="margin:6px 0 0 0;padding-left:20px">' + subTasks.map(function(st) { return '<li style="font-size:13px;line-height:1.6;color:var(--text-1)">' + escMem(st) + '</li>'; }).join("") + '</ul>' : '';
    return '<div style="padding:12px;margin-bottom:8px;background:var(--bg-surface-high);border-radius:8px">' +
      '<div class="flex-between" style="margin-bottom:4px">' +
        '<strong style="color:var(--primary-6)">' + escMem(domainName) + '</strong>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          (accuracy ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--danger-2);color:var(--danger-6)">' + accuracy + (errorCount ? ' (' + errorCount + ')' : '') + '</span>' : '') +
          (estMin ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--primary-1);color:var(--primary-6)">' + estMin + '</span>' : '') +
        '</div>' +
      '</div>' +
      (focus ? '<div class="text-muted" style="font-size:13px;margin-bottom:4px">🎯 ' + escMem(focus) + '</div>' : '') +
      (reason ? '<div style="font-size:13px;line-height:1.5;margin-bottom:4px;color:var(--text-2)">💡 ' + escMem(reason) + '</div>' : '') +
      subTasksHtml +
    '</div>';
  }).join("") + '</div></div>' : '';

  el.innerHTML = '<div class="content-card" style="background:linear-gradient(135deg,var(--primary-1),var(--bg-card));border:1px solid var(--primary-3)">' +
    '<div class="content-card-body">' +
      '<div class="flex-between">' +
        '<div><div style="font-size:14px;color:var(--text-3)">第 ' + (plan.weekNum || 1) + ' 周</div><div style="font-size:18px;font-weight:700">学习进度</div></div>' +
        '<div style="text-align:right"><div style="font-size:28px;font-weight:700;color:var(--primary-6)">' + progress + '%</div><div class="text-muted">' + doneCount + '/' + tasks.length + ' 完成 · ' + totalMin + 'min</div></div>' +
      '</div>' +
      '<div class="stat-bar" style="height:10px;margin-top:10px;background:var(--bg-surface-highest)"><div class="stat-bar-fill" style="width:' + progress + '%;background:var(--primary-6);transition:width .5s"></div></div>' +
    '</div>' +
  '</div>' +
  (dayHtml ? '<div class="content-card"><div class="content-card-header"><div class="content-card-title">📅 本周任务</div></div><div class="content-card-body">' + dayHtml + '</div></div>' : '') +
  itemsHtml +
  renderMaterialSection(tasks);

  // 已生成的资料已落库，进入页面自动加载展示（无需重新生成消耗 token）
  preloadMaterials();
}

function preloadMaterials() {
  var btns = document.querySelectorAll("[id^='material-btn-']");
  btns.forEach(function(btn) {
    var m = btn.id.match(/^material-btn-(\d+)$/);
    if (!m) return;
    var taskId = m[1];
    apiGet("/plan/material/" + taskId).then(function(mat) {
      if (mat && mat.content) {
        renderMaterialContent(taskId, mat);
        btn.textContent = "🔄 重新生成";
      }
    }).catch(function() { /* 无已生成资料，保持生成按钮 */ });
  });
}

function renderMaterialSection(tasks) {
  var focusGroups = {};
  tasks.forEach(function(t) {
    if (t.focus && t.source === "AI") {
      if (!focusGroups[t.focus]) focusGroups[t.focus] = [];
      focusGroups[t.focus].push(t);
    }
  });
  var focusKeys = Object.keys(focusGroups);
  if (!focusKeys.length) return '';

  var cards = focusKeys.map(function(focus) {
    var group = focusGroups[focus];
    var taskId = group[0].id;
    return '<div class="content-card" style="margin-bottom:12px" id="material-card-' + taskId + '">' +
      '<div class="content-card-body">' +
        '<div class="flex-between">' +
          '<div><strong style="color:var(--primary-6)">🎯 ' + escMem(focus) + '</strong>' +
          '<div class="text-muted" style="font-size:12px;margin-top:2px">' + group.length + ' 个关联任务</div></div>' +
          '<button onclick="generateMaterial(' + taskId + ')" id="material-btn-' + taskId + '" style="padding:6px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">📖 生成资料</button>' +
        '</div>' +
        '<div id="material-content-' + taskId + '"></div>' +
      '</div>' +
    '</div>';
  }).join("");

  return '<div class="content-card"><div class="content-card-header"><div class="content-card-title">📚 AI 学习资料</div><span class="text-muted" style="font-size:12px">按学习重点生成 · 图文结合</span></div><div class="content-card-body">' + cards + '</div></div>';
}

async function generateMaterial(taskId) {
  var btn = document.getElementById("material-btn-" + taskId);
  var container = document.getElementById("material-content-" + taskId);
  if (btn) { btn.disabled = true; btn.textContent = "AI 生成中..."; }
  if (container) container.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto;width:24px;height:24px;border:2px solid var(--border-2);border-top-color:var(--primary-6);border-radius:50%;animation:spin 0.8s linear infinite"></div><p class="text-muted" style="margin-top:8px;font-size:13px">正在生成图文学习资料...</p></div>';

  try {
    var material = await apiPost("/plan/material/" + taskId, {});
    renderMaterialContent(taskId, material);
    if (btn) { btn.disabled = false; btn.textContent = "🔄 重新生成"; }
  } catch(e) {
    if (container) container.innerHTML = '<div style="padding:12px;color:var(--danger-5);font-size:13px">生成失败: ' + (e.message || e) + '</div>';
    if (btn) { btn.disabled = false; btn.textContent = "📖 生成资料"; }
  }
}

function renderMaterialContent(taskId, material) {
  var container = document.getElementById("material-content-" + taskId);
  if (!container || !material || !material.content) return;

  var md = material.content;
  md = md.replace(/^```(?:markdown|md)?\s*\n/, '').replace(/\n```\s*$/, '');
  var rawHtml = simpleMarkdown(md);
  container.innerHTML = '<div style="margin-top:16px;padding:16px;background:var(--bg-surface-low);border-radius:10px;border:1px solid var(--border-1)" class="material-body">' + rawHtml + '</div>';

  var mermaidBlocks = container.querySelectorAll('pre.mermaid-code');
  var mermaidCodes = [];
  mermaidBlocks.forEach(function(block, idx) {
    var code = block.textContent.trim();
    mermaidCodes.push(code);
    var div = document.createElement('div');
    div.className = 'mermaid';
    div.id = 'mermaid-' + taskId + '-' + idx;
    block.parentNode.replaceChild(div, block);
  });

  if (mermaidCodes.length > 0 && typeof mermaid !== 'undefined') {
    try {
      if (!mermaid._initialized) {
        mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        mermaid._initialized = true;
      }
      var nodes = container.querySelectorAll('.mermaid');
      nodes.forEach(function(node, idx) {
        mermaid.render('mermaid-svg-' + taskId + '-' + idx, mermaidCodes[idx]).then(function(result) {
          node.innerHTML = result.svg;
        }).catch(function(e) {
          console.warn('Mermaid diagram ' + idx + ' render failed:', e.message || e);
          node.innerHTML = '<pre style="color:var(--text-2);font-size:12px;background:var(--bg-surface-highest);padding:8px;border-radius:4px;overflow-x:auto">' + mermaidCodes[idx] + '</pre>';
        });
      });
    } catch(e) {
      console.warn('Mermaid init error:', e.message || e);
    }
  }
}

function simpleMarkdown(md) {
  if (!md) return '';
  var lines = md.split('\n');
  var html = [];
  var i = 0;
  var inList = false;
  var inOl = false;
  var inTable = false;
  var tableRows = [];

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
  }

  function flushTable() {
    if (!tableRows.length) return;
    var tbl = '<table>';
    tableRows.forEach(function(row, ri) {
      tbl += '<tr>';
      row.forEach(function(cell) {
        tbl += (ri === 0 ? '<th>' : '<td>') + inline(cell.trim()) + (ri === 0 ? '</th>' : '</td>');
      });
      tbl += '</tr>';
    });
    tbl += '</table>';
    html.push(tbl);
    tableRows = [];
    inTable = false;
  }

  while (i < lines.length) {
    var line = lines[i];

    if (line.startsWith('```mermaid')) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      var code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      html.push('<pre class="mermaid-code" style="display:none">' + esc(code.join('\n')) + '</pre>');
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      var code2 = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code2.push(lines[i]);
        i++;
      }
      html.push('<pre><code>' + esc(code2.join('\n')) + '</code></pre>');
      i++;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      var level = line.match(/^(#+)/)[1].length;
      var text = line.replace(/^#+\s/, '');
      html.push('<h' + level + '>' + inline(text) + '</h' + level + '>');
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push('<li>' + inline(line.replace(/^[-*]\s/, '')) + '</li>');
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (inList) { html.push('</ul>'); inList = false; }
      flushTable();
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push('<li>' + inline(line.replace(/^\d+\.\s/, '')) + '</li>');
      i++;
      continue;
    }

    if (/^\|.*\|/.test(line)) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (i + 1 < lines.length && /^\|[-:\s|]+\|$/.test(lines[i + 1])) {
        tableRows.push(line.split('|').slice(1, -1));
        i += 2;
        while (i < lines.length && /^\|.*\|/.test(lines[i])) {
          tableRows.push(lines[i].split('|').slice(1, -1));
          i++;
        }
        flushTable();
        continue;
      }
    }

    if (line.startsWith('<details') || line.startsWith('</details') || line.startsWith('<summary') || line.startsWith('</summary')) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      html.push(line);
      i++;
      continue;
    }

    if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      i++;
      continue;
    }

    if (inList) { html.push('</ul>'); inList = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
    flushTable();
    html.push('<p>' + inline(line) + '</p>');
    i++;
  }

  if (inList) html.push('</ul>');
  if (inOl) html.push('</ol>');
  flushTable();
  return html.join('\n');
}

async function generatePlan() {
  var btn = document.getElementById("plan-generate-btn");
  if (btn) { btn.disabled = true; btn.textContent = "AI 生成中..."; }
  var el = document.getElementById("plan-content");
  if (el) el.innerHTML = '<div class="content-card"><div class="content-card-body" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto;width:32px;height:32px;border:3px solid var(--border-2);border-top-color:var(--primary-6);border-radius:50%;animation:spin 0.8s linear infinite"></div><p class="text-muted" style="margin-top:12px">AI 正在基于诊断报告生成学习计划，请稍候...</p></div></div>';
  try {
    var plan = await apiPost("/plan/generate", {});
    renderPlanContent(plan);
  } catch(e) {
    if (el) el.innerHTML = '<div class="content-card"><div class="content-card-body state-error" style="padding:40px"><p>生成失败: ' + escMem(e.message) + '</p><p class="text-muted">请先完成诊断后再生成学习计划</p><button onclick="generatePlan()" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">重试</button></div></div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🤖 AI 生成计划"; }
  }
}

async function togglePlanTask(taskId) {
  try {
    await fetch(API + "/plan/task/" + taskId + "/toggle", { method: "PATCH" });
    var plan = await apiGet("/plan/current");
    renderPlanContent(plan);
  } catch(e) { console.warn("toggle failed", e); }
}

/* ===== Data Center ===== */
async function renderData(c) {
  c.innerHTML = '<div class="page-title">数据中心</div><div class="page-subtitle">学习记录 · 成就 · 统计</div><div class="stack" style="margin-top:20px"><div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none;overflow:hidden;position:relative"><div class="content-card-body" style="display:flex;align-items:center;gap:20px;position:relative;z-index:1"><div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary-6),var(--hud-bg-2));display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.18);box-shadow:0 0 0 4px rgba(22,100,255,.18);font-size:32px">🦸</div><div><div style="font-size:22px;font-weight:700">冒险者</div><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><span style="padding:2px 10px;border-radius:12px;background:rgba(22,100,255,.22);color:var(--hud-text-blue);font-size:12px;font-weight:600">Lv.' + state.level + '</span><span style="padding:2px 10px;border-radius:12px;background:rgba(255,209,102,.16);color:var(--hud-coin);font-size:12px;font-weight:600">' + state.coin + '</span><span style="padding:2px 10px;border-radius:12px;background:rgba(30,191,111,.16);color:var(--color-combo);font-size:12px;font-weight:600">' + state.streak + '天</span></div></div><div style="margin-left:auto;display:flex;gap:20px;text-align:center"><div><div style="font-size:24px;font-weight:700" id="data-total-q">--</div><div class="text-muted">总答题</div></div><div><div style="font-size:24px;font-weight:700" id="data-accuracy">--</div><div class="text-muted">正确率</div></div><div><div style="font-size:24px;font-weight:700" id="data-days">--</div><div class="text-muted">学习天数</div></div></div></div><div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(22,100,255,.2),transparent 70%)"></div></div><div class="grid-2"><div class="content-card"><div class="content-card-header"><div class="content-card-title">学习热力图</div></div><div class="content-card-body"><div id="heatmap" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px"></div></div></div><div class="content-card"><div class="content-card-header"><div class="content-card-title">成就</div></div><div class="content-card-body" id="data-achievements"><div class="state-empty"><p>加载中...</p></div></div></div></div></div>';
  renderHeatmap();
  loadDataStats();
}

function renderHeatmap() {
  var el = document.getElementById("heatmap");
  if (!el) return;
  var html = "";
  for (var i = 0; i < 28; i++) {
    var level = Math.floor(Math.random() * 4);
    var colors = ["var(--bg-surface-high)","#c6e48b","#7bc96f","#239a3b"];
    html += '<div style="aspect-ratio:1;border-radius:3px;background:' + colors[level] + '" title="第 ' + (28-i) + ' 天"></div>';
  }
  el.innerHTML = html;
}

async function loadDataStats() {
  try {
    var gs = await apiGet("/game/state");
    if (gs) {
      var tq = document.getElementById("data-total-q");
      var ac = document.getElementById("data-accuracy");
      var ds = document.getElementById("data-days");
      if (tq) tq.textContent = gs.totalQuestions || 0;
      if (ac) ac.textContent = Math.round((gs.accuracy || 0) * 100) + "%";
      if (ds) ds.textContent = gs.streak || 0;
    }
  } catch(e) {
    var tq = document.getElementById("data-total-q");
    var ac = document.getElementById("data-accuracy");
    var ds = document.getElementById("data-days");
    if (tq) tq.textContent = "0";
    if (ac) ac.textContent = "--";
    if (ds) ds.textContent = "0";
  }
}
/* ===== Question Bank Manager ===== */
async function renderBank(c) {
  var domains = state.domains.length ? state.domains : await loadDomains();
  var domainOpts = '<option value="">全部领域</option>' + domains.map(function(d) { return '<option value="' + d.id + '">' + d.name + '</option>'; }).join("");

  c.innerHTML = '<div class="page-title">题库管理</div><div class="page-subtitle">管理题目 · 手动添加 · 批量导入</div>' +
    '<div class="stack" style="margin-top:20px">' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">筛选</div></div>' +
        '<div class="content-card-body"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<select id="bank-domain-filter" onchange="loadBankQuestions()" style="padding:8px;border:1px solid var(--border-2);border-radius:6px">' + domainOpts + '</select>' +
          '<input id="bank-search" placeholder="搜索题目..." onkeyup="loadBankQuestions()" style="padding:8px;border:1px solid var(--border-2);border-radius:6px;flex:1;min-width:200px">' +
          '<button onclick="showAddQuestionForm()" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap">+ 添加题目</button>' +
          '<button onclick="showBatchImport()" style="padding:8px 16px;background:var(--success-6);color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap">批量导入</button>' +
        '</div></div></div>' +
      '<div class="content-card" id="bank-add-form" style="display:none"><div class="content-card-header"><div class="content-card-title">添加新题目</div><button onclick=this.parentNode.hidden=true>关闭</button></div>' +
        '<div class="content-card-body">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
            '<div><label style="font-size:12px;color:var(--text-3)">领域</label><select id="bank-new-domain" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px">' + domainOpts.replace('全部领域','') + '</select></div>' +
            '<div><label style="font-size:12px;color:var(--text-3)">来源</label><input id="bank-new-source" value="MANUAL" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
          '</div>' +
          '<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--text-3)">题目正文</label><textarea id="bank-new-stem" rows="3" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;resize:vertical"></textarea></div>' +
          '<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--text-3)">选项 (每行一个，如: A. 选项内容)</label><textarea id="bank-new-options" rows="4" placeholder="A. 选项A&#10;B. 选项B&#10;C. 选项C&#10;D. 选项D" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;resize:vertical"></textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
            '<div><label style="font-size:12px;color:var(--text-3)">正确答案</label><input id="bank-new-answer" placeholder="A/B/C/D" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
            '<div><label style="font-size:12px;color:var(--text-3)">科目</label><input id="bank-new-subject" value="综合知识" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
          '</div>' +
          '<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--text-3)">解析</label><textarea id="bank-new-analysis" rows="2" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;resize:vertical"></textarea></div>' +
          '<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--text-3)">配图 URL (可选, 支持 https:// 或 /uploads/...)</label><input id="bank-new-image" placeholder="https://... 或 /uploads/questions/xxx.png" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
          '<button onclick="saveNewQuestion()" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">保存题目</button>' +
        '</div></div>' +
      '<div class="content-card" id="bank-batch-form" style="display:none"><div class="content-card-header"><div class="content-card-title">批量导入 JSON</div><button onclick=this.parentNode.hidden=true>关闭</button></div>' +
        '<div class="content-card-body">' +
          '<p class="text-muted" style="margin-bottom:10px">每行一个 JSON 对象，格式：{"domainId":1,"stem":"题目","options":["A","B","C","D"],"answer":"A","analysis":"解析"}</p>' +
          '<textarea id="bank-batch-json" rows="10" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-family:monospace;font-size:12px;resize:vertical"></textarea>' +
          '<button onclick="batchImportQuestions()" style="margin-top:10px;padding:10px 24px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">批量导入</button>' +
          '<div id="bank-batch-result" style="margin-top:10px"></div>' +
        '</div></div>' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">题目列表 <span id="bank-count" class="text-muted"></span></div></div>' +
        '<div class="content-card-body"><div id="bank-question-list"></div>' +
        '<div style="margin-top:10px;display:flex;gap:10px;align-items:center" id="bank-pagination"></div>' +
      '</div></div>' +
    '</div>';
  loadBankQuestions();
}

async function loadBankQuestions(page) {
  page = page || 1;
  var domainId = document.getElementById("bank-domain-filter")?.value || "";
  var search = document.getElementById("bank-search")?.value || "";
  var params = new URLSearchParams();
  if (domainId) params.set("domainId", domainId);
  params.set("count", "50");
  params.set("page", page.toString());

  try {
    var data = await apiGet("/questions?" + params.toString());
    var questions = Array.isArray(data) ? data : (data.content || []);
    var total = data.total || questions.length;
    document.getElementById("bank-count").textContent = "共 " + total + " 题";

    // Client-side search filter
    if (search) {
      questions = questions.filter(function(q) { return q.stem && q.stem.indexOf(search) >= 0; });
    }

    var html = "";
    questions.forEach(function(q, i) {
      var domainName = "";
      var d = state.domains.find(function(dd) { return dd.id === q.domainId; });
      if (d) domainName = d.name;
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--border-1)">' +
        '<div style="display:flex;justify-content:space-between;align-items:start">' +
        '<div style="flex:1"><strong>#' + ((page-1)*50 + i + 1) + '</strong> <span style="color:var(--primary-6);font-size:12px">' + (domainName || "") + '</span> ' + (q.stem || "").substring(0, 80) + '...</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0;margin-left:10px"><button onclick="editQuestion(' + q.id + ')" style="padding:2px 8px;border:1px solid var(--border-2);border-radius:4px;background:none;cursor:pointer;font-size:12px">编辑</button><button onclick="deleteQuestion(' + q.id + ')" style="padding:2px 8px;border:1px solid var(--danger-5);border-radius:4px;background:none;cursor:pointer;font-size:12px;color:var(--danger-5)">删除</button></div>' +
        '</div></div>';
    });
    document.getElementById("bank-question-list").innerHTML = html || '<div class="text-muted">暂无题目</div>';

    // Pagination
    var totalPages = Math.ceil(total / 50);
    var pagHtml = "";
    if (totalPages > 1) {
      pagHtml += '<button onclick="loadBankQuestions(' + (page-1) + ')" ' + (page<=1?'disabled':'') + ' style="padding:6px 12px;border:1px solid var(--border-2);border-radius:4px;background:none;cursor:pointer">上一页</button>';
      pagHtml += '<span class="text-muted"> ' + page + '/' + totalPages + ' </span>';
      pagHtml += '<button onclick="loadBankQuestions(' + (page+1) + ')" ' + (page>=totalPages?'disabled':'') + ' style="padding:6px 12px;border:1px solid var(--border-2);border-radius:4px;background:none;cursor:pointer">下一页</button>';
    }
    document.getElementById("bank-pagination").innerHTML = pagHtml;
  } catch(e) {
    document.getElementById("bank-question-list").innerHTML = '<div class="state-error">加载失败: ' + e.message + '</div>';
  }
}

function showAddQuestionForm() {
  document.getElementById("bank-add-form").style.display = "";
  document.getElementById("bank-batch-form").style.display = "none";
}

function showBatchImport() {
  document.getElementById("bank-batch-form").style.display = "";
  document.getElementById("bank-add-form").style.display = "none";
}

async function saveNewQuestion() {
  var domainId = document.getElementById("bank-new-domain").value;
  var stem = document.getElementById("bank-new-stem").value.trim();
  var optionsText = document.getElementById("bank-new-options").value.trim();
  var answer = document.getElementById("bank-new-answer").value.trim().toUpperCase();
  var source = document.getElementById("bank-new-source").value.trim();
  var subject = document.getElementById("bank-new-subject").value.trim();
  var analysis = document.getElementById("bank-new-analysis").value.trim();
  var imageUrl = (document.getElementById("bank-new-image")?.value || "").trim();

  if (!domainId || !stem || !answer) { alert("请填写领域、题目和答案"); return; }

  var options = optionsText.split("\n").filter(function(l) { return l.trim(); }).map(function(l) { return l.replace(/^[A-D][.、]?\s*/, "").trim(); });
  var optionsJson = JSON.stringify(options);

  try {
    // Create via direct API
    await apiPost("/questions", { domainId: parseInt(domainId), stem: stem, optionsJson: optionsJson, answer: answer, source: source || "MANUAL", subject: subject || "综合知识", analysis: analysis, imageUrl: imageUrl });
    alert("添加成功！");
    document.getElementById("bank-add-form").style.display = "none";
    document.getElementById("bank-new-stem").value = "";
    document.getElementById("bank-new-options").value = "";
    document.getElementById("bank-new-answer").value = "";
    document.getElementById("bank-new-analysis").value = "";
    var imgInput = document.getElementById("bank-new-image");
    if (imgInput) imgInput.value = "";
    loadBankQuestions();
    // Refresh territories
    loadTerritories();
  } catch(e) { alert("添加失败: " + e.message); }
}

async function batchImportQuestions() {
  var jsonText = document.getElementById("bank-batch-json").value.trim();
  if (!jsonText) { alert("请输入 JSON 数据"); return; }

  var lines = jsonText.split("\n").filter(function(l) { return l.trim(); });
  var success = 0, fail = 0;
  for (var i = 0; i < lines.length; i++) {
    try {
      var q = JSON.parse(lines[i]);
      var optionsJson = JSON.stringify(q.options || ["A","B","C","D"]);
      await apiPost("/questions", {
        domainId: q.domainId,
        stem: q.stem,
        optionsJson: optionsJson,
        answer: q.answer,
        source: q.source || "MANUAL",
        subject: q.subject || "综合知识",
        analysis: q.analysis || ""
      });
      success++;
    } catch(e) { fail++; }
  }
  document.getElementById("bank-batch-result").innerHTML = '<div style="padding:10px;background:var(--success-1);border-radius:8px;color:var(--success-6)">导入完成：成功 ' + success + ' 题，失败 ' + fail + ' 题</div>';
  document.getElementById("bank-batch-json").value = "";
  loadBankQuestions();
  loadTerritories();
}

async function deleteQuestion(id) {
  if (!confirm("确定删除此题目？")) return;
  try {
    await fetch(API + "/questions/" + id, { method: "DELETE" });
    loadBankQuestions();
    loadTerritories();
  } catch(e) { alert("删除失败: " + e.message); }
}

function editQuestion(id) {
  alert('编辑功能：请通过 API 直接修改\nPUT /api/questions/' + id + '\n编辑功能开发中');
}

/* ===== AI 模型设置 ===== */
var llmSettings = { configs: [], activeId: null, providers: [], modelPresets: {} };

async function renderLlmSettings(c) {
  try {
    var data = await apiGet("/llm/settings");
    llmSettings = data;
  } catch (e) {
    c.innerHTML = '<div class="state-error"><p>加载失败: ' + e.message + '</p></div>';
    return;
  }

  var active = llmSettings.configs.find(function(x) { return x.id === llmSettings.activeId; });
  var activeHtml = active
    ? '<div style="display:flex;align-items:center;gap:8px"><span class="hud-dot exp" style="width:8px;height:8px;border-radius:50%;background:var(--success-5);display:inline-block"></span>' +
      '<strong style="color:var(--success-6)">' + esc(active.displayName) + '</strong>' +
      '<span class="text-muted">' + esc(active.providerLabel) + ' · ' + esc(active.model || '—') + '</span></div>'
    : '<div class="text-muted">尚未选择生效提供方</div>';

  var listHtml = llmSettings.configs.map(function(cfg) {
    var isActive = cfg.id === llmSettings.activeId;
    var badges = '';
    if (isActive) badges += '<span style="padding:2px 8px;border-radius:999px;background:var(--success-1);color:var(--success-6);font-size:12px">生效中</span>';
    if (!cfg.enabled) badges += '<span style="padding:2px 8px;border-radius:999px;background:var(--danger-2);color:var(--danger-6);font-size:12px">已禁用</span>';
    if (!cfg.hasApiKey && cfg.provider !== 'MOCK') badges += '<span style="padding:2px 8px;border-radius:999px;background:var(--warning-1);color:var(--warning-6);font-size:12px">未填 Key</span>';

    var actions = '';
    if (!isActive) actions += '<button onclick="setActiveLlm(' + cfg.id + ')" style="padding:4px 10px;border:1px solid var(--success-5);border-radius:6px;background:var(--success-1);color:var(--success-6);cursor:pointer;font-size:12px">设为生效</button>';
    actions += '<button onclick="testLlm(' + cfg.id + ',this)" style="padding:4px 10px;border:1px solid var(--border-2);border-radius:6px;background:none;cursor:pointer;font-size:12px">测试</button>';
    actions += '<button onclick="editLlm(' + cfg.id + ')" style="padding:4px 10px;border:1px solid var(--border-2);border-radius:6px;background:none;cursor:pointer;font-size:12px">编辑</button>';
    if (!isActive) actions += '<button onclick="deleteLlm(' + cfg.id + ')" style="padding:4px 10px;border:1px solid var(--danger-5);border-radius:6px;background:none;color:var(--danger-5);cursor:pointer;font-size:12px">删除</button>';

    return '<div style="padding:14px;border:1px solid var(--border-1);border-radius:12px;background:var(--bg-card);' + (isActive ? 'border-color:var(--success-5);box-shadow:0 0 0 2px var(--success-1)' : '') + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
            '<strong>' + esc(cfg.displayName) + '</strong>' +
            '<span style="padding:2px 8px;border-radius:6px;background:var(--primary-2);color:var(--primary-6);font-size:12px">' + esc(cfg.providerLabel) + '</span>' +
            badges +
          '</div>' +
          '<div style="font-size:13px;color:var(--text-3);line-height:1.8">' +
            '<div>模型: <code style="background:var(--bg-surface-high);padding:1px 6px;border-radius:4px">' + esc(cfg.model || '—') + '</code></div>' +
            '<div>API Key: ' + (cfg.hasApiKey ? '<code>' + esc(cfg.apiKeyMasked) + '</code>' : '<span class="text-muted">未配置</span>') + '</div>' +
            '<div>Base URL: <span class="text-muted">' + esc(cfg.baseUrl || '—') + '</span> · 超时 ' + (cfg.timeoutSeconds || 30) + 's</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + actions + '</div>' +
      '</div>' +
      '<div class="llm-test-result" data-id="' + cfg.id + '" style="margin-top:8px"></div>' +
    '</div>';
  }).join('');

  c.innerHTML = '<div class="page-title">AI 模型</div>' +
    '<div class="page-subtitle">运行时切换大模型 · 多 Key 管理 · 连通性测试</div>' +
    '<div class="stack" style="margin-top:20px;gap:14px">' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">当前生效</div></div>' +
        '<div class="content-card-body">' + activeHtml + '</div></div>' +
      '<div class="content-card"><div class="content-card-header">' +
        '<div class="content-card-title">提供方配置 <span class="text-muted">(' + llmSettings.configs.length + ')</span></div>' +
        '<button onclick="showLlmForm()" style="padding:6px 14px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">+ 新增配置</button></div>' +
        '<div class="content-card-body"><div style="display:flex;flex-direction:column;gap:10px">' + (listHtml || '<div class="text-muted">暂无配置</div>') + '</div></div></div>' +
      '<div class="content-card" id="llm-form" style="display:none"><div class="content-card-header"><div class="content-card-title" id="llm-form-title">新增配置</div><button onclick="hideLlmForm()" style="padding:4px 10px;border:1px solid var(--border-2);border-radius:6px;background:none;cursor:pointer">关闭</button></div>' +
        '<div class="content-card-body">' + llmFormHtml() + '</div></div>' +
    '</div>';
}

function llmFormHtml() {
  var provOpts = llmSettings.providers.map(function(p) {
    return '<option value="' + p.value + '"' + (p.value === 'DEEPSEEK' ? '' : '') + '>' + esc(p.label) + '</option>';
  }).join("");
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div><label style="font-size:12px;color:var(--text-3)">提供方</label><select id="llm-provider" onchange="onLlmProviderChange()" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px">' + provOpts + '</select></div>' +
      '<div><label style="font-size:12px;color:var(--text-3)">显示名称</label><input id="llm-name" placeholder="如 我的 DeepSeek" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
    '</div>' +
    '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text-3)">API Key</label><input id="llm-apikey" type="password" placeholder="新建必填;编辑留空表示不修改" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
      '<div><label style="font-size:12px;color:var(--text-3)">Base URL</label><input id="llm-baseurl" placeholder="留空使用默认" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
      '<div><label style="font-size:12px;color:var(--text-3)">超时(秒)</label><input id="llm-timeout" type="number" value="30" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px"></div>' +
    '</div>' +
    '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text-3)">模型</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input id="llm-model" placeholder="如 glm-5.2 / deepseek-chat" style="flex:1;padding:8px;border:1px solid var(--border-2);border-radius:6px">' +
        '<select id="llm-model-preset" onchange="document.getElementById(\'llm-model\').value=this.value" style="padding:8px;border:1px solid var(--border-2);border-radius:6px"><option value="">常用模型...</option></select>' +
      '</div></div>' +
    '<div style="margin-top:10px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="llm-enabled" checked><label for="llm-enabled" style="font-size:13px">启用</label></div>' +
    '<button onclick="saveLlmConfig()" style="margin-top:12px;padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">保存</button>';
}

function onLlmProviderChange() {
  var prov = document.getElementById("llm-provider").value;
  var sel = document.getElementById("llm-model-preset");
  var presets = llmSettings.modelPresets[prov] || [];
  sel.innerHTML = '<option value="">常用模型...</option>' + presets.map(function(m) {
    return '<option value="' + m + '">' + m + '</option>';
  }).join("");
  // mock 不需要 Key/URL/模型
  var isMock = prov === 'MOCK';
  ["llm-apikey","llm-baseurl","llm-model"].forEach(function(id) {
    document.getElementById(id).disabled = isMock;
  });
}

var editingLlmId = null;

function showLlmForm() {
  editingLlmId = null;
  document.getElementById("llm-form-title").textContent = "新增配置";
  document.getElementById("llm-form").style.display = "";
  document.getElementById("llm-provider").value = "DEEPSEEK";
  document.getElementById("llm-provider").disabled = false;
  document.getElementById("llm-name").value = "";
  document.getElementById("llm-apikey").value = "";
  document.getElementById("llm-apikey").placeholder = "新建必填;编辑留空表示不修改";
  document.getElementById("llm-baseurl").value = "";
  document.getElementById("llm-timeout").value = "30";
  document.getElementById("llm-model").value = "";
  document.getElementById("llm-enabled").checked = true;
  onLlmProviderChange();
}

function editLlm(id) {
  var cfg = llmSettings.configs.find(function(x) { return x.id === id; });
  if (!cfg) return;
  editingLlmId = id;
  document.getElementById("llm-form-title").textContent = "编辑配置: " + cfg.displayName;
  document.getElementById("llm-form").style.display = "";
  document.getElementById("llm-provider").value = cfg.provider;
  document.getElementById("llm-provider").disabled = true;
  document.getElementById("llm-name").value = cfg.displayName;
  document.getElementById("llm-apikey").value = "";
  document.getElementById("llm-apikey").placeholder = cfg.hasApiKey ? ("已配置 " + cfg.apiKeyMasked + ", 留空不修改") : "未配置,请填写";
  document.getElementById("llm-baseurl").value = cfg.baseUrl || "";
  document.getElementById("llm-timeout").value = cfg.timeoutSeconds || 30;
  document.getElementById("llm-model").value = cfg.model || "";
  document.getElementById("llm-enabled").checked = cfg.enabled;
  onLlmProviderChange();
}

function hideLlmForm() {
  document.getElementById("llm-form").style.display = "none";
  editingLlmId = null;
}

async function saveLlmConfig() {
  var body = {
    provider: document.getElementById("llm-provider").value,
    displayName: document.getElementById("llm-name").value.trim(),
    apiKey: document.getElementById("llm-apikey").value,
    baseUrl: document.getElementById("llm-baseurl").value.trim(),
    model: document.getElementById("llm-model").value.trim(),
    timeoutSeconds: parseInt(document.getElementById("llm-timeout").value) || 30,
    enabled: document.getElementById("llm-enabled").checked
  };
  if (!body.displayName) { alert("请填写显示名称"); return; }
  if (body.provider !== 'MOCK') {
    if (!body.model) { alert("请填写模型名称"); return; }
    if (!editingLlmId && !body.apiKey) { alert("新建配置时 API Key 必填"); return; }
  }
  try {
    if (editingLlmId) {
      await apiPut("/llm/settings/" + editingLlmId, body);
    } else {
      await apiPost("/llm/settings", body);
    }
    hideLlmForm();
    await renderLlmSettings(content());
  } catch (e) { alert("保存失败: " + e.message); }
}

async function setActiveLlm(id) {
  try {
    await apiPut("/llm/settings/active/" + id, {});
    await renderLlmSettings(content());
  } catch (e) { alert("切换失败: " + e.message); }
}

async function deleteLlm(id) {
  if (!confirm("确定删除此配置?")) return;
  try {
    await apiDelete("/llm/settings/" + id);
    await renderLlmSettings(content());
  } catch (e) { alert("删除失败: " + e.message); }
}

async function testLlm(id, btn) {
  var box = document.querySelector('.llm-test-result[data-id="' + id + '"]');
  if (btn) { btn.disabled = true; btn.textContent = "测试中..."; }
  if (box) box.innerHTML = '<div class="text-muted" style="font-size:12px">正在连通测试...</div>';
  try {
    var res = await fetch(API + "/llm/settings/" + id + "/test", { method: "POST" });
    var json = await res.json().catch(function() { return {}; });
    var d = json.data || {};
    if (!res.ok && d.success === undefined) {
      d = { success: false, message: json.message || ('HTTP ' + res.status) };
    }
    if (box) {
      var color = d.success ? 'var(--success-6)' : 'var(--danger-6)';
      var bg = d.success ? 'var(--success-1)' : 'var(--danger-2)';
      box.innerHTML = '<div style="padding:8px 12px;border-radius:8px;background:' + bg + ';color:' + color + ';font-size:13px">' +
        (d.success ? '✓ ' : '✗ ') + esc(d.message) +
        (d.content ? '<div class="text-muted" style="margin-top:4px">回复: ' + esc(d.content).substring(0,120) + '</div>' : '') +
        '</div>';
    }
  } catch (e) {
    if (box) box.innerHTML = '<div style="padding:8px 12px;border-radius:8px;background:var(--danger-2);color:var(--danger-6);font-size:13px">✗ 请求异常: ' + e.message + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "测试"; }
  }
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}