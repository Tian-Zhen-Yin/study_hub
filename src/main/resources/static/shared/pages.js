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
      case "past-exams": await renderPastExams(c); break;
      case "kp-graph": await renderKpGraph(c); break;
      case "essay-insight": await renderEssayInsight(c); break;
      case "mcq-insight": await renderMcqInsight(c); break;
      case "memory-palace": await renderMemoryPalace(c); break;
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
  var modeNames = {practice:"自由练习",sequence:"顺序通关",random:"随机挑战",timed:"限时速答",intensive:"强化训练",endless:"无尽模式",daily:"每日挑战",smart:"智能推荐",case:"案例专项",supp:"架构补充"};
  var modeDescs = {practice:"自选领域，无压力",sequence:"按顺序逐个击破",random:"随机抽取，考验应变",timed:"每题限时，考验速度",intensive:"高频错题集中攻克",endless:"无限刷题，冲击高分",daily:"每日限时 20 题",smart:"按频率+薄弱度智能选题",case:"只出案例大题，按方向攻克",supp:"系统分析师真题，只刷架构师也考的考点"};
  var modeBtns = ["practice","sequence","random","timed","intensive","endless","daily","smart","supp"].map(function(m) {
    return '<button class="quiz-mode-btn" data-mode="' + m + '" onclick="startQuiz(\'' + m + '\')" style="padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-card);cursor:pointer;text-align:left;transition:all .15s"><div style="font-weight:600">' + modeNames[m] + '</div><div class="text-muted">' + modeDescs[m] + '</div></button>';
  }).join("");

  c.innerHTML = '<div id="quiz-layout-grid" style="display:grid;grid-template-columns:260px 1fr 260px;gap:20px;min-height:calc(100vh - 160px);transition:grid-template-columns .25s">' +
    '<div class="content-card" id="quiz-territory-card" style="max-height:calc(100vh - 160px);overflow-y:auto"><div class="content-card-header" style="cursor:pointer;user-select:none" onclick="toggleTerritoryPanel()"><div class="content-card-title">领地征伐</div><span id="quiz-territory-toggle" style="font-size:12px;color:var(--text-secondary);transition:transform .2s">▼</span></div><div class="content-card-body" id="quiz-territories"></div></div>' +
    '<div class="stack">' +
      '<div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none"><div class="content-card-body"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><div style="font-size:var(--font-size-h4);font-weight:600" id="quiz-mode-label">选择模式</div><div style="font-size:var(--font-size-caption);color:var(--hud-text-dim)" id="quiz-progress">--</div></div><div style="display:flex;flex-direction:column;gap:6px;flex:1;max-width:300px"><div class="hud-stat-row"><span class="hud-stat-label">HP</span><div class="stat-bar"><div class="stat-bar-fill hp" id="quiz-hp-bar" style="width:100%"></div></div><span id="quiz-hp-text" style="color:var(--hud-text);font-size:12px">100</span></div><div class="hud-stat-row"><span class="hud-stat-label">⚡</span><div class="stat-bar"><div class="stat-bar-fill exp" id="quiz-combo-bar" style="width:0%"></div></div><span id="quiz-combo-text" style="color:var(--hud-text);font-size:12px">Combo x0</span></div></div></div></div></div>' +
      '<div class="content-card" id="quiz-mode-select"><div class="content-card-header"><div class="content-card-title">选择战斗模式</div></div><div class="content-card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + modeBtns + '</div><div style="margin-top:12px;display:flex;gap:10px;align-items:center"><label style="font-size:14px;white-space:nowrap">领域：</label><select id="quiz-domain-select" style="flex:1;padding:8px;border:1px solid var(--border-2);border-radius:6px">' + domainOpts + '</select><button onclick="startBossBattle()" style="padding:8px 16px;background:linear-gradient(135deg,var(--danger-5),var(--danger-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Boss 战</button></div>' +
        '<div id="case-special-panel" style="margin-top:14px;border:1px solid var(--primary-3);border-radius:10px;overflow:hidden">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:linear-gradient(135deg,var(--primary-2),var(--primary-1));flex-wrap:wrap">' +
            '<div><span style="font-size:14px;font-weight:700">📖 案例分析专项</span><span style="font-size:11px;color:var(--text-2);margin-left:8px">下午·应用技术 · 5道大题任选3道作答 · 每题25分 · 45分及格</span></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><button onclick="toggleCaseTechniques()" style="padding:4px 12px;font-size:12px;border:1px solid var(--primary-5);background:var(--bg-card);color:var(--primary-6);border-radius:6px;cursor:pointer;font-weight:600">答题技巧 ▾</button><button onclick="toggleCaseKp()" style="padding:4px 12px;font-size:12px;border:1px solid var(--primary-5);background:var(--bg-card);color:var(--primary-6);border-radius:6px;cursor:pointer;font-weight:600">常考知识点 ▾</button></div>' +
          '</div>' +
          '<div id="case-techniques" style="display:none;border-top:1px solid var(--border-1);padding:12px 14px;background:var(--bg-card);font-size:12px;line-height:1.8">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              '<div><div style="font-weight:700;margin-bottom:4px;color:var(--primary-6)">四步做题法</div>' +
                '<div style="color:var(--text-2)"><strong>① 先读问题再读材料</strong>——材料长、时间紧，带着小问回材料定位，省一半时间；<br><strong>② 圈关键词</strong>——"高并发""跨部门""预算/工期受限"等业务特征就是考点信号，直接对应质量属性与架构决策；<br><strong>③ 分点作答</strong>——按 ①②③ 编号、一点一行（1~2行），阅卷按点给分，大段落不加分；<br><strong>④ 术语规范</strong>——用教材术语（质量属性六要素、敏感点/权衡点、限界上下文、Cache Aside…），忌口语化。</div></div>' +
              '<div><div style="font-weight:700;margin-bottom:4px;color:var(--primary-6)">高频小问套路 & 时间取舍</div>' +
                '<div style="color:var(--text-2)"><strong>填空补全</strong>：答案常在材料上下文的并列/对仗句里，结合特征表回忆；<br><strong>问题→对策</strong>：成对作答，一条问题配一条改进措施；<br><strong>选型比较</strong>：先给结论，再按"质量属性+业务约束"逐项对比；<br><strong>建模题</strong>：按"参与者/边界/控制/实体/关系"清单式罗列防遗漏。<br>—— 每题≤30分钟（90分钟3题），单小问卡壳5分钟先跳过；五选三先扫一遍5道题挑最熟悉的方向（近几次真题常含嵌入式/新兴技术题，没把握就避开）；平时就用键盘完整作答，练机考输入手感。</div></div>' +
            '</div>' +
          '</div>' +
          '<div id="case-kp" style="display:none;border-top:1px solid var(--border-1);max-height:460px;overflow-y:auto"></div>' +
          '<div style="padding:10px 12px;border-top:1px solid var(--border-1)">' +
            '<div style="font-size:12px;font-weight:600;margin-bottom:8px">按方向开始练习 <span class="text-muted" style="font-weight:400">（完整案例材料，作答后对照要点自评）</span></div>' +
            '<div id="case-topic-chips" style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px">加载中...</div>' +
          '</div>' +
        '</div><div id="priority-panel" style="margin-top:14px;padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-1)"><div style="font-size:13px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between"><span>🎯 复习优先级 TOP 5</span><button onclick="loadPriorityList()" style="padding:2px 8px;font-size:11px;background:var(--primary-1);color:var(--primary-6);border:none;border-radius:4px;cursor:pointer">刷新</button></div><div id="priority-list" style="font-size:12px;color:var(--text-2)">加载中...</div></div><div id="weak-kp-panel" style="margin-top:10px;padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-1)"><div style="font-size:13px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between"><span>🧩 薄弱考点 TOP 5</span><button onclick="loadWeakKpList()" style="padding:2px 8px;font-size:11px;background:var(--primary-1);color:var(--primary-6);border:none;border-radius:4px;cursor:pointer">刷新</button></div><div id="weak-kp-list" style="font-size:12px;color:var(--text-2)">加载中...</div></div></div></div>' +
      '<div class="content-card" id="quiz-question-card" style="display:none"><div class="content-card-header"><div class="content-card-title" id="quiz-q-num">第 1 题</div><span class="text-muted" id="quiz-q-source"></span><span id="quiz-q-history"></span><span id="quiz-flag-area" style="margin-left:auto"></span><span id="quiz-timer" style="display:none;font-size:14px;font-weight:700;padding:2px 10px;border-radius:6px;background:var(--danger-2);color:var(--danger-6)">⏱ 30s</span></div><div class="content-card-body"><div id="quiz-flag-panel" style="display:none;margin-bottom:14px;padding:12px;border:1px solid var(--danger-3,#fa9ea3);border-radius:8px;background:var(--danger-1,#fef4f4)"></div><div id="quiz-q-image" class="quiz-stem-image"></div><div style="font-size:16px;line-height:1.7;margin-bottom:20px" id="quiz-q-stem"></div><div id="quiz-options" style="display:flex;flex-direction:column;gap:10px"></div><div id="quiz-feedback" style="display:none;margin-top:16px;padding:12px;border-radius:8px"></div><div style="margin-top:16px;display:flex;gap:10px"><button id="quiz-next-btn" style="display:none;padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="nextQuestion()">下一题</button><button id="quiz-finish-btn" style="display:none;padding:10px 24px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="finishQuiz()">完成战斗</button></div></div></div>' +
    '</div>' +
    '<div class="content-card" style="max-height:calc(100vh - 160px);overflow-y:auto"><div class="content-card-header"><div class="content-card-title">答题阵法</div><span class="text-muted" id="quiz-sheet-progress" style="font-size:12px"></span></div><div class="content-card-body"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px" id="quiz-sheet-grid"></div><div id="quiz-sheet-legend" style="margin-top:10px;display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-2)"><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--success-2);border:1.5px solid var(--success-5)"></span><span>已答对</span></div><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--danger-2);border:1.5px solid var(--danger-5)"></span><span>已答错</span></div><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--bg-card);border:1.5px solid var(--border-2)"></span><span>未作答</span></div></div></div></div>' +
    '</div>';
  renderQuizTerritories(territories, domains);
  restoreTerritoryPanel();
  loadPriorityList();
  loadWeakKpList();
  loadCaseTopics();
}

/* ===== 案例分析专项 ===== */
function loadCaseTopics() {
  var el = document.getElementById("case-topic-chips");
  if (!el) return;
  apiGet("/quiz/case-summary").then(function(list) {
    if (!list || !list.length) { el.innerHTML = '<span class="text-muted">题库暂无案例题</span>'; return; }
    el.innerHTML = list.map(function(item) {
      var primary = !item.topic;
      var label = (item.topic ? item.topic : "全部方向") + " · " + item.count + " 题";
      return '<button onclick="startCasePractice(' + (item.topic ? '\'' + item.topic + '\'' : "null") + ')" style="padding:6px 14px;border-radius:16px;border:1px solid ' + (primary ? "var(--primary-5)" : "var(--border-2)") + ';background:' + (primary ? "var(--primary-6)" : "var(--bg-card)") + ';color:' + (primary ? "#fff" : "var(--text-1)") + ';cursor:pointer;font-size:12px;font-weight:' + (primary ? "600" : "400") + ';transition:all .15s">' + label + '</button>';
    }).join("");
  }).catch(function() { el.innerHTML = '<span class="text-muted">加载失败</span>'; });
}

function toggleCaseTechniques() {
  var el = document.getElementById("case-techniques");
  if (!el) return;
  el.style.display = el.style.display === "none" ? "" : "none";
}

var caseKpLoaded = false;
function toggleCaseKp() {
  var el = document.getElementById("case-kp");
  if (!el) return;
  var show = el.style.display === "none";
  el.style.display = show ? "" : "none";
  if (show && !caseKpLoaded) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">加载中...</div>';
    fetch("/pages/case-kp.html?v=20260922f").then(function(r) { return r.text(); }).then(function(h) {
      el.innerHTML = h; caseKpLoaded = true;
    }).catch(function() {
      el.innerHTML = '<div style="padding:12px;color:var(--danger-6);font-size:12px">加载失败，再点一次按钮重试</div>';
    });
  }
}

function startCasePractice(topic) {
  startQuiz("case", { questionType: "CASE", caseTopic: topic || null, count: topic ? 99 : 5, ignoreDomain: true });
}

function loadPriorityList() {
  var el = document.getElementById("priority-list");
  if (!el) return;
  apiGet("/stats/priority").then(function(list) {
    if (!list || !list.length) { el.innerHTML = "暂无数据"; return; }
    var html = list.slice(0, 5).map(function(item, i) {
      var color = item.recommend === "HIGH" ? "var(--danger-6)" : item.recommend === "MEDIUM" ? "var(--warning-6)" : "var(--text-2)";
      var badge = item.recommend === "HIGH" ? "🔥" : item.recommend === "MEDIUM" ? "⭐" : "";
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-1)">' +
        '<span style="color:' + color + '">' + badge + ' ' + (i+1) + '. ' + item.name + '</span>' +
        '<span style="font-size:11px;color:var(--text-3)">频率' + item.frequency + '% 掌握' + item.mastery + '%</span>' +
        '</div>';
    }).join("");
    el.innerHTML = html;
  }).catch(function() { el.innerHTML = "加载失败"; });
}

function loadWeakKpList() {
  var el = document.getElementById("weak-kp-list");
  if (!el) return;
  apiGet("/stats/kp-mastery").then(function(list) {
    if (!list || !list.length) { el.innerHTML = "暂无考点数据"; return; }
    el.innerHTML = list.slice(0, 5).map(function(item, i) {
      var rateText = item.correctRate == null ? '<span style="color:var(--text-muted)">未作答</span>'
        : '<span style="color:' + (item.correctRate < 50 ? "var(--danger-6)" : "var(--warning-6)") + '">正确率 ' + item.correctRate + '%</span>';
      var mastered = item.mastery >= 70;
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-1)">' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escMem(item.domainName + ' · ' + item.kp) + '">' + (i+1) + '. ' + escMem(item.kp) + '</span>' +
        '<span style="font-size:11px;white-space:nowrap">' + (mastered ? '<span style="color:var(--success-6)">已掌握</span>' : rateText) + ' <span style="color:var(--text-3)">' + item.questionCount + '题</span></span>' +
        '</div>';
    }).join("");
  }).catch(function() { el.innerHTML = "加载失败"; });
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

async function startQuiz(mode, opts) {
  opts = opts || {};
  quizState.mode = mode;
  quizState.domainId = opts.ignoreDomain ? null : (parseInt(document.getElementById("quiz-domain-select").value) || null);
  quizState.combo = 0; quizState.maxCombo = 0; quizState.hp = 100;
  quizState.currentIdx = 0; quizState.answers = []; quizState.startTime = Date.now();

  try {
    var body = { mode: mode === "supp" ? "random" : mode, count: opts.count || ((mode === "timed" || mode === "daily") ? 20 : (mode === "case" ? 5 : 30)) };
    if (mode === "supp") { body.source = "CHEKO_SUPP"; quizState.domainId = null; }
    else if (quizState.domainId) body.domainId = quizState.domainId;
    if (opts.questionType) body.questionType = opts.questionType;
    if (opts.caseTopic) body.caseTopic = opts.caseTopic;
    quizState.questions = await apiPost("/quiz/set", body);
  } catch(e) {
    quizState.questions = (await loadQuestions(quizState.domainId, 30)).filter(function(q) {
      return !opts.questionType || q.type === opts.questionType;
    });
  }

  if (!quizState.questions.length) { alert("该领域暂无题目"); return; }

  document.getElementById("quiz-mode-select").style.display = "none";
  document.getElementById("quiz-question-card").style.display = "";
  var names = {practice:"自由练习",sequence:"顺序通关",random:"随机挑战",timed:"限时速答",intensive:"强化训练",endless:"无尽模式",daily:"每日挑战",smart:"智能推荐",case:"案例专项",supp:"架构补充"};
  document.getElementById("quiz-mode-label").textContent = names[mode] + (opts.caseTopic ? " · " + opts.caseTopic : "");
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
  document.getElementById("quiz-q-source").textContent = (q.source === "CHEKO_SUPP" ? "系分补充" : (q.source || q.examYear || ""));
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
    var html = (typeof renderQuestionImageHtml === "function" && !(q.stem && String(q.stem).indexOf("【图:") >= 0)) ? renderQuestionImageHtml(q.imageUrl) : "";
    imgEl.innerHTML = html;
    imgEl.style.display = html ? "" : "none";
  }
  var stemEl = document.getElementById("quiz-q-stem");
  stemEl.innerHTML = renderStemHtml(q.stem);
  var qType = q.type || "MCQ";
  var isSubjective = qType === "CASE" || qType === "ESSAY";
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
    html += '<div style="margin-bottom:12px;padding:8px 12px;border-radius:6px;background:var(--warning-1,#fef7e6);border:1px solid var(--warning-3,#fcd34d);font-size:12px;line-height:1.7;color:var(--warning-7,#92400e)">💡 技巧：先通读下方小问再回材料定位；作答分点 ①②③、一点一行；用教材术语（质量属性六要素、敏感点/权衡点、限界上下文等），忌口语化。</div>';
  }

  if (qType === "CASE") {
    // 小问列表 + 每问作答框
    parts.forEach(function(p, k) {
      html += '<div style="margin-bottom:12px;padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-surface,#fafafa)">' +
        '<div style="font-weight:600;font-size:14px;margin-bottom:8px">问题' + (p.no || (k + 1)) + (p.score ? '（' + p.score + '分）' : '') + '：' + escInlineMd(p.q || p.question || "") + '</div>' +
        subjectiveAnswerBox(i, k, answered) +
        '</div>';
    });
  } else {
    // 论文：写作要求 + 大作答框
    if (parts.length) {
      html += '<div style="padding:10px 12px;border-left:3px solid var(--primary-5);background:var(--primary-1);border-radius:6px;margin-bottom:12px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:4px">写作要求</div>' +
        parts.map(function(p) { return '<div style="font-size:12px;color:var(--text-2);margin:3px 0">· <strong>' + escInlineMd(p.label || '') + '</strong> ' + escInlineMd(p.req || p.requirement || String(p)) + '</div>'; }).join("") +
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
  var analysisHtml = "";
  if (q.analysis) {
    var analysisText = String(q.analysis).replace(/\r/g, "");
    var isMdAnalysis = /(^|\n)#{1,3}\s|(^|\n)\|.*\||\*\*.+?\*\*/.test(analysisText);
    analysisHtml = isMdAnalysis
      ? '<div class="material-body" style="font-size:12px;line-height:1.8;color:var(--text-2)">' + simpleMarkdown(analysisText) + '</div>'
      : escMem(analysisText);
  }
  var html = '<div style="margin-top:14px;padding:14px;border-radius:8px;border:1px solid var(--success-5,#34d399);background:var(--success-1,#f0fdf4)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
    '<div style="font-weight:600;font-size:14px;color:var(--success-6,#059669)">参考答案要点</div>' +
    (grade ? '<span style="font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;background:' + (gradeColors[grade] || "") + '">自评：' + (gradeNames[grade] || grade) + '</span>' : '') +
    '</div>' +
    answerHtml +
    (q.analysis ? '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-2);font-size:12px;line-height:1.8;color:var(--text-2)"><strong>评分标准：</strong>' + analysisHtml + '</div>' : '') +
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
  fb.innerHTML = correct ? ("正确！" + (q.analysis ? "<br><small style='color:var(--text-2)'>" + fmtAnalysis(q.analysis) + "</small>" : "")) : ("错误！正确答案是 <strong>" + q.answer + "</strong>" + (q.analysis ? "<br><small style='color:var(--text-2)'>" + fmtAnalysis(q.analysis) + "</small>" : ""));

  if (!correct) {
    fb.innerHTML += '<div id="ai-tutor-area" style="margin-top:10px"><button id="ai-tutor-btn" onclick="requestAiTutor(' + q.id + ',\'' + letter + '\')" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">🤖 AI 辅导</button>' +
      '<button id="variants-btn" onclick="showVariants(' + q.id + ')" style="margin-left:8px;padding:8px 16px;background:#fff;color:var(--primary-6);border:1.5px solid var(--primary-5);border-radius:8px;cursor:pointer;font-weight:600">🎯 举一反三</button></div>' +
      '<div id="variants-area" style="margin-top:10px"></div>';
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
      if (res && res.meta && res.meta.knowledgePoint) {
        var vb = document.getElementById("variants-btn");
        if (vb) vb.textContent = "🎯 举一反三 · " + (res.meta.knowledgePoint || "") + (res.meta.variantCount > 0 ? "（" + res.meta.variantCount + " 道变式）" : "（无变式）");
        if (vb && !res.meta.variantCount) vb.disabled = true;
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

/* 解析轻量 Markdown 渲染：**加粗**、换行；先转义防注入 */
function fmtAnalysis(t) {
  if (!t) return "";
  var s = escMem(t);
  s = s.replace(/(^|\n)\s*[-*]\s+/g, "$1• ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\n/g, "<br>");
  return s;
}

/* 题干渲染:含 markdown 结构(加粗/表格/列表/代码/换行)走 simpleMarkdown,纯文本走转义 */
function renderStemHtml(t) {
  if (!t) return "";
  t = String(t).replace(/\r/g, "");
  if (/(\*\*|`|\n|^\s*#{1,3}\s|^\s*[-*]\s|^\s*\d+\.\s|\|.*\|)/m.test(t)) return mdInlineImages(simpleMarkdown(t));
  return mdInlineImages(escMem(t));
}

/** 行内轻量 Markdown：转义后仅渲染加粗/行内代码（案例小问、写作要求用） */
/* 题干/小问中的【图: url】占位符就地还原为图片（导入时题图下载到 /uploads/ 并替换为占位符） */
function mdInlineImages(html) {
  if (!html || html.indexOf("【图") < 0) return html;
  return html.replace(/【图[:\uff1a]\s*([^\u3011\s]+)\u3011/g, function(m, url) {
    var safe = safeImageUrl(url);
    if (!safe) return m;
    return '<div style="text-align:center;margin:10px 0"><img src="' + safe + '" alt="题图" loading="lazy" style="max-width:100%;max-height:440px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-low);object-fit:contain" onerror="this.parentNode.style.display=\'none\'"></div>';
  });
}

function escInlineMd(t) {
  return mdInlineImages(escMem(t == null ? "" : String(t).replace(/\r/g, ""))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>"));
}

/* 举一反三：加载同考点变式题（只读学习视图，不干扰当前答题流程） */
async function showVariants(questionId) {
  var btn = document.getElementById("variants-btn");
  var area = document.getElementById("variants-area");
  if (btn) { btn.disabled = true; btn.textContent = "加载中..."; }
  if (!area) return;
  try {
    var vs = await apiGet("/quiz/variants/" + questionId + "?count=3");
    if (!vs || !vs.length) {
      area.innerHTML = '<div style="padding:10px;background:var(--bg-card);border:1px solid var(--border-2);border-radius:8px;color:var(--text-muted);font-size:13px">该考点暂无其他变式题，先掌握好这一道吧</div>';
      return;
    }
    area.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:6px">同考点变式题（点击展开答案与解析）：</div>' +
      vs.map(function(v, i) {
        return '<div style="margin-bottom:8px;background:var(--bg-card);border:1px solid var(--border-2);border-radius:8px;overflow:hidden">' +
          '<div onclick="toggleVariant(' + i + ')" style="padding:10px 12px;cursor:pointer;font-size:13px;color:var(--text-1);line-height:1.6"><span style="color:var(--primary-6);font-weight:700;margin-right:6px">' + (i + 1) + '.</span>' + mdInlineImages(escMem(v.stem || "")) + '</div>' +
          '<div id="variant-detail-' + i + '" style="display:none;padding:0 12px 10px;border-top:1px dashed var(--border-2)">' +
            '<div style="padding:8px 0;font-size:13px;color:var(--text-2)">' + renderVariantOptions(v) + '</div>' +
            '<div style="font-size:13px"><span style="font-weight:700;color:var(--success-6)">答案：' + escMem(v.answer || "") + '</span></div>' +
            '<div style="font-size:12px;color:var(--text-2);line-height:1.7;margin-top:4px">' + fmtAnalysis(v.analysis || "暂无解析") + '</div>' +
          '</div></div>';
      }).join("");
    if (btn) { btn.textContent = "🎯 已展开变式"; }
  } catch (e) {
    area.innerHTML = '<div style="padding:10px;background:var(--danger-2);border-radius:8px;color:var(--danger-6);font-size:13px">变式题加载失败：' + escMem(e.message) + '</div>';
    if (btn) { btn.disabled = false; btn.textContent = "🎯 举一反三"; }
  }
}

function renderVariantOptions(v) {
  try {
    var opts = typeof v.options === "string" ? JSON.parse(v.options) : (v.options || []);
    if (!opts.length) return "";
    var letters = ["A", "B", "C", "D", "E", "F"];
    return opts.map(function(o, i) { return letters[i] + ". " + escMem(String(o)); }).join("&nbsp;&nbsp;&nbsp;");
  } catch (e) { return ""; }
}

function toggleVariant(i) {
  var el = document.getElementById("variant-detail-" + i);
  if (el) el.style.display = el.style.display === "none" ? "" : "none";
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
  html += '<div style="font-size:14px;line-height:1.85;color:var(--text-1)">' + formatTutorExplanation(explanation) + '</div>';
  html += '</div>';
  return html;
}

function formatTutorExplanation(text) {
  var safe = escMem(text);
  // 在结构标记前断段：错因分析(首段) | 核心知识点 | 记住口诀 | 避免再犯 | 易混淆 | 小结
  var marked = safe.replace(/(核心知识点|记住口诀|避免再犯|易混淆|小结|知识拓展|拓展)/g, "\n$1");
  var blocks = marked.split(/\n+/).map(function(s) { return s.trim(); }).filter(Boolean);
  // 若断段后仍只有一段长文本,按连接词兜底分段
  if (blocks.length === 1 && blocks[0].length > 100) {
    blocks = blocks[0].split(/(?=首先|其次|然后|最后|另外|此外|因此|建议[^将]|结合你|注意)/).filter(Boolean);
  }
  var html = '';
  blocks.forEach(function(raw, idx) {
    var bg = "transparent", bar = "var(--border-3)", pad = "4px 12px";
    var isLabeled = idx > 0 && /^(核心知识点|记住口诀|避免再犯|易混淆|小结|知识拓展|拓展)/.test(raw);
    if (isLabeled) {
      bg = "var(--primary-1)"; bar = "var(--primary-5)"; pad = "8px 12px";
      var body = raw;
      if (/^记住口诀/.test(raw)) { bg = "var(--warning-1)"; bar = "var(--warning-5)"; }
      else if (/^(避免再犯|小结)/.test(raw)) { bg = "var(--success-1)"; bar = "var(--success-5)"; }
      // 标记词加粗显示
      raw = raw.replace(/^(\S{2,8}?)(?=[：:是]|$)/, "<strong>$1</strong>");
    }
    var content = highlightKeywords(enumBreaks(mdBold(raw)));
    html += '<div style="margin:' + (isLabeled ? '10px' : '6px') + ' 0;padding:' + pad + ';background:' + bg + ';border-left:3px solid ' + bar + ';border-radius:6px;font-size:13.5px;line-height:1.95;color:var(--text-1)">' + content + '</div>';
  });
  return html || escMem(text);
}

/* ①②③ 编号断行成缩进列表 */
function enumBreaks(t) {
  return t.replace(/([①②③④⑤⑥⑦⑧⑨⑩])/g, "<br>&nbsp;&nbsp;&nbsp;$1");
}

/* **加粗** Markdown */
function mdBold(t) {
  return t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
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
      '<div style="font-size:14px;line-height:1.8;background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border-1)">' + fmtAnalysis(card.questionAnalysis || "暂无解析") + '</div>' +
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
var simState = { phase:"idle", simId:null, sections:[], currentSection:0, answers:{}, currentIdx:0, startTime:0, timer:null, sectionRemaining:{}, sectionResults:{}, submitting:false };

async function renderSimulation(c) {
  var sims = [];
  try { sims = await apiGet("/simulations"); } catch(e) {}

  if (simState.phase === "exam") { renderSimExam(c); return; }
  if (simState.phase === "sectionResult") { renderSimSectionResult(c); return; }
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
    simState.simId = data.simulationId;
    simState.sections = data.sections || [];
    simState.answers = {};
    simState.sectionResults = {};
    simState.sectionRemaining = {};
    simState.submitting = false;
    simState.currentSection = 0;
    simState.currentIdx = 0;
    simState.sections.forEach(function(s) {
      simState.sectionRemaining[s.key] = s.durationMinutes * 60;
    });
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
    var submitted = !!simState.sectionResults[s.key];
    var label = submitted ? s.name + " ✓已交卷" : s.name + " (" + countSectionAnswered(s) + "/" + s.totalQuestions + ")";
    return '<button onclick="switchSection(' + i + ')" style="padding:8px 16px;border:' + (active?"2px solid var(--primary-5)":"1px solid var(--border-2)") + ';background:' + (active?"var(--primary-3)":"var(--bg-card)") + ';border-radius:8px;cursor:pointer;font-weight:' + (active?"700":"500") + ';font-size:13px;' + (submitted && !active ? "opacity:.65" : "") + '">' + label + '</button>';
  }).join("");

  c.innerHTML = '<div style="display:grid;grid-template-columns:1fr 240px;gap:20px;min-height:calc(100vh - 160px)">' +
    '<div class="stack">' +
      '<div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none">' +
        '<div class="content-card-body" style="display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-size:18px;font-weight:600">' + sec.name + '</div>' +
          '<div style="font-size:12px;color:var(--hud-text-dim)">第 ' + (simState.currentIdx+1) + ' / ' + sec.totalQuestions + ' 题 · ' + sec.questionType + ' · ' + sec.scoringRule + '</div></div>' +
          '<div style="text-align:right"><div id="sim-timer" style="font-size:28px;font-weight:700;font-family:monospace">' + formatTime(simState.sectionRemaining[sec.key] || 0) + '</div>' +
          '<div style="font-size:12px;color:var(--hud-text-dim)">' + sec.name + '剩余时间</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + tabsHtml + '</div>' +
      '<div class="content-card" id="sim-question-card"><div class="content-card-body" id="sim-question-body"></div></div>' +
      '<div style="display:flex;gap:10px;justify-content:space-between">' +
        '<button id="sim-prev-btn" onclick="simPrev()" style="padding:10px 24px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-weight:600">上一题</button>' +
        '<button onclick="confirmSubmitSection()" style="padding:10px 24px;background:var(--danger-5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">交卷（' + sec.name + '）</button>' +
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
    contentHtml = '<div style="font-size:16px;line-height:1.8;margin-bottom:20px">' + renderStemHtml(q.stem) + '</div>' +
      '<textarea id="essay-textarea" oninput="updateEssayAnswer(' + q.id + ', this.value)" placeholder="请在此处撰写论文..." style="width:100%;min-height:400px;padding:16px;border:1.5px solid var(--border-2);border-radius:8px;font-size:14px;line-height:1.8;resize:vertical;font-family:inherit;background:var(--bg-card);color:var(--text-primary)">' + escMem(userText) + '</textarea>' +
      '<div style="margin-top:8px;display:flex;justify-content:space-between;font-size:12px;color:var(--text-2)"><span>字数: <span id="essay-word-count">' + userText.length + '</span></span><span>建议 2000-3000 字</span></div>' +
      '<div style="margin-top:12px;padding:12px;background:var(--bg-surface-high);border-radius:8px"><div style="font-weight:600;margin-bottom:6px;font-size:13px">自评打分</div>' +
      '<div style="display:flex;align-items:center;gap:12px"><input type="range" id="essay-self-score" min="0" max="75" value="' + (simState.answers[answerKey + "_score"] || 0) + '" oninput="updateEssayScore(' + q.id + ', this.value)" style="flex:1"><span id="essay-score-display" style="font-weight:700;font-size:18px;color:var(--primary-5)">' + (simState.answers[answerKey + "_score"] || 0) + '</span><span class="text-muted">/75</span></div>' +
      '<div style="margin-top:8px;font-size:12px;color:var(--text-2)">交卷后可查看评分标准进行对照</div></div>';
  } else if (sec.key === "case") {
    contentHtml = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<span style="padding:2px 8px;border-radius:4px;background:var(--primary-5);color:#fff;font-size:12px">第' + (simState.currentIdx+1) + '题</span>' +
      '</div>' +
      '<div style="font-size:16px;line-height:1.7;margin-bottom:20px">' + renderStemHtml(q.stem) + '</div>' +
      '<div id="sim-case-body">' + renderSimCaseBody(sec.key, q, answerKey) + '</div>';
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
      '<div style="font-size:16px;line-height:1.7;margin-bottom:20px">' + renderStemHtml(q.stem) + '</div>' +
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

/* ===== 模拟考·案例分析：小问作答 + 对照参考答案自评（与刷题页 renderSubjective 同一套交互） ===== */
var SIM_CASE_GRADE_NAMES = { SELF_PASS: "✓ 完全掌握", SELF_PARTIAL: "◐ 部分掌握", SELF_FAIL: "✗ 未掌握" };
var SIM_CASE_GRADE_COLORS = { SELF_PASS: "var(--success-2);color:var(--success-7)", SELF_PARTIAL: "var(--warning-1,#fef7e6);color:var(--warning-6,#b45309)", SELF_FAIL: "var(--danger-2);color:var(--danger-7)" };
var SIM_CASE_GRADE_SCORES = { SELF_PASS: 15, SELF_PARTIAL: 9, SELF_FAIL: 3 };

function simCaseSubQuestions(q) {
  var parts = [];
  try { parts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch(e) {}
  return Array.isArray(parts) ? parts : [];
}

function renderSimCaseBody(sectionKey, q, answerKey) {
  var grade = simState.answers[answerKey];
  var parts = simCaseSubQuestions(q);

  // 防御：若题库存的是字母选项（字符串数组），退回选择题渲染
  if (parts.length && typeof parts[0] === "string") {
    return '<div style="display:flex;flex-direction:column;gap:10px">' + parts.map(function(opt, oi) {
      var letter = String.fromCharCode(65 + oi);
      var selected = simState.answers[answerKey] === letter ? "var(--primary-3);border-color:var(--primary-5)" : "var(--bg-card)";
      return '<div onclick="selectSimAnswer(\'' + letter + '\')" style="padding:12px;border:1.5px solid var(--border-2);border-radius:8px;cursor:pointer;background:' + selected + ';transition:all .15s"><span style="font-weight:600;margin-right:8px">' + letter + '.</span><span>' + escMem(opt) + '</span></div>';
    }).join("") + '</div>';
  }

  var html = '<div style="margin-bottom:12px;padding:8px 12px;border-radius:6px;background:var(--warning-1,#fef7e6);border:1px solid var(--warning-3,#fcd34d);font-size:12px;line-height:1.7;color:var(--warning-7,#92400e)">💡 案例分析为主观题：逐问作答后对照参考答案自评（完全掌握 15 分 / 部分掌握 9 分 / 未掌握 3 分），再进入下一题。</div>';

  parts.forEach(function(p, k) {
    var text = simState.answers[answerKey + "_sub_" + k] || "";
    html += '<div style="margin-bottom:12px;padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-surface,#fafafa)">' +
      '<div style="font-weight:600;font-size:14px;margin-bottom:8px">问题' + (p.no || (k + 1)) + (p.score ? '（' + p.score + '分）' : '') + '：' + escInlineMd(p.q || p.question || "") + '</div>' +
      '<textarea id="sim-case-sub-' + k + '" oninput="simCaseInput(\'' + answerKey + '\',' + k + ', this.value)" placeholder="写下你的答案要点..." style="width:100%;min-height:90px;padding:10px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;line-height:1.7;resize:vertical;box-sizing:border-box;font-family:inherit;background:var(--bg-card);color:var(--text-primary)">' + escMem(text) + '</textarea>' +
      '</div>';
  });

  if (grade) {
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:' + (SIM_CASE_GRADE_COLORS[grade] || "var(--bg-surface-high)") + ';font-weight:600;font-size:13px">' +
      '自评：' + (SIM_CASE_GRADE_NAMES[grade] || grade) + '（本题 ' + (SIM_CASE_GRADE_SCORES[grade] || 0) + ' / 15 分）' +
      '<button onclick="simCaseRegrade(\'' + answerKey + '\')" style="margin-left:auto;padding:4px 12px;background:var(--bg-card);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;font-size:12px">重新自评</button></div>';
  } else {
    html += '<button onclick="simCaseReveal(\'' + answerKey + '\',' + q.id + ')" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">完成本题，对照参考答案自评</button>';
  }
  return html;
}

function simCaseInput(answerKey, k, val) {
  simState.answers[answerKey + "_sub_" + k] = val;
}

function simCaseReferenceHtml(q) {
  var answerText = q.answer || "暂无参考答案";
  var isMd = /(^|\n)#{1,3}\s|(^|\n)\|.*\||\*\*.+?\*\*/.test(answerText);
  return isMd
    ? '<div class="material-body" style="font-size:13px;line-height:1.9;color:var(--text-primary)">' + simpleMarkdown(answerText) + '</div>'
    : '<div style="font-size:13px;line-height:1.9;white-space:pre-wrap;color:var(--text-primary)">' + escMem(answerText) + '</div>';
}

/** 评分标准/解析：含表格等 markdown 结构走 simpleMarkdown，纯文本走转义 */
function simCaseAnalysisHtml(analysis) {
  if (!analysis) return "";
  var t = String(analysis).replace(/\r/g, "");
  var isMd = /(^|\n)#{1,3}\s|(^|\n)\|.*\||\*\*.+?\*\*/.test(t);
  return isMd
    ? '<div class="material-body" style="margin-top:8px;font-size:12px;line-height:1.8;color:var(--text-2)"><strong>评分标准：</strong>' + simpleMarkdown(t) + '</div>'
    : '<div style="margin-top:8px;font-size:12px;line-height:1.8;color:var(--text-2)"><strong>评分标准：</strong>' + fmtAnalysis(t) + '</div>';
}

function simCaseReveal(answerKey, qId) {
  var sec = simState.sections[simState.currentSection];
  var q = sec && sec.questions[simState.currentIdx];
  if (!q || q.id !== qId) return;
  var parts = simCaseSubQuestions(q);
  for (var k = 0; k < parts.length; k++) {
    var ta = document.getElementById("sim-case-sub-" + k);
    if (ta) simState.answers[answerKey + "_sub_" + k] = ta.value;
  }
  var area = document.getElementById("sim-case-body");
  if (!area) return;
  var html = '<div style="margin-top:4px;padding:14px;border-radius:8px;border:1px solid var(--success-5,#34d399);background:var(--success-1,#f0fdf4)">' +
    '<div style="font-weight:600;font-size:14px;color:var(--success-6,#059669);margin-bottom:8px">参考答案要点</div>' +
    simCaseReferenceHtml(q) +
    simCaseAnalysisHtml(q.analysis) +
    '</div>' +
    '<div style="margin-top:12px;padding:12px;border-radius:8px;background:var(--bg-surface-high,#f5f5f5);border:1px solid var(--border-2)">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">对照参考答案，本题自评（满分 15 分）：</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button onclick="simCaseGrade(\'' + answerKey + '\',\'SELF_PASS\')" style="padding:8px 20px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">✓ 完全掌握（15分）</button>' +
    '<button onclick="simCaseGrade(\'' + answerKey + '\',\'SELF_PARTIAL\')" style="padding:8px 20px;background:var(--warning-5,#f59e0b);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">◐ 部分掌握（9分）</button>' +
    '<button onclick="simCaseGrade(\'' + answerKey + '\',\'SELF_FAIL\')" style="padding:8px 20px;background:var(--danger-5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">✗ 未掌握（3分）</button>' +
    '</div></div>';
  area.innerHTML = html;
  area.scrollIntoView({ behavior: "smooth", block: "start" });
}

function simCaseGrade(answerKey, grade) {
  simState.answers[answerKey] = grade;
  showSimQuestion();
}

function simCaseRegrade(answerKey) {
  delete simState.answers[answerKey];
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
  var sec = simState.sections[idx];
  if (!sec) return;
  simState.currentSection = idx;
  simState.currentIdx = 0;
  if (simState.sectionResults[sec.key]) {
    renderSimSectionResult(content());
  } else {
    renderSimExam(content());
  }
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
    var sec = simState.sections[simState.currentSection];
    if (!sec || simState.sectionResults[sec.key]) return; // 已交卷科目不走时
    var rem = (simState.sectionRemaining[sec.key] || 0) - 1;
    simState.sectionRemaining[sec.key] = rem;
    var el = document.getElementById("sim-timer");
    if (el) {
      el.textContent = formatTime(Math.max(0, rem));
      if (rem < 300) el.style.color = "#ef4444";
    }
    if (rem <= 0) {
      clearInterval(simState.timer);
      simState.timer = null;
      alert(sec.name + " 时间到，本科自动交卷！");
      submitSectionNow(true);
    }
  }, 1000);
}

function confirmSubmitSection() {
  var sec = simState.sections[simState.currentSection];
  if (!sec || simState.sectionResults[sec.key]) return;
  var answered = countSectionAnswered(sec);
  var unanswered = sec.totalQuestions - answered;
  var msg = "确定交卷【" + sec.name + "】吗？\n已答 " + answered + "/" + sec.totalQuestions;
  if (unanswered > 0) msg += "，还有 " + unanswered + " 题未作答";
  msg += "\n\n交卷后立即出分并展示错题分析，本科答案不能再修改。";
  if (confirm(msg)) submitSectionNow(false);
}

async function submitSectionNow(auto) {
  var sec = simState.sections[simState.currentSection];
  if (!sec || simState.sectionResults[sec.key] || simState.submitting) return;
  simState.submitting = true;
  var c = content();
  if (!auto) c.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>正在批改' + sec.name + '...</p></div>';

  try {
    var answers = (sec.questions || []).map(function(q) {
      var answerKey = sec.key + "_" + q.id;
      var ans = { questionId: q.id, userAnswer: simState.answers[answerKey] || "" };
      if (sec.key === "essay") {
        ans.selfScore = simState.answers[answerKey + "_score"] || 0;
      }
      if (sec.key === "case") {
        // 案例主观题：userAnswer 汇总各小问作答文本，selfGrade 为三档自评
        var parts = simCaseSubQuestions(q);
        var texts = [];
        for (var k = 0; k < parts.length; k++) {
          texts.push("问题" + (parts[k].no || (k + 1)) + "：" + (simState.answers[answerKey + "_sub_" + k] || "（未作答）"));
        }
        ans.userAnswer = texts.join("\n\n");
        ans.selfGrade = simState.answers[answerKey] || "";
      }
      return ans;
    });
    var resp = await apiPost("/simulations/" + simState.simId + "/submit-section", { section: sec.key, answers: answers });
    simState.sectionResults[sec.key] = resp;
    simState.submitting = false;
    simState.phase = "sectionResult";
    renderSimSectionResult(c);
  } catch(e) {
    simState.submitting = false;
    console.error("submitSection error:", e);
    c.innerHTML = '<div class="state-error"><p>交卷失败: ' + (e.message || e) + '</p><button onclick="navigate(\'simulation\')" style="margin-top:12px;padding:8px 20px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer">返回</button></div>';
  }
}

/* 单科交卷结果：得分 + 错题分析 */
function renderSimSectionResult(c) {
  var sec = simState.sections[simState.currentSection];
  var r = sec && simState.sectionResults[sec.key];
  if (!sec || !r) { renderSimExam(c); return; }
  var d = r.scoreDetail || {};
  var feedback = r.feedback || [];
  var color = d.passed ? "var(--success-5)" : "var(--danger-5)";

  var html = '<div class="page-title">' + sec.name + ' · 交卷结果</div>' +
    '<div class="stack" style="margin-top:16px">';

  html += '<div class="content-card"><div class="content-card-body" style="display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:12px">' +
    '<div><div style="font-size:40px;font-weight:700;color:' + color + '">' + (d.score || 0) + '</div><div style="font-size:12px;color:var(--text-muted)">满分 ' + (d.fullScore || 75) + '</div></div>' +
    '<div style="align-self:center"><div style="font-size:16px;font-weight:700;color:' + color + '">' + (d.passed ? "✓ 通过" : "✗ 未过") + '</div><div style="font-size:12px;color:var(--text-muted)">及格线 ' + (d.passThreshold || 45) + '</div></div>' +
    (sec.key === "essay"
      ? '<div style="align-self:center"><div style="font-size:14px;font-weight:600">自评科目</div><div style="font-size:12px;color:var(--text-muted)">对照评分标准打分</div></div>'
      : '<div style="align-self:center"><div style="font-size:20px;font-weight:700">' + (d.answeredCount || 0) + '/' + (d.totalQuestions || sec.totalQuestions) + '</div><div style="font-size:12px;color:var(--text-muted)">已作答题数</div></div>') +
    '</div></div>';

  if (sec.key === "essay") {
    html += '<div class="content-card"><div class="content-card-header"><div class="content-card-title">论文详情</div></div><div class="content-card-body">' +
      feedback.map(function(fb) {
        return '<div style="padding:16px;margin-bottom:12px;background:var(--bg-surface-high);border-radius:8px;border-left:3px solid var(--primary-5)">' +
          '<div style="margin-bottom:12px;line-height:1.6;font-size:14px;white-space:pre-wrap">' + mdInlineImages(escMem(fb.stem)) + '</div>' +
          '<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">你的答卷:</div><div style="padding:12px;background:var(--bg-card);border-radius:6px;font-size:13px;line-height:1.7;white-space:pre-wrap;max-height:300px;overflow-y:auto">' + escMem(fb.userEssay || "未作答") + '</div></div>' +
          '<div style="margin-bottom:12px">自评得分: <strong style="color:var(--primary-5)">' + (fb.selfScore || 0) + '</strong>/75</div>' +
          '<div style="font-size:13px;font-weight:600;margin-bottom:4px">评分标准:</div><div style="padding:12px;background:var(--bg-card);border-radius:6px;font-size:13px;line-height:1.7;white-space:pre-wrap">' + escMem(fb.scoringCriteria || "") + '</div>' +
        '</div>';
      }).join("") + '</div></div>';
  } else if (sec.key === "case") {
    // 案例主观题：逐题展示作答 / 参考答案 / 自评档位与得分
    html += '<div class="content-card"><div class="content-card-header"><div class="content-card-title">案例分析详情</div></div><div class="content-card-body">' +
      feedback.map(function(fb) {
        var grade = fb.selfGrade || "";
        var refText = fb.referenceAnswer || "暂无参考答案";
        var isMd = /(^|\n)#{1,3}\s|(^|\n)\|.*\||\*\*.+?\*\*/.test(refText);
        var refHtml = isMd
          ? '<div class="material-body" style="font-size:13px;line-height:1.9;color:var(--text-primary)">' + simpleMarkdown(refText) + '</div>'
          : '<div style="font-size:13px;line-height:1.9;white-space:pre-wrap;color:var(--text-primary)">' + escMem(refText) + '</div>';
        var subHtml = "";
        try {
          var subs = typeof fb.subQuestions === "string" ? JSON.parse(fb.subQuestions) : (fb.subQuestions || []);
          if (Array.isArray(subs) && subs.length && typeof subs[0] !== "string") {
            subHtml = '<div style="margin:8px 0;font-size:12.5px;line-height:1.8;color:var(--text-2)">' +
              subs.map(function(p, k) { return '<div>问题' + (p.no || (k + 1)) + (p.score ? '（' + p.score + '分）' : '') + '：' + escInlineMd(p.q || p.question || "") + '</div>'; }).join("") + '</div>';
          }
        } catch(e) {}
        return '<div style="padding:16px;margin-bottom:12px;background:var(--bg-surface-high);border-radius:8px;border-left:3px solid ' + (grade === "SELF_PASS" ? "var(--success-5)" : grade === "SELF_FAIL" ? "var(--danger-5)" : "var(--warning-5,#f59e0b)") + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><div style="font-size:13px;line-height:1.6;font-weight:600">' + escMem(String(fb.stem || "").split("\n")[0]).slice(0, 60) + '…</div>' +
          '<span style="white-space:nowrap;font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;background:' + (SIM_CASE_GRADE_COLORS[grade] || "var(--bg-surface-high)") + '">' + (SIM_CASE_GRADE_NAMES[grade] || "未自评") + ' · ' + (fb.score || 0) + '/15</span></div>' +
          subHtml +
          '<div style="margin-bottom:10px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">我的作答:</div><div style="padding:12px;background:var(--bg-card);border-radius:6px;font-size:13px;line-height:1.7;white-space:pre-wrap;max-height:300px;overflow-y:auto">' + escMem(fb.userAnswer || "未作答") + '</div></div>' +
          '<div><div style="font-size:13px;font-weight:600;margin-bottom:4px">参考答案要点:</div><div style="padding:12px;background:var(--bg-card);border-radius:6px;max-height:400px;overflow-y:auto">' + refHtml + '</div></div>' +
          simCaseAnalysisHtml(fb.analysis) +
        '</div>';
      }).join("") + '</div></div>';
  } else {
    var wrong = feedback.filter(function(f) { return !f.correct; });
    html += '<div class="content-card"><div class="content-card-header"><div class="content-card-title">错题分析（' + wrong.length + ' 题）</div>' +
      '<span class="text-muted" style="font-size:12px">答对 ' + (feedback.length - wrong.length) + ' / ' + feedback.length + '</span></div><div class="content-card-body">';
    if (!wrong.length) {
      html += '<div class="state-empty"><p>本科全部答对，没有错题 🎉</p></div>';
    } else {
      html += wrong.map(function(f) {
        var idx = feedback.indexOf(f) + 1;
        var optsHtml = "";
        try {
          var opts = typeof f.optionsJson === "string" ? JSON.parse(f.optionsJson) : (f.optionsJson || []);
          if (Array.isArray(opts)) {
            optsHtml = '<div style="margin:8px 0;font-size:12px;color:var(--text-2);line-height:1.8">' +
              opts.map(function(o, i) { return String.fromCharCode(65 + i) + ". " + escMem(String(o)); }).join("&nbsp;&nbsp;") + '</div>';
          }
        } catch(e) {}
        return '<div style="margin-bottom:16px;padding:14px;background:var(--bg-surface-high);border-radius:8px;border-left:3px solid var(--danger-5)">' +
          '<div style="font-size:14px;line-height:1.7;margin-bottom:6px"><strong>第 ' + idx + ' 题</strong>' +
          (f.examYear ? ' <span style="font-size:11px;color:var(--text-muted)">' + escMem(f.examYear) + '年</span>' : '') +
          '<span style="float:right;font-size:12px">你的答案: <strong style="color:var(--danger-5)">' + (f.userAnswer || "未作答") + '</strong>　正确答案: <strong style="color:var(--success-6)">' + escMem(f.correctAnswer) + '</strong></span></div>' +
          '<div style="font-size:13px;line-height:1.7;margin-bottom:4px;white-space:pre-wrap">' + mdInlineImages(escMem(f.stem)) + '</div>' +
          optsHtml +
          (f.analysis ? '<div style="margin-top:8px;padding:10px;background:var(--bg-card);border-radius:6px;font-size:12.5px;line-height:1.8;color:var(--text-2)"><strong style="color:var(--primary-6)">解析：</strong>' + fmtAnalysis(f.analysis) + '</div>' : '') +
        '</div>';
      }).join("");
    }
    html += '</div></div>';
  }

  var nextUn = -1;
  simState.sections.forEach(function(s, i) { if (nextUn < 0 && !simState.sectionResults[s.key]) nextUn = i; });
  html += '<div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">';
  if (r.completed) {
    html += '<button onclick="finishSimulation()" style="padding:12px 32px;background:linear-gradient(135deg,var(--success-5),var(--success-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">查看总成绩</button>';
  } else if (nextUn >= 0) {
    var nextSec = simState.sections[nextUn];
    html += '<button onclick="jumpToSection(' + nextUn + ')" style="padding:12px 32px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">进入下一科：' + nextSec.name + '</button>';
  }
  html += '<button onclick="navigate(\'simulation\')" style="padding:12px 32px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-weight:600">退出考试</button>';
  html += '</div></div>';
  c.innerHTML = html;
}

function jumpToSection(idx) {
  simState.currentSection = idx;
  simState.currentIdx = 0;
  simState.phase = "exam";
  renderSimExam(content());
}

/* 三科交齐后汇总总成绩 */
function finishSimulation() {
  var last = null;
  simState.sections.forEach(function(s) {
    var r = simState.sectionResults[s.key];
    if (r && r.completed) last = r;
  });
  if (!last) { navigate("simulation"); return; }
  var essay = simState.sectionResults.essay;
  simState.result = {
    simDate: last.simDate,
    scores: last.scores,
    totalScore: last.totalScore,
    passed: last.passed,
    insights: last.insights,
    essayFeedback: essay ? (essay.feedback || []) : []
  };
  simState.phase = "result";
  renderSimResult(content());
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
      '<div style="margin-bottom:12px;line-height:1.6;font-size:14px;white-space:pre-wrap">' + mdInlineImages(escMem(fb.stem)) + '</div>' +
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
  md = String(md).replace(/\r/g, ""); // 题库存量数据含 CRLF，\r 会破坏表格分隔行与行首判定
  var lines = md.split('\n');
  var html = [];
  var i = 0;
  var inList = false;
  var inOl = false;
  var inNestedUl = false;
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
    s = s.replace(/\*\*/g, ''); // 清理未配对的孤立 **（数据噪声）
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
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
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
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
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
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      var level = line.match(/^(#+)/)[1].length;
      var text = line.replace(/^#+\s/, '');
      html.push('<h' + level + '>' + inline(text) + '</h' + level + '>');
      i++;
      continue;
    }

    if (/^\s*[-*]\s/.test(line)) {
      var dashText = inline(line.replace(/^\s*[-*]\s/, ''));
      if (inOl) {
        // 有序列表下的缩进子条目：嵌套 ul，不打断 ol 编号
        if (!inNestedUl) { html.push('<ul class="md-sub">'); inNestedUl = true; }
        html.push('<li>' + dashText + '</li>');
      } else {
        flushTable();
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push('<li>' + dashText + '</li>');
      }
      i++;
      continue;
    }

    if (/^\s*\d+\.\s/.test(line)) {
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
      if (inList) { html.push('</ul>'); inList = false; }
      flushTable();
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push('<li>' + inline(line.replace(/^\s*\d+\.\s/, '')) + '</li>');
      i++;
      continue;
    }

    if (/^\|.*\|/.test(line)) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
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
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
      flushTable();
      html.push(line);
      i++;
      continue;
    }

    if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inNestedUl) { html.push('</ul>'); inNestedUl = false; }
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
  if (inNestedUl) html.push('</ul>');
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

/* ============================================================
   历年真题（参考芝士架构 past_exam：按试卷浏览 → 题目展开）
   ============================================================ */
var pastExamState = { subject: "全部", openPaperId: null, detailCache: {}, paperTab: {}, qCache: {} };

var PE_TYPE_META = {
  "MCQ":  { label: "综合知识", color: "var(--primary-2,#e8f0fe)", text: "var(--primary-6)" },
  "":     { label: "综合知识", color: "var(--primary-2,#e8f0fe)", text: "var(--primary-6)" },
  "CASE": { label: "案例分析", color: "var(--warning-2,#fef3e2)", text: "#b45309" },
  "ESSAY":{ label: "论文",     color: "var(--success-1,#ecfdf5)", text: "var(--success-6)" }
};

function peTypeBadge(t) {
  var m = PE_TYPE_META[t] || PE_TYPE_META[""];
  return '<span style="padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:' + m.color + ';color:' + m.text + '">' + m.label + '</span>';
}

function peFreqBadge(f) {
  if (!f || f === "未标注") return "";
  var color = f === "高频" ? "var(--danger-6)" : (f === "中频" ? "#b45309" : "var(--primary-6)");
  return '<span style="padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700;border:1px solid currentColor;color:' + color + '">' + f + '</span>';
}

async function renderPastExams(c) {
  c.innerHTML = '<div class="page-title">历年真题</div><div class="page-subtitle">按试卷浏览 · 真题小问与解析 · 点击试卷展开</div><div id="pe-body"><div class="state-loading"><div class="spinner"></div><p>加载真题库...</p></div></div>';
  var data;
  try { data = await apiGet("/past-exam/papers"); } catch (e) {
    document.getElementById("pe-body").innerHTML = '<div class="state-error"><p>加载失败: ' + esc(e.message) + '</p></div>';
    return;
  }
  var papers = data.papers || [];
  if (!papers.length) {
    document.getElementById("pe-body").innerHTML = '<div class="state-empty" style="padding:40px"><p>暂无真题数据，请先运行 scripts/past-exam/import-past-exam.js</p></div>';
    return;
  }
  var subjSet = {};
  papers.forEach(function(p) { if (subjSet[p.subject] != null) subjSet[p.subject]++; else subjSet[p.subject] = 1; });
  var tabs = ["全部"].concat(Object.keys(subjSet));
  var totalCount = papers.reduce(function(s, p) { return s + p.mcqCount + p.caseCount + p.essayCount; }, 0);

  var html = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 6px">';
  tabs.forEach(function(t) {
    var active = pastExamState.subject === t;
    html += '<button onclick="peSetSubject(\'' + t + '\')" style="padding:6px 16px;border-radius:8px;border:1px solid ' + (active ? 'var(--primary-6)' : 'var(--border-2)') + ';background:' + (active ? 'var(--primary-6)' : 'var(--bg-surface-high)') + ';color:' + (active ? '#fff' : 'var(--text-1)') + ';cursor:pointer;font-weight:600;font-size:13px">' + esc(t) + '</button>';
  });
  html += '<span class="text-muted" style="font-size:13px;margin-left:auto">' + papers.length + ' 份试卷 · ' + totalCount + ' 题</span></div>';

  // 按年份分组倒序
  var byYear = {};
  papers.forEach(function(p) {
    var y = (p.examDate || "").split("-")[0] || "未知";
    (byYear[y] = byYear[y] || []).push(p);
  });
  var years = Object.keys(byYear).sort().reverse();
  years.forEach(function(y) {
    html += '<div style="margin:14px 0 8px;font-weight:700;font-size:15px;color:var(--primary-6)">' + y + ' 年</div>';
    byYear[y].forEach(function(p) {
      if (pastExamState.subject !== "全部" && p.subject !== pastExamState.subject) return;
      var open = pastExamState.openPaperId === p.id;
      html += '<div class="content-card" style="margin-bottom:10px">' +
        '<div class="content-card-body" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px 16px" onclick="peTogglePaper(' + p.id + ')">' +
          '<div style="font-weight:700;font-size:14.5px;flex:1">' + esc(p.name) + '</div>' +
          '<span style="font-size:12px;color:var(--text-2)">单选 ' + p.mcqCount + ' · 案例 ' + p.caseCount + ' · 论文 ' + p.essayCount + '</span>' +
          '<span style="color:var(--primary-6);font-weight:700">' + (open ? "▾" : "▸") + '</span>' +
        '</div>' +
        (open ? '<div id="pe-paper-' + p.id + '" style="padding:0 16px 16px"></div>' : '') +
      '</div>';
    });
  });
  document.getElementById("pe-body").innerHTML = html;
  if (pastExamState.openPaperId != null) peLoadPaper(pastExamState.openPaperId);
}

function peSetSubject(s) { pastExamState.subject = s; renderPage(); }
function peTogglePaper(id) {
  pastExamState.openPaperId = pastExamState.openPaperId === id ? null : id;
  renderPage();
}

async function peLoadPaper(id) {
  var box = document.getElementById("pe-paper-" + id);
  if (!box) return;
  box.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>加载试卷...</p></div>';
  var data = pastExamState.qCache[id];
  if (!data) {
    try {
      data = await apiGet("/past-exam/papers/" + id + "/questions");
      pastExamState.qCache[id] = data;
    } catch (e) {
      box.innerHTML = '<div class="state-error"><p>加载失败: ' + esc(e.message) + '</p></div>';
      return;
    }
  }
  var qs = data.questions || [];
  var groups = { mcq: [], case: [], essay: [] };
  qs.forEach(function(q) {
    if (q.type === "CASE") groups.case.push(q);
    else if (q.type === "ESSAY") groups.essay.push(q);
    else groups.mcq.push(q);
  });
  ["mcq", "case", "essay"].forEach(function(k) {
    groups[k].sort(function(a, b) { return (a.examSort || 0) - (b.examSort || 0); });
  });

  var active = pastExamState.paperTab[id];
  if (!active || !groups[active].length) active = groups.mcq.length ? "mcq" : (groups.case.length ? "case" : "essay");
  pastExamState.paperTab[id] = active;

  var TABS = [["mcq", "综合知识"], ["case", "案例分析"], ["essay", "论文"]];
  var html = '<div style="border-top:1px solid var(--border-2);margin-top:6px;padding-top:12px">';
  if (!qs.length) {
    html += '<p class="text-muted" style="font-size:13px">该试卷暂无题目</p>';
  } else {
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    TABS.forEach(function(t) {
      var n = groups[t[0]].length;
      if (!n) return;
      var on = active === t[0];
      html += '<button onclick="peSetPaperTab(' + id + ',\'' + t[0] + '\')" style="padding:5px 14px;border-radius:8px;border:1px solid ' + (on ? 'var(--primary-6)' : 'var(--border-2)') + ';background:' + (on ? 'var(--primary-6)' : 'var(--bg-surface-high)') + ';color:' + (on ? '#fff' : 'var(--text-1)') + ';cursor:pointer;font-weight:600;font-size:12.5px">' + t[1] + ' ' + n + '</button>';
    });
    html += '</div>';
    html += peRenderQList(groups[active], active);
  }
  box.innerHTML = html + '</div>';
}

function peSetPaperTab(pid, t) {
  pastExamState.paperTab[pid] = t;
  peLoadPaper(pid);
}

function peRenderQList(qs, typeKey) {
  var html = '';
  qs.forEach(function(q, i) {
    var stemBrief = String(q.stem || "").split("\n")[0].slice(0, typeKey === "mcq" ? 70 : 90);
    html += '<div style="margin-bottom:10px;border:1px solid var(--border-2);border-radius:10px;background:var(--bg-surface-high)">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer" onclick="peToggleDetail(' + q.id + ',this)">' +
        '<span style="font-weight:700;color:var(--primary-6);font-size:13px;white-space:nowrap">第 ' + (q.examSort || (i + 1)) + ' 题</span>' +
        (q.kpName ? '<span style="padding:1px 8px;border-radius:12px;font-size:11px;background:var(--bg-surface-highest);color:var(--text-2)">' + esc(q.kpName) + '</span>' : '') +
        '<span style="font-size:12.5px;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(stemBrief) + '</span>' +
        '<span style="color:var(--primary-6);font-size:12px" class="pe-arrow">展开 ▾</span>' +
      '</div>' +
      '<div class="pe-detail" id="pe-q-' + q.id + '" style="display:none;padding:0 14px 14px"></div>' +
    '</div>';
  });
  return html;
}

function peToggleDetail(qid, head) {
  var box = document.getElementById("pe-q-" + qid);
  if (!box) return;
  var showing = box.style.display !== "none";
  box.style.display = showing ? "none" : "";
  head.querySelector(".pe-arrow").textContent = showing ? "展开 ▾" : "收起 ▴";
  if (!showing && !box.dataset.loaded) {
    box.dataset.loaded = "1";
    peRenderDetail(qid, box);
  }
}

async function peRenderDetail(qid, box) {
  box.innerHTML = '<p class="text-muted" style="font-size:13px">加载详情...</p>';
  var q;
  try {
    q = pastExamState.detailCache[qid] || await apiGet("/past-exam/questions/" + qid);
    pastExamState.detailCache[qid] = q;
  } catch (e) { box.innerHTML = '<p style="color:var(--danger-6);font-size:13px">加载失败: ' + esc(e.message) + '</p>'; return; }
  var html = (q.stem && String(q.stem).indexOf("【图:") >= 0) ? "" : renderQuestionImageHtml(q.imageUrl);
  html += '<div style="font-size:14.5px;line-height:1.8;margin-bottom:12px">' + renderStemHtml(q.stem) + '</div>';
  var t = q.type || "MCQ";
  if (t === "CASE") {
    var subs = [];
    try { subs = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch (e) {}
    subs.forEach(function(s, k) {
      html += '<div style="margin:10px 0;padding:10px 12px;background:var(--bg-surface-highest);border-radius:8px">' +
        '<div style="font-weight:600;font-size:13.5px;margin-bottom:6px">问题' + (s.no || (k + 1)) + (s.score ? '（' + s.score + '分）' : '') + '</div>' +
        '<div style="font-size:13.5px;line-height:1.8">' + escInlineMd(s.q || s.question || "") + '</div>' +
        (s.image ? '<div style="text-align:center;margin:8px 0"><img src="' + safeImageUrl(s.image) + '" style="max-width:100%;border-radius:6px;border:1px solid var(--border-2)" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>' : '') +
        '<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12.5px;font-weight:600;color:var(--primary-6)">参考答案 / 解析</summary>' +
        '<div style="font-size:13px;line-height:1.8;margin-top:8px;white-space:pre-wrap">' + escInlineMd(s.answer || "（暂无）") + '</div>' +
        (s.analysis ? '<div style="font-size:12.5px;line-height:1.8;margin-top:8px;color:var(--text-2);white-space:pre-wrap">💡 ' + escInlineMd(s.analysis) + '</div>' : '') +
        '</details></div>';
    });
  } else if (t === "ESSAY") {
    html += '<details><summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--primary-6)">写作策略 / 范文</summary>' +
      '<div style="font-size:13px;line-height:1.9;margin-top:8px;white-space:pre-wrap">' + escInlineMd(q.answer || "（暂无）") + '</div></details>';
  } else {
    var opts = [];
    try { opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch (e) {}
    var letters = ["A","B","C","D","E","F","G","H"];
    opts.forEach(function(o, i) {
      var correct = letters[i] === q.answer;
      html += '<div style="display:flex;gap:8px;padding:7px 10px;margin:4px 0;border-radius:8px;font-size:13.5px;background:' + (correct ? 'var(--success-1,#ecfdf5)' : 'var(--bg-surface-highest)') + '">' +
        '<strong style="color:' + (correct ? 'var(--success-6)' : 'var(--text-2)') + '">' + letters[i] + '.</strong>' +
        '<span style="flex:1">' + escInlineMd(o) + '</span>' +
        (correct ? '<strong style="color:var(--success-6);font-size:12px">✓ 正确</strong>' : '') + '</div>';
    });
    html += '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--primary-6)">答案与解析</summary>' +
      '<div style="font-size:13px;line-height:1.8;margin-top:8px">正确答案：<strong style="color:var(--success-6)">' + esc(q.answer) + '</strong></div>' +
      (q.analysis ? '<div style="font-size:13px;line-height:1.8;margin-top:6px;color:var(--text-2)">' + renderStemHtml(q.analysis) + '</div>' : '') +
      '</details>';
  }
  html += '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
    (q.paperName ? '<span class="text-muted" style="font-size:12px">📅 ' + esc(q.paperName) + '</span>' : '') +
    (q.kp && q.kp.id ? '<button onclick="kpgOpenInTree(' + q.kp.id + ')" style="display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border-radius:14px;border:1px solid var(--primary-6,#1664ff);background:var(--bg-surface-high);color:var(--primary-6,#1664ff);cursor:pointer;font-size:12px;font-weight:600">📍 ' + esc(q.kp.name) + ' · 知识图谱</button>' : '') +
  '</div>';
  box.innerHTML = html;
}

/* ============================================================
   知识图谱 v3（双视图：知识树浏览 + 力导向关系图）
   知识树: 左侧分类→考点导航, 右侧考点详情(精讲/年份/子考点/关联考点/真题)
   关系图: 聚焦/着色/语义-共现边开关/搜索
   ============================================================ */
var kpGraphState = {
  chart: null, nodes: [], edges: [], byId: {}, childrenOf: {}, branchColor: {},
  subject: "全部", colorBy: "freq", showSem: true, showCo: false, labels: "auto",
  focusId: null, selected: null,
  view: "tree",
  tree: { expanded: {}, selectedId: null, filter: "" },
  detailCache: {}, qCache: {}
};

var KP_FREQ_COLOR = { "高频": "#ef4444", "中频": "#f59e0b", "低频": "#3b82f6", "未标注": "#94a3b8" };
var KPG_VIRTUAL_ROOT = { id: 990000001, name: "专项考点" };

function kpgSubjPass(n) {
  var s = kpGraphState.subject;
  if (s === "全部") return true;
  return s === "架构设计师" ? (n.archCount > 0) : (n.analystCount > 0);
}
function kpgSubjCount(n) {
  var s = kpGraphState.subject;
  if (s === "全部") return n.questionCount || 0;
  return s === "架构设计师" ? (n.archCount || 0) : (n.analystCount || 0);
}
function kpgSetSubject(s2) { kpGraphState.subject = s2; renderPage(); }

async function renderKpGraph(c) {
  c.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>加载知识图谱...</p></div>';
  if (!kpGraphState.nodes.length || !kpGraphState.edges.length) {
    var tree, edgeData;
    try {
      [tree, edgeData] = await Promise.all([apiGet("/kp/tree"), apiGet("/kp/edges")]);
    } catch (e) {
      c.innerHTML = '<div class="state-error"><p>加载失败: ' + esc(e.message) + '</p></div>';
      return;
    }
    kpGraphState.nodes = tree.nodes || [];
    kpGraphState.edges = edgeData.edges || [];
    var byId = {}, childrenOf = {};
    kpGraphState.nodes.forEach(function(n) {
      byId[n.id] = n;
      if (n.parentId) (childrenOf[n.parentId] = childrenOf[n.parentId] || []).push(n.id);
    });
    kpGraphState.byId = byId;
    kpGraphState.childrenOf = childrenOf;
    var roots = kpGraphState.nodes.filter(function(n) { return n.isParent; });
    roots.forEach(function(r, i) { kpGraphState.branchColor[r.id] = "hsl(" + Math.round(i * 360 / roots.length) + ",58%,48%)"; });
    kpGraphState.branchColor[KPG_VIRTUAL_ROOT.id] = "#64748b";
  }

  var visLeaves = kpGraphState.nodes.filter(function(n) { return !n.isParent && kpgSubjPass(n); });
  var leafCount = visLeaves.length;
  var qCount = visLeaves.reduce(function(s, n) { return s + kpgSubjCount(n); }, 0);

  var html = '<div class="page-title">知识图谱</div>' +
    '<div class="page-subtitle">考点体系 · 精讲 · 关联真题 —— 从任意真题的「📍 知识图谱」按钮可直达考点</div>' +
    '<div style="display:flex;gap:10px;margin:14px 0 10px;flex-wrap:wrap;align-items:center">' +
      '<span style="display:inline-flex;border:1px solid var(--border-2);border-radius:8px;overflow:hidden">' +
        '<button id="kpg-vt-tree" onclick="kpgSetView(\'tree\')" style="padding:6px 16px;border:none;cursor:pointer;font-size:13px;font-weight:600">📖 知识树</button>' +
        '<button id="kpg-vt-graph" onclick="kpgSetView(\'graph\')" style="padding:6px 16px;border:none;cursor:pointer;font-size:13px;font-weight:600">🕸️ 关系图谱</button>' +
      '</span>' +
      '<span style="display:inline-flex;border:1px solid var(--border-2);border-radius:8px;overflow:hidden">' +
        '<button id="kpg-sj-0" onclick="kpgSetSubject(\'全部\')" style="padding:6px 14px;border:none;cursor:pointer;font-size:13px;font-weight:600">全部</button>' +
        '<button id="kpg-sj-1" onclick="kpgSetSubject(\'架构设计师\')" style="padding:6px 14px;border:none;cursor:pointer;font-size:13px;font-weight:600">架构师</button>' +
        '<button id="kpg-sj-2" onclick="kpgSetSubject(\'系统分析师\')" style="padding:6px 14px;border:none;cursor:pointer;font-size:13px;font-weight:600">分析师</button>' +
      '</span>' +
      '<span class="text-muted" style="font-size:13px">' + leafCount + ' 个考点 · ' + qCount + ' 题挂接 · 关联边 ' + kpGraphState.edges.length + '</span>' +
      '<span id="kpg-toolbar" style="margin-left:auto;display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap"></span>' +
    '</div>' +
    '<div id="kpg-body"></div>';
  c.innerHTML = html;
  kpgStyleTabs();
  if (kpGraphState.view === "graph") kpgRenderGraphView(); else kpgRenderTreeView();
}

function kpgSetView(v) {
  kpGraphState.view = v;
  kpgStyleTabs();
  if (v === "graph") kpgRenderGraphView(); else kpgRenderTreeView();
}

function kpgStyleTabs() {
  var on = "background:var(--primary-6);color:#fff", off = "background:var(--bg-surface-high);color:var(--text-1)";
  var t = document.getElementById("kpg-vt-tree"), g = document.getElementById("kpg-vt-graph");
  if (t) t.style.cssText += ";" + (kpGraphState.view === "tree" ? on : off);
  if (g) g.style.cssText += ";" + (kpGraphState.view === "graph" ? on : off);
  [["kpg-sj-0","全部"],["kpg-sj-1","架构设计师"],["kpg-sj-2","系统分析师"]].forEach(function(p) {
    var el = document.getElementById(p[0]);
    if (el) el.style.cssText += ";" + (kpGraphState.subject === p[1] ? on : off);
  });
}

/** 任意页面跳入知识树并选中某考点（真题详情「知识图谱」按钮） */
function kpgOpenInTree(id) {
  kpGraphState.view = "tree";
  kpGraphState.tree.selectedId = id;
  var n = kpGraphState.byId[id];
  if (n && n.parentId) kpGraphState.tree.expanded[n.parentId] = true;
  if (state.page !== "kp-graph") navigate("kp-graph");
  else renderPage();
}

/* ============================================================
   知识树视图
   ============================================================ */
function kpgRenderTreeView() {
  var toolbar = document.getElementById("kpg-toolbar");
  if (toolbar) toolbar.innerHTML =
    '<input id="kpg-tree-filter" placeholder="过滤考点..." oninput="kpgTreeFilter(this.value)" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-high);color:var(--text-1);min-width:180px;outline:none;font-size:13px">';
  var body = document.getElementById("kpg-body");
  body.innerHTML =
    '<div style="display:flex;gap:14px;align-items:stretch">' +
      '<div class="content-card" style="width:296px;min-width:280px;flex:none;max-height:700px;display:flex;flex-direction:column">' +
        '<div class="content-card-header" style="padding:10px 14px"><div class="content-card-title" style="font-size:14px">考点导航 <span class="text-muted" style="font-weight:400;font-size:12px">点击展开/收起</span></div></div>' +
        '<div id="kpg-tree-nav" style="flex:1;overflow-y:auto;padding:4px 8px 12px"></div>' +
      '</div>' +
      '<div style="flex:1;min-width:0"><div id="kpg-tree-main"></div></div>' +
    '</div>';
  kpgRenderTreeNav();
  var sel = kpGraphState.tree.selectedId;
  if (sel && kpGraphState.byId[sel]) kpgRenderTreeMain(sel);
  else {
    document.getElementById("kpg-tree-main").innerHTML =
      '<div class="content-card"><div class="content-card-body state-empty" style="padding:60px 30px;text-align:center">' +
      '<p style="font-size:15px">从左侧选择一个考点开始 📖</p>' +
      '<p class="text-muted" style="font-size:13px;margin-top:6px">或在做真题时点击题目里的「📍 知识图谱」按钮直达考点</p></div></div>';
  }
}

function kpgRenderTreeNav() {
  var nav = document.getElementById("kpg-tree-nav");
  if (!nav) return;
  var st = kpGraphState.tree;
  var roots = kpGraphState.nodes.filter(function(n) { return n.isParent; });
  roots.sort(function(a, b) {
    var qa = (kpGraphState.childrenOf[a.id] || []).reduce(function(s, id) { return s + (kpGraphState.byId[id].questionCount || 0); }, 0);
    var qb = (kpGraphState.childrenOf[b.id] || []).reduce(function(s, id) { return s + (kpGraphState.byId[id].questionCount || 0); }, 0);
    return qb - qa;
  });
  var filter = (st.filter || "").trim().toLowerCase();

  var html = "";
  roots.forEach(function(r) {
    var kids = (kpGraphState.childrenOf[r.id] || []).map(function(id) { return kpGraphState.byId[id]; });
    if (kpGraphState.subject !== "全部") kids = kids.filter(function(k) { return kpgSubjPass(k); });
    if (filter) kids = kids.filter(function(k) { return k.name.toLowerCase().indexOf(filter) >= 0; });
    if (!kids.length && (filter || kpGraphState.subject !== "全部")) return;
    kids.sort(function(a, b) { return kpgSubjCount(b) - kpgSubjCount(a); });
    var expanded = filter ? true : (st.expanded[r.id] !== false);
    var total = (kpGraphState.childrenOf[r.id] || []).reduce(function(s, id) { return s + kpgSubjCount(kpGraphState.byId[id]); }, 0);
    html += '<div style="margin:2px 0">' +
      '<div onclick="kpgTreeToggle(' + r.id + ')" style="display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13.5px;color:var(--text-1)' + (st.selectedId === r.id ? ';background:var(--primary-1,#e8f0fe);color:var(--primary-6)' : '') + '">' +
        '<span style="color:var(--primary-6);font-size:11px">' + (expanded ? "▾" : "▸") + '</span>' +
        '<span style="flex:1">' + esc(r.name) + '</span>' +
        '<span class="text-muted" style="font-size:11px;font-weight:400">' + total + '</span></div>';
    if (expanded) {
      kids.forEach(function(k) {
        var sel = st.selectedId === k.id;
        html += '<div onclick="kpgTreeSelect(' + k.id + ')" style="display:flex;align-items:center;gap:6px;padding:5px 10px 5px 26px;border-radius:8px;cursor:pointer;font-size:12.5px;transition:background .15s' + (sel ? ';background:var(--primary-1,#e8f0fe)' : '') + '" onmouseover="this.style.background=\'var(--bg-surface-high)\'" onmouseout="this.style.background=\'' + (sel ? 'var(--primary-1,#e8f0fe)' : 'transparent') + '\'">' +
          '<i style="width:7px;height:7px;border-radius:50%;background:' + (KP_FREQ_COLOR[k.freq] || KP_FREQ_COLOR["未标注"]) + ';display:inline-block;flex:none"></i>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (sel ? 'color:var(--primary-6);font-weight:700' : 'color:var(--text-2)') + '">' + esc(k.name) + '</span>' +
          (k.hasEssence ? '<span style="font-size:10px;flex:none">📌</span>' : '') +
          '<span class="text-muted" style="font-size:10.5px;flex:none">' + kpgSubjCount(k) + '</span></div>';
      });
      if (!kids.length && !filter) html += '<div class="text-muted" style="padding:4px 10px 4px 26px;font-size:12px">（无子考点）</div>';
    }
    html += '</div>';
  });
  nav.innerHTML = html;
  var selEl = nav.querySelector('[style*="primary-1"]') || nav.querySelector('div[onclick*="kpgTreeSelect"]');
  if (selEl && selEl.scrollIntoView) { try { selEl.scrollIntoView({ block: "nearest" }); } catch (e) {} }
}

function kpgTreeToggle(rootId) {
  var st = kpGraphState.tree;
  st.expanded[rootId] = st.expanded[rootId] === false ? true : false;
  kpgRenderTreeNav();
}

function kpgTreeFilter(v) {
  kpGraphState.tree.filter = v;
  kpgRenderTreeNav();
}

function kpgTreeSelect(id) {
  kpGraphState.tree.selectedId = id;
  kpgRenderTreeNav();
  kpgRenderTreeMain(id);
}

var KPG_MARK_STYLE = {
  "高频": "background:var(--danger-2,#fee2e2);color:var(--danger-6,#dc2626)",
  "易错": "background:var(--warning-2,#fef3c7);color:#b45309",
  "易混淆": "background:var(--warning-2,#fef3c7);color:#b45309",
  "记忆": "background:var(--primary-2,#e0eaff);color:var(--primary-6,#1664ff)",
  "对比": "background:var(--primary-2,#e0eaff);color:var(--primary-6,#1664ff)",
  "结论": "background:var(--success-1,#ecfdf5);color:var(--success-6,#059669)"
};
function kpgEssenceHtml(md) {
  var h = renderStemHtml(md);
  Object.keys(KPG_MARK_STYLE).forEach(function(mk) {
    h = h.split("【" + mk + "】").join('<span style="display:inline-block;padding:0 7px;margin:0 3px 0 1px;border-radius:9px;font-size:11px;font-weight:700;vertical-align:1px;' + KPG_MARK_STYLE[mk] + '">' + mk + '</span>');
  });
  return h;
}

/* 知识图谱关联真题: 选择题作答式渲染(先选择后揭示答案) */
function kpgToggleDetail(qid, head) {
  var box = document.getElementById("kpg-q-" + qid);
  if (!box) return;
  var showing = box.style.display !== "none";
  box.style.display = showing ? "none" : "";
  if (head) {
    var arrow = head.querySelector(".kpg-arrow");
    if (arrow) arrow.textContent = showing ? "展开 ▾" : "收起 ▴";
  }
  if (!showing && !box.dataset.loaded) {
    box.dataset.loaded = "1";
    kpgLoadDetail(qid, box);
  }
}

async function kpgLoadDetail(qid, box) {
  box.innerHTML = '<p class="text-muted" style="font-size:13px">加载详情...</p>';
  var q;
  try {
    q = pastExamState.detailCache[qid] || await apiGet("/past-exam/questions/" + qid);
    pastExamState.detailCache[qid] = q;
  } catch (e) {
    box.innerHTML = '<p style="color:var(--danger-6);font-size:13px">加载失败: ' + esc(e.message) + '</p>';
    return;
  }
  if (q.type === "CASE" || q.type === "ESSAY") {
    peRenderDetail(qid, box); // 主观题: 参考答案在折叠区, 点开才显示
  } else {
    kpgRenderMcqQuiz(q, box);
  }
}

function kpgRenderMcqQuiz(q, box) {
  var html = (q.stem && String(q.stem).indexOf("\u3010\u56fe:") >= 0) ? "" : renderQuestionImageHtml(q.imageUrl);
  html += '<div style="font-size:14.5px;line-height:1.8;margin-bottom:12px">' + renderStemHtml(q.stem) + '</div>';
  var opts = [];
  try { opts = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch (e) {}
  var letters = ["A","B","C","D","E","F","G","H"];
  html += '<div id="kpg-quiz-opts-' + q.id + '">';
  opts.forEach(function(o, i) {
    html += '<div onclick="kpgPick(' + q.id + ',\'' + letters[i] + '\')" style="cursor:pointer;padding:8px 12px;margin:5px 0;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-high);font-size:13.5px;display:flex;gap:8px;align-items:flex-start;transition:border-color .15s" onmouseover="if(!this.parentNode.dataset.done)this.style.borderColor=\'var(--primary-5,#5a8dff)\'" onmouseout="if(!this.parentNode.dataset.done)this.style.borderColor=\'var(--border-2)\'">' +
      '<strong style="color:var(--text-2)">' + letters[i] + '.</strong><span style="flex:1">' + escInlineMd(o) + '</span></div>';
  });
  html += '</div>';
  html += '<div id="kpg-quiz-res-' + q.id + '"></div>';
  html += '<div id="kpg-quiz-skip-' + q.id + '" style="text-align:right;margin-top:4px"><span onclick="kpgReveal(' + q.id + ')" style="color:var(--text-2);font-size:12px;cursor:pointer;text-decoration:underline">直接看答案</span></div>';
  box.innerHTML = html;
}

function kpgQuizFinish(qid, chosen) {
  var q = pastExamState.detailCache[qid];
  var optsBox = document.getElementById("kpg-quiz-opts-" + qid);
  var res = document.getElementById("kpg-quiz-res-" + qid);
  var skip = document.getElementById("kpg-quiz-skip-" + qid);
  if (!q || !optsBox || optsBox.dataset.done) return;
  optsBox.dataset.done = "1";
  var answer = q.answer || "";
  var letters = ["A","B","C","D","E","F","G","H"];
  var rows = optsBox.children;
  for (var i = 0; i < rows.length; i++) {
    rows[i].onclick = null;
    rows[i].onmouseover = null;
    rows[i].onmouseout = null;
    var L = letters[i];
    if (L === answer) {
      rows[i].style.borderColor = "var(--success-6,#059669)";
      rows[i].style.background = "var(--success-1,#ecfdf5)";
      rows[i].insertAdjacentHTML("beforeend", '<strong style="color:var(--success-6,#059669);font-size:12px;white-space:nowrap">✓ 正确答案</strong>');
    } else if (L === chosen) {
      rows[i].style.borderColor = "var(--danger-6,#dc2626)";
      rows[i].style.background = "var(--danger-1,#fef4f4)";
      rows[i].insertAdjacentHTML("beforeend", '<strong style="color:var(--danger-6,#dc2626);font-size:12px;white-space:nowrap">✗ 你的选择</strong>');
    } else {
      rows[i].style.opacity = "0.6";
    }
  }
  var correct = chosen != null && chosen === answer;
  var html = '<div style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;background:' +
    (correct ? "var(--success-1,#ecfdf5);color:var(--success-6,#059669)" : "var(--danger-1,#fef4f4);color:var(--danger-6,#dc2626)") + '">' +
    (chosen == null ? "正确答案：" + esc(answer) : (correct ? "✓ 回答正确" : "✗ 回答错误，正确答案 " + esc(answer))) + '</div>';
  if (q.analysis) html += '<div style="font-size:13px;line-height:1.8;margin-top:8px;color:var(--text-2)">' + renderStemHtml(q.analysis) + '</div>';
  if (q.paperName) html += '<div class="text-muted" style="font-size:12px;margin-top:8px">📅 ' + esc(q.paperName) + '</div>';
  res.innerHTML = html;
  if (skip) skip.style.display = "none";
}
function kpgPick(qid, letter) { kpgQuizFinish(qid, letter); }
function kpgReveal(qid) { kpgQuizFinish(qid, null); }

async function kpgRenderTreeMain(id) {
  var main = document.getElementById("kpg-tree-main");
  if (!main) return;
  var d = kpGraphState.detailCache[id];
  if (!d) {
    main.innerHTML = '<div class="state-loading"><div class="spinner"></div><p>加载考点...</p></div>';
    try { d = await apiGet("/kp/" + id); kpGraphState.detailCache[id] = d; }
    catch (e) { main.innerHTML = '<div class="state-error"><p>加载失败: ' + esc(e.message) + '</p></div>'; return; }
  }
  var n = kpGraphState.byId[id];
  var rootName = n && n.parentId && kpGraphState.byId[n.parentId] ? kpGraphState.byId[n.parentId].name : "";

  var html = '<div class="content-card">' +
    '<div class="content-card-body" style="padding:18px 22px">' +
      '<div class="text-muted" style="font-size:12px;margin-bottom:6px">' + esc(rootName) + ' ›</div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
        '<strong style="font-size:20px">' + esc(d.name) + '</strong>' +
        peFreqBadge(d.freq) +
        '<span class="text-muted" style="font-size:13px">' + d.questionCount + ' 题</span>' +
        (kpGraphState.byId[id] && (kpGraphState.byId[id].archCount || kpGraphState.byId[id].analystCount) ? '<span class="text-muted" style="font-size:12px">（架构师 ' + (kpGraphState.byId[id].archCount || 0) + ' · 分析师 ' + (kpGraphState.byId[id].analystCount || 0) + '）</span>' : '') +
        '<button onclick="kpgOpenInGraphView(' + id + ')" style="margin-left:auto;padding:5px 14px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-high);color:var(--text-1);cursor:pointer;font-size:12px;font-weight:600">🕸️ 在关系图谱中查看</button>' +
      '</div>';

  if (d.years && d.years.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;margin-bottom:5px">📅 出题记录（' + d.years.length + ' 场）</div><div style="display:flex;gap:4px;flex-wrap:wrap">' +
      d.years.map(function(y) { return '<span style="padding:2px 9px;border-radius:10px;font-size:11px;background:var(--bg-surface-high);color:var(--text-2)">' + esc(y) + '</span>'; }).join("") +
      '</div></div>';
  }

  if (d.essence) {
    html += '<div style="padding:14px 16px;background:var(--bg-surface-high);border-radius:10px;margin-bottom:14px;border-left:3px solid var(--primary-6)">' +
      '<div style="font-size:13px;font-weight:700;color:var(--primary-6);margin-bottom:8px">📌 考点精讲</div>' +
      '<div class="material-body" style="font-size:13.5px;line-height:1.9;color:var(--text-2)">' + kpgEssenceHtml(d.essence) + '</div></div>';
  }

  if (d.children && d.children.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:700;margin-bottom:6px">📚 子考点 ' + d.children.length + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      d.children.map(function(ch) {
        return '<button onclick="kpgTreeSelect(' + ch.id + ')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:14px;border:1px solid var(--border-2);background:var(--bg-surface-high);cursor:pointer;font-size:12.5px;color:var(--text-1)">' +
          '<i style="width:6px;height:6px;border-radius:50%;background:' + (KP_FREQ_COLOR[ch.freq] || KP_FREQ_COLOR["未标注"]) + '"></i>' + esc(ch.name) +
          '<span class="text-muted" style="font-size:11px">' + ch.questionCount + '</span></button>';
      }).join("") + '</div></div>';
  }

  if (d.related && d.related.length) {
    html += '<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:700;margin-bottom:6px">🔗 关联考点（易混淆 / 常对比）</div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      d.related.slice(0, 10).map(function(r) {
        return '<button onclick="kpgTreeSelect(' + r.id + ')" title="' + esc(r.note || "") + '" style="padding:4px 12px;border-radius:14px;border:1px dashed var(--primary-4,#7fa8ff);background:transparent;cursor:pointer;font-size:12.5px;color:var(--primary-6)">' + esc(r.name) + '</button>';
      }).join("") + '</div></div>';
  }

  var qs = d.questions || [];
  if (kpGraphState.subject !== "全部") qs = qs.filter(function(q) { return q.paperName && q.paperName.indexOf(kpGraphState.subject) >= 0; });
  html += '<div style="font-size:13px;font-weight:700;margin:16px 0 8px">📝 关联真题 ' + qs.length + '（点击展开）</div>';
  qs.slice(0, 60).forEach(function(q, i) {
    var brief = String(q.stem || "").split("\n")[0].slice(0, 80);
    html += '<div style="margin-bottom:10px;border:1px solid var(--border-2);border-radius:10px;background:var(--bg-surface-high)">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer" onclick="kpgToggleDetail(' + q.id + ',this)">' +
        peTypeBadge(q.type) + peFreqBadge(kpGraphState.byId[id] ? kpGraphState.byId[id].freq : "") +
        (q.paperName ? '<span style="font-size:11.5px;color:var(--primary-6);white-space:nowrap">' + esc(q.paperName) + '</span>' : '') +
        '<span style="font-size:12.5px;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(brief) + '</span>' +
        '<span style="color:var(--primary-6);font-size:12px" class="kpg-arrow">展开 ▾</span>' +
      '</div>' +
      '<div class="kpg-detail" id="kpg-q-' + q.id + '" style="display:none;padding:0 14px 14px"></div>' +
    '</div>';
  });
  if (qs.length > 60) html += '<p class="text-muted" style="font-size:12px">…其余 ' + (qs.length - 60) + ' 题在历年真题页查看</p>';

  html += '</div></div>';
  main.innerHTML = html;
}

function kpgOpenInGraphView(id) {
  kpGraphState.view = "graph";
  kpgSetView("graph");
  if (id) kpgShowDetail(id);
}

/* ============================================================
   关系图谱视图（力导向）
   ============================================================ */
function kpgRenderGraphView() {
  var toolbar = document.getElementById("kpg-toolbar");
  if (toolbar) toolbar.innerHTML =
    '<input id="kpg-search" list="kpg-dl" placeholder="搜索考点名，回车定位..." onkeydown="if(event.key===\'Enter\')kpgFocusNode(this.value)" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-high);color:var(--text-1);min-width:190px;outline:none;font-size:13px">' +
    '<datalist id="kpg-dl">' + kpGraphState.nodes.map(function(n) { return '<option value="' + esc(n.name) + '">'; }).join("") + '</datalist>' +
    '<span style="display:inline-flex;border:1px solid var(--border-2);border-radius:8px;overflow:hidden">' +
      '<button id="kpg-cb-freq" onclick="kpgSetColor(\'freq\')" style="padding:5px 12px;border:none;cursor:pointer;font-size:12.5px;font-weight:600">按频率</button>' +
      '<button id="kpg-cb-branch" onclick="kpgSetColor(\'branch\')" style="padding:5px 12px;border:none;cursor:pointer;font-size:12.5px;font-weight:600">按分类</button>' +
    '</span>' +
    '<label style="font-size:12.5px;color:var(--text-2);display:inline-flex;align-items:center;gap:4px"><input type="checkbox" id="kpg-tg-sem" checked onchange="kpgToggleEdge(\'sem\',this.checked)"> 语义</label>' +
    '<label style="font-size:12.5px;color:var(--text-2);display:inline-flex;align-items:center;gap:4px"><input type="checkbox" id="kpg-tg-co" onchange="kpgToggleEdge(\'co\',this.checked)"> 共现</label>';
  var body = document.getElementById("kpg-body");
  body.innerHTML =
    '<div id="kpg-crumb" style="display:none;margin:0 0 8px;font-size:13px"></div>' +
    '<div style="display:flex;gap:14px;align-items:stretch">' +
      '<div class="content-card" style="flex:1;overflow:hidden"><div class="content-card-body" style="padding:0"><div id="kpg-chart" style="width:100%;height:620px"></div></div></div>' +
      '<div class="content-card" id="kpg-panel" style="width:360px;min-width:320px;max-height:660px;overflow-y:auto"><div class="content-card-header"><div class="content-card-title">考点详情</div></div><div class="content-card-body" id="kpg-panel-body"><p class="text-muted" style="font-size:13px">点击图中任意考点节点查看详情</p></div></div>' +
    '</div>';
  if (kpGraphState.chart) kpGraphState.chart.dispose();
  kpGraphState.chart = echarts.init(document.getElementById("kpg-chart"));
  kpGraphState.chart.on("click", function(p) {
    if (p.dataType === "node") kpgShowDetail(Number(p.data.id));
  });
  kpGraphState.chart.on("dblclick", function(p) {
    if (p.dataType === "node" && kpGraphState.byId[Number(p.data.id)] && kpGraphState.byId[Number(p.data.id)].isParent) {
      kpgSetFocus(Number(p.data.id));
    }
  });
  kpgStyleColorButtons();
  kpgApplyGraph();
  kpgRenderCrumb();
  if (kpGraphState.selected) kpgShowDetail(kpGraphState.selected);
}

function kpgStyleColorButtons() {
  var on = "background:var(--primary-6);color:#fff", off = "background:var(--bg-surface-high);color:var(--text-1)";
  var f = document.getElementById("kpg-cb-freq"), b = document.getElementById("kpg-cb-branch");
  if (f) f.style.cssText += ";" + (kpGraphState.colorBy === "freq" ? on : off);
  if (b) b.style.cssText += ";" + (kpGraphState.colorBy === "branch" ? on : off);
}

function kpgBranchRoot(id) {
  var n = kpGraphState.byId[id];
  while (n && n.parentId && kpGraphState.byId[n.parentId]) n = kpGraphState.byId[n.parentId];
  return n ? n.id : KPG_VIRTUAL_ROOT.id;
}

function kpgDescendants(rootId) {
  var out = [Number(rootId)], queue = [Number(rootId)];
  while (queue.length) {
    var cur = queue.shift();
    (kpGraphState.childrenOf[cur] || []).forEach(function(cid) { out.push(cid); queue.push(cid); });
  }
  return out;
}

function kpgApplyGraph() {
  var st = kpGraphState;
  if (!st.chart) return;
  var nodeIds = (st.focusId != null && st.byId[st.focusId]) ? kpgDescendants(st.focusId) : st.nodes.map(function(n) { return n.id; });
  if (st.subject !== "全部") {
    nodeIds = nodeIds.filter(function(id) {
      var n = st.byId[id];
      if (!n) return false;
      if (!n.isParent) return kpgSubjPass(n);
      return (st.childrenOf[id] || []).some(function(cid) { var c = st.byId[cid]; return c && !c.isParent && kpgSubjPass(c); });
    });
  }
  var inSet = {};
  nodeIds.forEach(function(id) { inSet[id] = true; });
  var focused = st.focusId != null && !!st.byId[st.focusId];

  var eNodes = nodeIds.map(function(id) {
    var n = st.byId[id];
    if (!n) return null;
    var size = n.isParent ? (focused ? 26 : 14) : (focused ? 12 + Math.sqrt(kpgSubjCount(n)) * 5 : 8 + Math.sqrt(kpgSubjCount(n)) * 4);
    var color = st.colorBy === "branch" ? st.branchColor[kpgBranchRoot(n.id)] : (KP_FREQ_COLOR[n.freq] || KP_FREQ_COLOR["未标注"]);
    return {
      id: String(n.id), name: n.name, symbolSize: size,
      itemStyle: { color: color, borderColor: n.isParent ? "#1e293b" : "transparent", borderWidth: n.isParent ? 2 : 0 },
      label: { show: focused || st.labels === "all" || n.isParent || size > 14, fontSize: n.isParent ? 13 : 11, fontWeight: n.isParent ? 700 : 400 }
    };
  }).filter(Boolean);

  function lineStyle(kind, weight) {
    if (kind === "semantic") return { color: "#3b82f6", width: 0.7 + (weight || 1) * 0.4, type: [5, 4], opacity: 0.55 };
    if (kind === "co") return { color: "#f59e0b", width: 0.5 + Math.min(weight || 1, 6) * 0.35, type: [2, 4], opacity: 0.35, curveness: 0.12 };
    return { color: "#475569", width: 1, opacity: 0.5 };
  }

  var eLinks = [];
  nodeIds.forEach(function(id) {
    var n = st.byId[id];
    if (n && n.parentId && inSet[n.parentId]) eLinks.push({ source: String(n.parentId), target: String(id), kind: "h", lineStyle: lineStyle("h") });
  });
  st.edges.forEach(function(e) {
    if (e.kind === "semantic" && !st.showSem) return;
    if (e.kind === "co" && !st.showCo) return;
    if (inSet[e.src] && inSet[e.dst]) eLinks.push({ source: String(e.src), target: String(e.dst), kind: e.kind, weight: e.weight, note: e.note, lineStyle: lineStyle(e.kind, e.weight) });
  });

  st.chart.setOption({
    tooltip: { formatter: function(p) {
      if (p.dataType === "edge") {
        if (p.data.kind === "h") return "";
        var a = st.byId[Number(p.data.source)], b = st.byId[Number(p.data.target)];
        var label = p.data.kind === "semantic" ? "语义关联" : "同卷共现 ×" + p.data.weight;
        return esc((a ? a.name : "") + " ↔ " + (b ? b.name : "")) + "<br><span style='color:#94a3b8'>" + label + (p.data.note ? " · " + esc(p.data.note) : "") + "</span>";
      }
      if (p.dataType !== "node") return "";
      var n = st.byId[Number(p.data.id)];
      if (!n) return esc(p.data.name);
      return esc(n.name) + (n.isParent ? "（分类，双击聚焦）" : "<br>关联真题: " + n.questionCount + " 题" + (n.freq !== "未标注" ? " · " + n.freq : ""));
    } },
    series: [{
      type: "graph", layout: "force", roam: true, draggable: true,
      data: eNodes, links: eLinks,
      force: { repulsion: focused ? 260 : (eLinks.length > 900 ? 90 : 110), edgeLength: focused ? [90, 200] : [45, 130], gravity: focused ? 0.08 : 0.14, friction: 0.25 },
      label: { position: "right", color: "#94a3b8" },
      emphasis: { focus: "adjacency", itemStyle: { shadowBlur: 12, shadowColor: "rgba(59,130,246,.6)" } },
      scaleLimit: { min: 0.4, max: 4 }
    }]
  }, { notMerge: true });
  st.chart.dispatchAction({ type: "downplay" });
}

function kpgSetColor(mode) { kpGraphState.colorBy = mode; kpgStyleColorButtons(); kpgApplyGraph(); }
function kpgToggleEdge(kind, on) { if (kind === "sem") kpGraphState.showSem = on; else kpGraphState.showCo = on; kpgApplyGraph(); }

function kpgSetFocus(id) {
  kpGraphState.focusId = (kpGraphState.focusId === id) ? null : id;
  kpgApplyGraph();
  kpgRenderCrumb();
}

function kpgRenderCrumb() {
  var el = document.getElementById("kpg-crumb");
  if (!el) return;
  if (kpGraphState.focusId == null || !kpGraphState.byId[kpGraphState.focusId]) { el.style.display = "none"; return; }
  var n = kpGraphState.byId[kpGraphState.focusId];
  el.style.display = "";
  el.innerHTML = '📍 已聚焦分类：<strong style="color:var(--primary-6)">' + esc(n.name) + '</strong>' +
    ' <span class="text-muted">（' + kpgDescendants(n.id).length + ' 个节点）</span>' +
    ' <button onclick="kpgSetFocus(' + n.id + ')" style="padding:2px 10px;margin-left:6px;border-radius:6px;border:1px solid var(--border-2);background:var(--bg-surface-high);color:var(--text-1);cursor:pointer;font-size:12px">退出聚焦</button>';
}

function kpgFocusNode(name) {
  if (!name) return;
  var hit = null;
  for (var i = 0; i < kpGraphState.nodes.length; i++) {
    if (kpGraphState.nodes[i].name === name || kpGraphState.nodes[i].name.indexOf(name) >= 0) { hit = kpGraphState.nodes[i]; break; }
  }
  if (!hit) { alert("未找到考点: " + name); return; }
  if (kpGraphState.chart) kpGraphState.chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: hit.name });
  kpgShowDetail(hit.id);
}

async function kpgShowDetail(id) {
  kpGraphState.selected = id;
  var body = document.getElementById("kpg-panel-body");
  if (!body) return;
  body.innerHTML = '<p class="text-muted" style="font-size:13px">加载考点详情...</p>';
  var d;
  try { d = kpGraphState.detailCache[id] || await apiGet("/kp/" + id); kpGraphState.detailCache[id] = d; }
  catch (e) { body.innerHTML = '<p style="color:var(--danger-6)">加载失败</p>'; return; }
  var html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<strong style="font-size:16px">' + esc(d.name) + '</strong>' + peFreqBadge(d.freq) +
    '<span class="text-muted" style="font-size:12px">' + d.questionCount + ' 题</span></div>';
  if (d.years && d.years.length) {
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">' +
      d.years.slice(0, 12).map(function(y) { return '<span style="padding:1px 8px;border-radius:10px;font-size:11px;background:var(--bg-surface-high);color:var(--text-2)">' + esc(y) + '</span>'; }).join("") + '</div>';
  }
  if (d.essence) html += '<p style="font-size:12.5px;line-height:1.8;color:var(--text-2);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">' + esc(d.essence.slice(0, 220)) + '…</p>';
  html += '<button onclick="kpgOpenInTree(' + id + ')" style="width:100%;margin:8px 0;padding:7px;border-radius:8px;border:1px solid var(--primary-6,#1664ff);background:var(--bg-surface-high);color:var(--primary-6,#1664ff);cursor:pointer;font-size:12.5px;font-weight:600">📖 在知识树中查看完整内容</button>';
  if (d.children && d.children.length) {
    html += '<div style="font-size:12px;font-weight:700;margin:10px 0 6px">子考点 ' + d.children.length + '</div>';
    d.children.slice(0, 8).forEach(function(ch) {
      html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;margin:3px 0;border:1px solid var(--border-2);border-radius:8px;cursor:pointer" onclick="kpgShowDetail(' + ch.id + ')">' +
        peFreqBadge(ch.freq) + '<span style="font-size:12.5px;flex:1">' + esc(ch.name) + '</span>' +
        '<span class="text-muted" style="font-size:11px">' + ch.questionCount + ' 题</span></div>';
    });
  }
  var qs = d.questions || [];
  if (kpGraphState.subject !== "全部") qs = qs.filter(function(q) { return q.paperName && q.paperName.indexOf(kpGraphState.subject) >= 0; });
  html += '<div style="font-size:12px;font-weight:700;margin:10px 0 6px">关联真题 ' + qs.length + '</div>';
  qs.slice(0, 15).forEach(function(q) {
    var brief = String(q.stem || "").split("\n")[0].slice(0, 42);
    html += '<div style="padding:7px 10px;margin:4px 0;border:1px solid var(--border-2);border-radius:8px;cursor:pointer" onclick="kpgOpenQuestion(' + q.id + ')">' +
      '<div style="display:flex;gap:6px;align-items:center">' + peTypeBadge(q.type) +
      (q.paperName ? '<span style="font-size:11px;color:var(--primary-6)">' + esc(q.paperName) + '</span>' : '') + '</div>' +
      '<div style="font-size:12px;color:var(--text-2);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(brief) + '</div></div>';
  });
  if (qs.length > 15) html += '<p class="text-muted" style="font-size:12px">…其余 ' + (qs.length - 15) + ' 题在知识树视图查看</p>';
  body.innerHTML = html;
}

var kpgQCache = {};
async function kpgOpenQuestion(qid) {
  var body = document.getElementById("kpg-panel-body");
  if (!body) return;
  var q = kpgQCache[qid];
  if (!q) {
    body.innerHTML = '<p class="text-muted" style="font-size:13px">加载真题...</p>';
    try { q = await apiGet("/past-exam/questions/" + qid); kpgQCache[qid] = q; } catch (e) { body.innerHTML = '<p style="color:var(--danger-6)">加载失败</p>'; return; }
  }
  var backId = q.kp ? q.kp.id : kpGraphState.selected;
  var html = '<button onclick="kpgShowDetail(' + backId + ')" style="padding:4px 12px;border-radius:6px;border:1px solid var(--border-2);background:var(--bg-surface-high);color:var(--text-1);cursor:pointer;font-size:12px;margin-bottom:10px">← 返回考点</button>';
  html += '<div style="font-size:14px;line-height:1.8;margin-bottom:10px">' + renderStemHtml(q.stem) + '</div>';
  html += '<div id="kpg-q-body"></div>';
  body.innerHTML = html;
  var holder = document.createElement("div");
  var renderP;
  if (q.type === "CASE" || q.type === "ESSAY") renderP = peRenderDetail(qid, holder);
  else { kpgRenderMcqQuiz(q, holder); renderP = Promise.resolve(); }
  renderP.then(function() {
    var el = document.getElementById("kpg-q-body");
    if (el) el.innerHTML = holder.innerHTML;
  });
}

/* ============================================================
   论文备考洞察 (#essay-insight) —— 考频全景 / 理论重复 / 回归窗口
   数据来源：2013.11-2026.05 架构设计师 16 次真题 64 题，人工标注主题域
   ============================================================ */
const EI = {
  exams: ["2013-11","2014-11","2015-11","2016-11","2017-11","2018-11","2019-11","2020-11","2021-11","2022-11","2023-11","2024-05","2024-11","2025-05","2025-11","2026-05"],
  themes: [
    { k:"svc",  name:"服务化架构", c:"#3b82f6" },
    { k:"data", name:"数据架构",   c:"#8b5cf6" },
    { k:"dm",   name:"设计方法",   c:"#10b981" },
    { k:"test", name:"测试与质量", c:"#f59e0b" },
    { k:"style",name:"架构风格",   c:"#06b6d4" },
    { k:"eai",  name:"企业集成",   c:"#f97316" },
    { k:"perf", name:"性能高并发", c:"#ef4444" },
    { k:"ops",  name:"维护与运维", c:"#64748b" },
    { k:"rel",  name:"可靠性",     c:"#14b8a6" },
    { k:"sec",  name:"安全架构",   c:"#e11d48" },
    { k:"eval", name:"架构评估",   c:"#a855f7" },
    { k:"req",  name:"需求工程",   c:"#84cc16" },
    { k:"mw",   name:"中间件",     c:"#94a3b8" }
  ],
  /* [考试序号, 题号, 主题域, 题目名] */
  qs: [
    [0,1,"dm","论软件架构建模技术与应用（4+1视图）"],
    [0,2,"style","论企业应用系统的分层架构风格"],
    [0,3,"rel","论软件可靠性设计技术的应用"],
    [0,4,"data","论分布式存储系统架构设计"],
    [1,1,"req","论软件需求管理"],
    [1,2,"req","论非功能性需求对企业应用架构设计的影响"],
    [1,3,"rel","论软件的可靠性设计"],
    [1,4,"sec","论网络安全体系设计（5大类安全服务）"],
    [2,1,"mw","论应用服务器基础软件"],
    [2,2,"style","论软件系统架构风格"],
    [2,3,"svc","论面向服务的架构及其应用（SOA参考架构）"],
    [2,4,"eai","论企业集成平台的技术与应用"],
    [3,1,"eval","论软件系统架构评估（质量属性）"],
    [3,2,"dm","论软件设计模式及其应用"],
    [3,3,"style","论数据访问层设计技术及其应用"],
    [3,4,"svc","论微服务架构及其应用（对比单块）"],
    [4,1,"dm","论软件系统建模方法及其应用"],
    [4,2,"style","论软件架构风格"],
    [4,3,"svc","论无服务器架构及其应用"],
    [4,4,"test","论软件质量保证及其应用（SQA）"],
    [5,1,"dm","论软件开发过程RUP及其应用"],
    [5,2,"ops","论软件体系结构的演化"],
    [5,3,"svc","论面向服务架构设计及其应用（技术标准）"],
    [5,4,"data","论NoSQL数据库技术及其应用"],
    [6,1,"dm","论软件设计方法及其应用"],
    [6,2,"eval","论软件系统架构评估及其应用（SAAM/ATAM/CBAM）"],
    [6,3,"data","论数据湖技术及其应用（vs数仓5维度）"],
    [6,4,"perf","论负载均衡技术在Web系统中的应用（三种算法）"],
    [7,1,"data","论数据分片技术及其应用"],
    [7,2,"svc","论云原生架构及其应用（四类设计原则）"],
    [7,3,"test","论软件测试中缺陷管理及其应用"],
    [7,4,"eai","论企业集成架构设计及应用（三类集成技术）"],
    [8,1,"dm","论面向方面的编程技术及其应用（AOP）"],
    [8,2,"sec","论系统安全架构设计及其应用（鉴别+访问控制）"],
    [8,3,"eai","论企业集成平台的理解与应用（基本功能）"],
    [8,4,"svc","论微服务架构及其应用（优点）"],
    [9,1,"dm","论基于构件的软件开发方法及其应用"],
    [9,2,"ops","论软件维护方法及其应用（影响因素）"],
    [9,3,"data","论区块链技术及应用（3种核心技术）"],
    [9,4,"data","论湖仓一体架构及其应用（四类关键特征）"],
    [10,1,"dm","论面向对象分析的应用与实现"],
    [10,2,"eai","论多数据源集成的应用与实现"],
    [10,3,"rel","论软件可靠性评价的设计与实现"],
    [10,4,"svc","论边云协同的设计与实现"],
    [11,1,"data","论大数据Lambda架构（三层特性）"],
    [11,2,"test","论单元测试及其应用（静态/动态）"],
    [11,3,"dm","论模型驱动架构设计方法及其应用（MDA）"],
    [11,4,"ops","论云上自动化运维及其应用（CloudOps指标）"],
    [12,1,"ops","论软件维护及其应用（工作内容+可维护性）"],
    [12,2,"svc","论面向服务的架构设计（SOA特征与重用）"],
    [12,3,"eai","论多源异构数据集成方法"],
    [12,4,"svc","论分布式事务及其解决方案（四种方案）"],
    [13,1,"style","论事件驱动架构（EDA概念与全过程）"],
    [13,2,"perf","论负载均衡设计技术（静/动/场景化）"],
    [13,3,"test","论AI测试用例生成（支持TDD）"],
    [13,4,"data","论多模型数据管理技术及其应用"],
    [14,1,"data","论云原生数据库技术及其应用"],
    [14,2,"test","论性能测试技术及其应用（类型/指标/流程）"],
    [14,3,"svc","论Serverless架构及其应用（核心组成）"],
    [14,4,"perf","论秒杀场景及其实践（扩容/缓存/限流/降级）"],
    [15,1,"test","论多模态大模型在移动智能测试框架中的应用"],
    [15,2,"style","论六边形架构的设计和应用"],
    [15,3,"perf","论系统高并发性能优化的设计与实践"],
    [15,4,"data","论向量数据库的设计与应用"]
  ],
  /* 理论重复组：name / 主题色 / 考次日期 / 备注 */
  groups: [
    { name:"架构风格清单", k:"style", dots:["2015-11","2017-11"], note:"几乎逐字重复，隔2年" },
    { name:"可靠性设计技术", k:"rel", dots:["2013-11","2014-11"], note:"连续两年同题" },
    { name:"高并发技术集(缓存/限流/降级)", k:"perf", dots:["2025-11","2026-05"], note:"技术集合高度重叠，连续两年" },
    { name:"数据集成(多源异构)", k:"eai", dots:["2023-11","2024-11"], note:"连续两次，内容+技术路线" },
    { name:"微服务特点/优点", k:"svc", dots:["2016-11","2021-11"], note:"同题级重复，隔5年" },
    { name:"企业集成平台基本功能", k:"eai", dots:["2015-11","2021-11"], note:"同一采分点(≥4种功能)" },
    { name:"SOA理论", k:"svc", dots:["2015-11","2018-11","2024-11"], note:"三考：参考架构→技术标准→特征与重用" },
    { name:"Serverless", k:"svc", dots:["2017-11","2025-11"], note:"同域深化：特点→核心组成+协同" },
    { name:"负载均衡", k:"perf", dots:["2019-11","2025-05"], note:"升级：三种算法→静/动/场景化" },
    { name:"架构评估", k:"eval", dots:["2016-11","2019-11"], note:"递进：质量属性→评估方法对比" },
    { name:"软件维护", k:"ops", dots:["2022-11","2024-11"], note:"影响因素→工作内容+可维护性" },
    { name:"云原生", k:"svc", dots:["2020-11","2024-05","2025-11"], note:"三侧面：四原则/CloudOps/云原生数据库" },
    { name:"建模方法", k:"dm", dots:["2013-11","2017-11","2024-05"], note:"三框架：4+1视图/方法分类/MDA" },
    { name:"安全框架", k:"sec", dots:["2014-11","2021-11"], note:"5类安全服务→鉴别+访问控制" }
  ],
  /* 回归窗口候选：理论点 / 上次考核 / 距2026.10.24年数(估算) / 标签 */
  regression: [
    { name:"可靠性设计技术（纯设计，非评价）", last:"2014.11", gap:11.8 },
    { name:"设计模式三大类（创建5/结构7/行为11）", last:"2016.11", gap:9.8 },
    { name:"架构风格清单+各自含义", last:"2017.11", gap:8.8 },
    { name:"架构评估方法对比（SAAM/ATAM/CBAM）", last:"2019.11", gap:6.8, tag:"09范文已备" },
    { name:"云原生四类设计原则", last:"2020.11", gap:5.8 },
    { name:"微服务特点/优点（vs单块≥4条）", last:"2021.11", gap:4.8, tag:"v3已备" },
    { name:"企业集成平台基本功能（≥4种）", last:"2021.11", gap:4.8 },
    { name:"安全鉴别+访问控制框架", last:"2021.11", gap:4.8 },
    { name:"软件维护工作内容+可维护性", last:"2024.11", gap:1.8 },
    { name:"SOA特征与软件重用", last:"2024.11", gap:1.8 },
    { name:"分布式事务四种方案", last:"2024.11", gap:1.8, tag:"刚考概率低" },
    { name:"数据集成内容+技术路线", last:"2024.11", gap:1.8, tag:"刚考概率低" },
    { name:"性能测试类型/指标/流程", last:"2025.11", gap:0.8, tag:"刚考概率低" },
    { name:"向量数据库/高并发技术集", last:"2026.05", gap:0.3, tag:"刚考概率低" }
  ],
  cards: [
    { t:"设计模式三大类", y:"2016.11", gap:9.8, body:'<b>创建型</b>（工厂方法、抽象工厂、单例、建造者、原型）——封装对象创建逻辑；<b>结构型</b>（适配器、桥接、组合、装饰、外观、享元、代理）——简化类与对象的组合结构；<b>行为型</b>（策略、观察者、命令、模板方法、迭代器、状态、职责链、中介者、备忘录、访问者、解释器）——对象职责分配与交互算法。<br><span style="color:var(--text-2)">项目素材：报表导出用策略模式、指标计算用模板方法、预警通知用观察者。</span>' },
    { t:"架构风格清单", y:"2017.11", gap:8.8, body:'管道-过滤器、客户机/服务器、分层、事件驱动（隐式调用）、微内核（插件）、仓库（数据库/黑板）、解释器、面向对象、环状、C2；云时代延伸：微服务、Serverless、六边形（端口适配器）。<br><span style="color:var(--text-2)">项目素材：采集链路=管道过滤、平台主体=分层+事件驱动、Agent=微服务。</span>' },
    { t:"架构评估方法对比", y:"2019.11", gap:6.8, body:'<b>SAAM</b>：验证"架构是否支持场景"，可修改性为主，场景开发/分类/评估五步，轻量；<b>ATAM</b>：揭示"属性之间如何权衡"，识别敏感点/权衡点/风险，效用树+九步，多属性；<b>CBAM</b>：回答"改进是否经济"，效用-响应曲线+投资回报排序。<br><span style="color:var(--text-2)">完整实践已写入 09 范文（ATAM：36场景/11风险/12月故障验证）。</span>' },
    { t:"云原生四类设计原则", y:"2020.11", gap:5.8, body:'<b>服务化</b>（微服务/Serverless拆分）、<b>弹性</b>（伸缩弹性+资源弹性+故障弹性）、<b>可观测性</b>（指标/日志/链路追踪）、<b>自动化</b>（CI/CD、声明式API）。<br><span style="color:var(--text-2)">协同型模板：服务化是基础，弹性是目标，可观测性提供反馈，自动化保障落地，四者协同实现敏捷交付与高可用。</span>' },
    { t:"微服务特点/优点", y:"2021.11", gap:4.8, body:'服务自治（独立开发部署伸缩）、围绕业务能力组织、去中心化数据治理（每服务独立库）、轻量级通信（REST/MQ）、故障隔离、技术异构、基础设施自动化。与单块对比：优点=独立演进/弹性/容错，代价=分布式复杂性/事务/运维成本。<br><span style="color:var(--text-2)">项目素材：v3 范文 15 服务拆分全套。</span>' },
    { t:"企业集成平台基本功能（≥4种）", y:"2021.11", gap:4.8, body:'通信服务（消息路由/协议转换）、信息服务（元数据/主数据管理）、应用集成（API/事件适配）、流程集成（BPM编排）、数据集成（ETL/复制）、管理与监控。<br><span style="color:var(--text-2)">项目素材恰好一一对应：RocketMQ=通信、主数据=信息、API网关=应用、Camunda=流程、DataX=数据。</span>' },
    { t:"安全鉴别+访问控制框架", y:"2021.11", gap:4.8, body:'<b>鉴别</b>=认证主体身份：口令、生物特征、OTP、证书PKI、双因素；<b>访问控制</b>=授权策略：DAC自主、MAC强制、RBAC基于角色、ABAC基于属性。主要威胁：口令破解/社会工程/越权访问/重放攻击/提权，危害=数据泄露篡改、身份冒用、不可抵赖性丧失。<br><span style="color:var(--text-2)">项目素材：RBAC权限服务+财务数据分级+Agent权限隔离+审计留痕。</span>' },
    { t:"可靠性设计技术", y:"2014.11", gap:11.8, body:'<b>避错</b>（正规化方法/严格测试验证）、<b>检错</b>（断言/防御性编程/心跳探测/校验码）、<b>容错</b>（N版本程序设计、恢复块+接受测试、冗余：结构/信息/时间）。协同：预防→发现→自愈，压缩MTTR拉长MTTF。组装提纲见 data/papers/14。<br><span style="color:var(--text-2)">项目素材：熔断降级+主从复制+幂等设计+异地备份。注意与"可靠性评价"（2023.11考过：模型选择/数据收集/评估预测）区分。</span>' },
    { t:"可观测性架构", y:"2020.11(四原则之一)", gap:5.8, body:'<b>三支柱：</b><b>指标Metrics</b>（Prometheus，聚合时序数值——QPS/延迟/错误率，回答"发生了什么"）、<b>日志Logging</b>（结构化日志聚合，回答"为什么"）、<b>链路追踪Tracing</b>（SkyWalking/OpenTelemetry，TraceID贯穿全链路，回答"哪里慢/谁调用谁"）。<b>协同叙事：</b>指标发现异常→追踪定位到服务→日志定位根因，三者以统一时间轴与TraceID关联，形成"发现-定位-诊断"闭环，并为弹性伸缩提供决策依据、为SLO提供度量数据。<br><span style="color:var(--text-2)">项目素材：Prometheus+SkyWalking全链路监控、告警分级推送（高/中/低）、99.99%可用性度量。</span>' }
  ]
};

let eiCharts = [];
const THEME_COLOR = {};
EI.themes.forEach(function(t){ THEME_COLOR[t.k] = t.c; });
function T_COLOR(k) { return THEME_COLOR[k] || "#94a3b8"; }
function eiDispose() { eiCharts.forEach(function(ch){ try { ch.dispose(); } catch(e){} }); eiCharts = []; }

async function renderEssayInsight(c) {
  eiDispose();
  var cnt = {}, cntMech = {};
  EI.qs.forEach(function(q){ var k=q[2]; cnt[k]=(cnt[k]||0)+1; if(q[0]>=11) cntMech[k]=(cntMech[k]||0)+1; });

  var chips = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 4px">' +
    '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px;font-weight:600">16 次考试 · 64 题（4选1）</span>' +
    '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px">13 个主题域</span>' +
    '<span style="padding:6px 14px;border-radius:20px;background:#fef3c7;color:#92400e;font-size:13px;font-weight:600">机考后 5 次 20 题：测试+数据+性能占 55%</span>' +
    '<span style="padding:6px 14px;border-radius:20px;background:#fee2e2;color:#991b1b;font-size:13px;font-weight:600">第2问理论 40% 有"前科"</span>' +
    '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px">目标：2026.10.24/25</span>' +
  '</div>';

  var rankHtml = '';
  EI.themes.forEach(function(t) {
    var n = cnt[t.k]||0, m = cntMech[t.k]||0;
    rankHtml += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">' +
      '<span style="width:10px;height:10px;border-radius:3px;background:' + t.c + ';flex:none"></span>' +
      '<span style="flex:1">' + t.name + '</span>' +
      '<span style="font-weight:700">' + n + '</span>' +
      (m ? '<span style="font-size:11px;color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:8px">机考' + m + '</span>' : '') +
    '</div>';
  });

  var html = '<div class="page-title">论文备考洞察</div>' +
    '<div class="page-subtitle">基于 2013.11–2026.05 架构设计师 16 次论文真题的考频、理论重复与回归窗口分析（悬停图表可看明细）</div>' +
    chips +
    '<div class="stack" style="margin-top:14px">' +
    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">考频全景：每次考试考了什么</div><span class="text-muted" style="font-size:12px">右侧排行含机考后（2024.05起）出现次数</span></div>' +
      '<div class="content-card-body" style="display:flex;gap:18px;flex-wrap:wrap">' +
        '<div id="ei-heatmap" style="flex:1;min-width:560px;height:420px"></div>' +
        '<div style="flex:0 0 230px;max-width:100%"><div style="font-weight:700;font-size:13px;margin-bottom:6px;color:var(--text-1)">主题域考频排行</div>' + rankHtml + '</div>' +
      '</div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">重考规律：同一理论点的回归轨迹</div><span class="text-muted" style="font-size:12px">每个圆点=该理论被考一次，红色区域即回归窗口</span></div>' +
      '<div class="content-card-body"><div id="ei-beads" style="width:100%;height:520px"></div>' +
      '<div style="margin-top:8px;padding:10px 14px;border-radius:8px;background:var(--bg-surface-high);font-size:13px;color:var(--text-2)">规律：<b style="color:var(--text-1)">同一知识点 5–8 年换个外壳重考是常态</b>——知识点不变，场景包装跟着时代走（秒杀/高并发 = 老性能专题的电商外壳，向量数据库 = NoSQL 的 AI 版本）。背理论模板的性价比远高于押新题。</div></div></div>' +

    '<div class="grid-2">' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">2026.10.24 回归窗口倒计时</div><span class="text-muted" style="font-size:12px">距上次考核年数（按 2026.10.24 时点估算）</span></div>' +
        '<div class="content-card-body"><div id="ei-regression" style="width:100%;height:460px"></div></div></div>' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">机考后命题风向（20 题）</div></div>' +
        '<div class="content-card-body"><div id="ei-mech" style="width:100%;height:220px"></div>' +
        '<div style="margin-top:10px;font-size:13px;line-height:1.9;color:var(--text-1)"><b>第2问问法已换风格：</b><br>' +
        '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:var(--bg-surface-high);font-size:12px;margin:2px 4px 2px 0">2013-2019 列举型</span>"有哪些X？阐述每类的含义/特点"<br>' +
        '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#fee2e2;color:#991b1b;font-size:12px;margin:2px 4px 2px 0">2024.05起 组成+协同型</span>"核心组成部分及作用，如何协同实现XX目标"（2025.11 三道全是）<br>' +
        '<span style="color:#b45309">⚠ 漏答"协同链路/目标回应"是当前最大隐性失分点</span></div></div></div>' +
    '</div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">高概率回归理论背诵卡（第2问直接默写素材）</div><span class="text-muted">点击展开 · 每卡含要点+项目素材映射</span></div>' +
      '<div class="content-card-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px">';
  EI.cards.forEach(function(card, i) {
    html += '<details style="border:1px solid var(--border-2);border-radius:10px;padding:10px 14px;background:var(--bg-card)">' +
      '<summary style="cursor:pointer;font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span style="color:var(--primary-6)">' + (i+1) + '. ' + card.t + '</span>' +
        '<span style="font-size:11px;color:#991b1b;background:#fee2e2;padding:1px 8px;border-radius:8px">上次 ' + card.y + '</span>' +
        '<span style="font-size:11px;color:#92400e;background:#fef3c7;padding:1px 8px;border-radius:8px">已隔≈' + card.gap + '年</span>' +
      '</summary>' +
      '<div style="font-size:13px;line-height:1.9;margin-top:8px;color:var(--text-1)">' + card.body + '</div></details>';
  });
  html += '</div></div>';

  html += '<div class="content-card"><div class="content-card-header"><div class="content-card-title">备考资产索引（data/papers/）</div></div><div class="content-card-body" style="font-size:13px;line-height:2">' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:var(--bg-surface-high);margin:2px 4px 2px 0">04-backbone.md 项目事实卡·唯一数字口径</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#dbeafe;color:#1e40af;margin:2px 4px 2px 0">02-v3 微服务+Agent（考场版）</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#ede9fe;color:#5b21b6;margin:2px 4px 2px 0">05 数据集成(2024.11真题)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#ede9fe;color:#5b21b6;margin:2px 4px 2px 0">06 湖仓一体(2022.11真题)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;margin:2px 4px 2px 0">07 负载均衡(2025.5真题)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;margin:2px 4px 2px 0">08 性能测试(2025.11真题)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#dcfce7;color:#166534;margin:2px 4px 2px 0">09 架构评估(回归预测)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;margin:2px 4px 2px 0">10 理论重复分析+背诵卡</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#fee2e2;color:#991b1b;margin:2px 4px 2px 0">13 AI-RAG范文(2026.10押题·一档头名)</span>' +
    '<span style="display:inline-block;padding:3px 10px;border-radius:8px;background:#fef3c7;color:#92400e;margin:2px 4px 2px 0">14 可靠性组装提纲(二档押题)</span>' +
    '<a href="/sprint.html" style="text-decoration:none;display:inline-block;padding:3px 10px;border-radius:8px;background:#1e40af;color:#ffffff;margin:2px 4px 2px 0">15 冲刺版总集(📱手机页 /sprint.html)</a>' +
    '<br><span class="text-muted">考场组合策略：主干事实不变 → 从最接近的范文抽 2 个小节 + 从 03-modules 抽 1 个模块重组；交卷前 5–8 分钟专查数字口径与专有名词一致性。</span>' +
  '</div></div></div>';

  c.innerHTML = html;
  if (!window.echarts) return;

  /* 图1：考频热力全景 */
  var cellQ = {};
  EI.qs.forEach(function(q){ var key = q[0] + ":" + q[2]; (cellQ[key] = cellQ[key] || []).push("第" + q[1] + "题 " + q[3]); });
  var heatData = [];
  EI.qs.forEach(function(q) {
    var ti = EI.themes.findIndex(function(t){ return t.k === q[2]; });
    var same = EI.qs.filter(function(o){ return o[0]===q[0] && o[2]===q[2]; }).length;
    heatData.push({ value:[q[0], ti, same], itemStyle:{ color:T_COLOR(q[2]), borderRadius:4 } });
  });
  var hm = echarts.init(document.getElementById("ei-heatmap"));
  hm.setOption({
    tooltip: { formatter: function(p) {
      var list = cellQ[p.value[0] + ":" + EI.themes[p.value[1]].k] || [];
      return "<b>" + EI.themes[p.value[1]].name + "</b> · " + EI.exams[p.value[0]] + "<br>" + list.join("<br>");
    } },
    grid: { left: 90, right: 16, top: 30, bottom: 46 },
    xAxis: { type:"category", data: EI.exams, splitArea:{show:false}, axisLabel:{ fontSize:10, rotate:45, color:"#94a3b8" }, axisTick:{show:false}, axisLine:{lineStyle:{color:"#e2e8f0"}} },
    yAxis: { type:"category", data: EI.themes.map(function(t){ return t.name; }), inverse:true, axisLabel:{ fontSize:11.5, color:"#475569" }, axisTick:{show:false}, axisLine:{lineStyle:{color:"#e2e8f0"}} },
    series: [{ type:"heatmap", data: heatData,
      markArea: { silent:true, itemStyle:{ color:"rgba(59,130,246,0.05)" }, label:{ show:true, position:"insideTop", color:"#3b82f6", fontSize:11, formatter:"机考时期" },
        data:[[{ xAxis: 10.5 }, { xAxis: 15.5 }]] },
      markLine: { silent:true, symbol:"none", lineStyle:{ color:"#ef4444", type:"dashed", width:1.5 },
        label:{ show:true, formatter:"2024.05 机考", fontSize:10, color:"#ef4444", distance:4 },
        data:[{ xAxis: 10.5 }] }
    }]
  });
  eiCharts.push(hm);

  /* 图2：理论重复回归轨迹 */
  var beadData = [];
  EI.groups.forEach(function(g, gi) {
    g.dots.forEach(function(d, di) {
      var dt = d.replace("-", "/") + "/01";
      beadData.push({ value:[dt, gi], group:g.name, date:d, note:g.note,
        prev: di>0 ? g.dots[di-1] : null,
        itemStyle:{ color:THEME_COLOR[g.k], borderColor:"#fff", borderWidth:1.5, shadowBlur:4, shadowColor:"rgba(0,0,0,0.2)" } });
    });
  });
  var bd = echarts.init(document.getElementById("ei-beads"));
  bd.setOption({
    tooltip: { formatter: function(p) {
      var gapTxt = p.data.prev ? "（与上次间隔 " + (parseInt(p.data.date.slice(0,4),10)-parseInt(p.data.prev.slice(0,4),10)) + " 年）" : "";
      return "<b>" + p.data.group + "</b><br>" + p.data.date + " 考核" + gapTxt + "<br><span style='color:#94a3b8'>" + p.data.note + "</span>";
    } },
    grid: { left: 150, right: 60, top: 34, bottom: 40 },
    xAxis: { type:"time", min:"2013/06/01", max:"2026/12/01", axisLabel:{ fontSize:10, color:"#94a3b8", formatter:function(v){ var d=new Date(v); return String(d.getFullYear()); } } },
    yAxis: { type:"category", data: EI.groups.map(function(g){ return g.name; }), inverse:true, axisLabel:{ fontSize:11, color:"#475569" }, axisTick:{show:false}, axisLine:{lineStyle:{color:"#e2e8f0"}} },
    series: [{ type:"scatter", symbolSize:15, data: beadData,
      markArea: { silent:true, itemStyle:{ color:"rgba(239,68,68,0.07)" }, label:{ show:true, position:"insideTop", color:"#dc2626", fontSize:11, formatter:"回归窗口" },
        data:[[{ xAxis:"2026/09/29" }, { xAxis:"2026/10/25" }]] },
      markLine: { silent:true, symbol:"none",
        data: [
          { xAxis:"2026/09/29", lineStyle:{ color:"#64748b", type:"dashed" }, label:{ formatter:"现在", fontSize:10, color:"#64748b" } },
          { xAxis:"2026/10/24", lineStyle:{ color:"#dc2626", width:2 }, label:{ formatter:"10.24 考试", fontSize:10.5, color:"#dc2626", fontWeight:700 } }
        ] }
    }]
  });
  eiCharts.push(bd);

  /* 图3：回归窗口倒计时 */
  function gapColor(v) { return v>=8?"#dc2626":(v>=4.5?"#f97316":(v>=3?"#f59e0b":(v>=1.5?"#64748b":"#cbd5e1"))); }
  var reg = EI.regression.slice().sort(function(a,b){ return b.gap-a.gap; });
  var rg = echarts.init(document.getElementById("ei-regression"));
  rg.setOption({
    tooltip: { formatter: function(p){ return "<b>" + p.name + "</b><br>上次考核：" + p.data.last + "<br>已隔 ≈" + p.value + " 年" + (p.data.tag?"<br><span style='color:#92400e'>"+p.data.tag+"</span>":""); } },
    grid: { left: 8, right: 90, top: 8, bottom: 20, containLabel:true },
    xAxis: { type:"value", axisLabel:{ fontSize:10, color:"#94a3b8", formatter:"{value}年" }, splitLine:{ lineStyle:{ color:"#f1f5f9" } } },
    yAxis: { type:"category", data: reg.map(function(r){ return r.name; }), axisLabel:{ fontSize:11, color:"#475569" }, axisTick:{show:false}, axisLine:{show:false} },
    series: [{ type:"bar", barWidth:14,
      data: reg.map(function(r){ return { value:r.gap, last:r.last, tag:r.tag, itemStyle:{ color:gapColor(r.gap), borderRadius:[0,7,7,0] } }; }),
      label: { show:true, position:"right", fontSize:10.5, color:"#64748b", formatter:function(p){ return "上次" + p.data.last; } }
    }]
  });
  eiCharts.push(rg);

  /* 图4：机考后分布玫瑰图 */
  var mechData = EI.themes.filter(function(t){ return (cntMech[t.k]||0)>0; }).map(function(t){ return { name:t.name+" ("+cntMech[t.k]+")", value:cntMech[t.k], itemStyle:{ color:t.c } }; });
  var mc = echarts.init(document.getElementById("ei-mech"));
  mc.setOption({
    tooltip: { trigger:"item", formatter:"{b}：{c} 题（{d}%）" },
    series: [{ type:"pie", radius:["38%","68%"], center:["50%","52%"], data:mechData,
      label:{ fontSize:11, color:"#475569", formatter:"{b}" }, labelLine:{ length:8, length2:8 },
      itemStyle:{ borderColor:"#fff", borderWidth:2 } }]
  });
  eiCharts.push(mc);

  window.addEventListener("resize", function(){ eiCharts.forEach(function(ch){ try{ch.resize();}catch(e){} }); });
}
/* ============================================================
   记忆宫殿 (#memory-palace) —— 论文知识点的空间记忆法 v2
   S 形蛇形动线：房间按巡游顺序排布，路线零交叉；
   编号路标 + 已走段实线高亮 + 回归年份徽章 + 图例区
   ============================================================ */
const MP = {
  tour: ["foyer","living","dining","kitchen","bath","study","bedroom","balcony","garage","garden"],
  rooms: {
    foyer:  { name:"玄关", tag:"考场策略", c:"#64748b", box:[30,400,160,110],
      items:[
        { obj:"鞋柜上的四步选题卡", theory:"选题四步法", detail:"①先看第3问，挑亲手踩过坑的题 ②校验第2问能否列3-5条理论 ③警惕没做过的时髦题（向量库/多模态） ④两个都熟选偏工程的" },
        { obj:"墙上的挂钟", theory:"时间分配", detail:"选题≤10分钟 → 摘要公式化 → 正文80分钟 → 最后8分钟只查两件事：数字口径一致、专有名词统一" },
        { obj:"门垫刻字", theory:"摘要最后写", detail:"约320字：背景1句+痛点1句+角色1句+本文结构2句+效果数据1句" }
      ],
      mnemonic:"进门先看第三问，八分留给对口径" },
    living: { name:"客厅", tag:"万能项目", c:"#f59e0b", box:[200,400,230,110],
      items:[
        { obj:"三人沙发", theory:"项目背景", detail:"制造业集团 · 30余家子公司 · 年营收超50亿 · 痛点：人工采集3天/新人半年上手/风险滞后（45→68天，300万坏账）" },
        { obj:"电视大屏", theory:"效果数据", detail:"报告3天→2小时 · 准确率75%→92% · 数据问题-85% · 年省40万 · 免坏账500万 · 接口120ms · 可用性99.99%" },
        { obj:"茶几上的立项书", theory:"项目骨架", detail:"2024年3月启动→11月上线，历时8个月，团队28人，本人任系统架构师" },
        { obj:"沙发旁的AI音箱", theory:"架构事实", detail:"15个服务=业务6+Agent5+基础设施4（别说15个微服务） · 42个领域事件 · 10个限界上下文" }
      ],
      mnemonic:"沙发坐着集团，电视放着效果，音箱报着架构" },
    dining: { name:"餐厅", tag:"企业集成平台 · 已隔≈5年", c:"#f97316", box:[440,400,150,110],
      items:[
        { obj:"餐桌转盘", theory:"通信服务", detail:"消息路由/协议转换 → 项目里就是 RocketMQ" },
        { obj:"菜单", theory:"信息服务", detail:"元数据/主数据管理 → 集团科目主数据" },
        { obj:"公筷", theory:"应用集成", detail:"API/事件适配 → API网关" },
        { obj:"上菜顺序卡", theory:"流程集成", detail:"BPM编排 → Camunda 流程引擎" },
        { obj:"中央汤锅", theory:"数据集成", detail:"ETL/复制汇聚 → DataX+Flink CDC" },
        { obj:"值班经理", theory:"管理与监控", detail:"集成平台运行监控告警" }
      ],
      mnemonic:"转盘·菜单·公筷·顺序·汤锅·经理——六道菜上齐" },
    kitchen:{ name:"厨房", tag:"可靠性设计技术 · 已隔≈12年", c:"#14b8a6", box:[600,400,150,110],
      items:[
        { obj:"橱柜密封罐", theory:"避错", detail:"正规化方法、严格的测试验证——把错误封死在罐子里不发生" },
        { obj:"双开门冰箱", theory:"冗余", detail:"结构/信息/时间冗余；主从半同步复制、异地备份——冰箱坏了另一门还冷" },
        { obj:"烟雾报警器", theory:"检错", detail:"心跳探测、断言、防御性编程、校验码——冒烟就响" },
        { obj:"灭火器", theory:"容错", detail:"N版本程序设计、恢复块+接受测试——烧了也能扑" },
        { obj:"灶台便签", theory:"项目映射", detail:"熔断降级+主从复制+幂等设计+异地备份；注意与可靠性评价区分（2023.11考过评价：模型选择/数据收集/评估预测）" }
      ],
      mnemonic:"罐避·警检·灭容——冰箱永远有备门" },
    bath:   { name:"浴室", tag:"安全框架 · 已隔≈5年", c:"#e11d48", box:[590,210,160,160],
      items:[
        { obj:"智能门锁", theory:"鉴别（认证身份）", detail:"口令、生物特征、OTP、证书PKI、双因素——先证明你是你" },
        { obj:"浴室镜子", theory:"访问控制（授权）", detail:"DAC自主/MAC强制/RBAC基于角色/ABAC基于属性——镜子里看清你能碰什么" },
        { obj:"莲蓬头分流", theory:"数据分级", detail:"财务数据按密级分流推送" },
        { obj:"地漏", theory:"主要威胁", detail:"口令破解/社会工程/越权访问/重放攻击/提权——危害：泄露篡改、身份冒用、抵赖——都从地漏排走" },
        { obj:"毛巾架便签", theory:"项目映射", detail:"RBAC权限服务+财务数据分级+Agent权限隔离+审计留痕" }
      ],
      mnemonic:"锁辨人、镜授权、漏排险" },
    study:  { name:"书房", tag:"设计模式 5/7/11 · 已隔≈10年", c:"#10b981", box:[400,210,180,160],
      items:[
        { obj:"书架顶层帽子盒×5", theory:"创建型", detail:"工厂方法、抽象工厂、单例、建造者、原型——工厂生产帽子（对象如何出生）" },
        { obj:"中层西装×7", theory:"结构型", detail:"适配器、桥接、组合、装饰、外观、享元、代理——穿衣搭配（对象如何组装）" },
        { obj:"抽屉档案×11", theory:"行为型", detail:"策略、观察者、命令、模板方法、迭代器、状态、职责链、中介者、备忘录、访问者、解释器——为人处世（对象如何交互）" },
        { obj:"桌上项目笔记", theory:"项目映射", detail:"报表导出=策略模式 · 指标计算=模板方法 · 预警通知=观察者" }
      ],
      mnemonic:"帽造·衣构·档行为——5、7、11" },
    bedroom:{ name:"卧室", tag:"架构风格清单 · 已隔≈9年", c:"#06b6d4", box:[210,210,180,160],
      items:[
        { obj:"床垫三层", theory:"分层风格", detail:"表现层/业务逻辑层/数据访问层——层间松耦合、不跨层调用" },
        { obj:"床头门铃", theory:"事件驱动", detail:"隐式调用、发布订阅——按门铃才响应" },
        { obj:"进水管", theory:"管道-过滤器", detail:"数据流经一系列处理单元——采集链路就是它" },
        { obj:"床架+插座", theory:"微内核", detail:"核心+插件——插座上随插随用" },
        { obj:"衣柜", theory:"仓库风格", detail:"数据库/黑板——中央存储各取所需" },
        { obj:"墙上全家福", theory:"客户机/服务器", detail:"一请求一响应" },
        { obj:"床头新海报", theory:"云时代成员", detail:"微服务、Serverless、六边形（端口适配器）——风格家族在不断添丁" }
      ],
      mnemonic:"垫分·铃事·管水·架微·柜仓·福主从" },
    balcony:{ name:"阳台", tag:"云原生四原则 · 已隔≈6年", c:"#2563eb", box:[30,210,170,160],
      items:[
        { obj:"主干植物", theory:"服务化", detail:"微服务/Serverless 拆分——一切从主干长出" },
        { obj:"伸缩花架", theory:"弹性", detail:"资源弹性+故障弹性+伸缩——架子能伸能缩" },
        { obj:"叶面传感器", theory:"可观测性", detail:"指标/日志/链路追踪（Prometheus+SkyWalking）——叶子感知阳光" },
        { obj:"自动浇花器", theory:"自动化", detail:"CI/CD、声明式API——不用人浇水" },
        { obj:"花架说明牌", theory:"协同型模板", detail:"服务化是基础、弹性是目标、可观测性给反馈、自动化保落地——四者协同实现敏捷与高可用" }
      ],
      mnemonic:"干·架·叶·浇——服务化、弹性、可观测、自动化" },
    garage: { name:"车库", tag:"微服务特点 · 已隔≈5年", c:"#3b82f6", box:[30,30,180,150],
      items:[
        { obj:"一队各自开的小车", theory:"服务自治", detail:"独立开发、独立部署、独立伸缩" },
        { obj:"车型各不相同", theory:"技术异构", detail:"每辆车用各自合适的技术栈" },
        { obj:"车对讲机", theory:"轻量级通信", detail:"REST/MQ——只装对讲机不装拖车绳" },
        { obj:"一辆抛锚不堵路", theory:"故障隔离", detail:"单服务故障不拖垮全局" },
        { obj:"各自独立油箱", theory:"去中心化数据治理", detail:"每服务独立数据库，不共用油箱" },
        { obj:"车库铭牌", theory:"项目映射", detail:"15个服务=业务6+Agent5+基础设施4；与单块对比：优点=独立演进/弹性/容错，代价=分布式复杂性/事务/运维成本" }
      ],
      mnemonic:"自治异构轻通信，隔离油箱各自存" },
    garden: { name:"花园", tag:"架构评估 · 已隔≈7年", c:"#a855f7", box:[220,30,180,150],
      items:[
        { obj:"巡逻园丁", theory:"SAAM 场景分析法", detail:"最早、轻量、五步：场景开发→架构描述→场景分类→交互→总体评估；以可修改性为主" },
        { obj:"放大镜园丁", theory:"ATAM 架构权衡分析法", detail:"九步、效用树排序；识别敏感点/权衡点/风险；揭示性能/可用性/安全/可修改性的相互制约" },
        { obj:"算账园丁", theory:"CBAM 成本效益分析法", detail:"在ATAM之上做经济分析：效用-响应曲线、投资回报、给架构策略排序" },
        { obj:"花园项目展板", theory:"ATAM实践素材", detail:"36个场景按重要性/难度进效用树；敏感点=连接池/超时阈值/缓存时长；权衡点=熔断阈值/缓存一致性/置信度80%；11项风险→多供应商路由改造，12月故障10秒切换验证" }
      ],
      mnemonic:"巡场景（SAAM）、镜权衡（ATAM）、账排序（CBAM）" }
  }
};

let mpTourTimer = null, mpTourIdx = -1;
function mpStopTour() { if (mpTourTimer) { clearInterval(mpTourTimer); mpTourTimer = null; } }

function mpCenter(id) {
  var b = MP.rooms[id].box;
  return [b[0] + b[2] / 2, b[1] + b[3] / 2];
}
function mpGapColor(v) { return v >= 8 ? "#dc2626" : "#f97316"; }

async function renderMemoryPalace(c) {
  mpStopTour();
  var roomSvg = "";
  Object.keys(MP.rooms).forEach(function(id) {
    var r = MP.rooms[id], b = r.box, cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
    var gap = (r.tag.match(/已隔≈([\d.]+)年/) || [])[1];
    var badge = "";
    if (gap) {
      badge = '<rect x="' + (b[0] + b[2] - 58) + '" y="' + (b[1] + 7) + '" width="50" height="17" rx="8" fill="' + mpGapColor(parseFloat(gap)) + '"/>' +
        '<text x="' + (b[0] + b[2] - 33) + '" y="' + (b[1] + 19) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">≈' + gap + '年</text>';
    }
    roomSvg += '<g id="mp-room-' + id + '" class="mp-room" onclick="mpSelect(\'' + id + '\')">' +
      '<rect class="room" x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="12" fill="' + r.c + '" fill-opacity="0.13" stroke="' + r.c + '" stroke-width="1.5"/>' +
      '<text x="' + cx + '" y="' + (cy - 20) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + r.c + '">' + r.name + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle" font-size="10" fill="#94a3b8">' + r.tag.split(" · ")[0] + '</text>' +
      badge +
    '</g>';
  });

  /* S 形动线：9 段路径 + 编号路标 */
  var route = '<defs>' +
    '<marker id="mp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#cbd5e1"/></marker>' +
    '<marker id="mp-arrow-walk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#64748b"/></marker>' +
    '</defs>';
  var waypoints = "";
  for (var i = 0; i < MP.tour.length; i++) {
    var rid = MP.tour[i], rr = MP.rooms[rid], pc = mpCenter(rid);
    if (i < MP.tour.length - 1) {
      var nc = mpCenter(MP.tour[i + 1]);
      var dx = nc[0] - pc[0], dy = nc[1] - pc[1], len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len, uy = dy / len, pad = 17;
      route += '<line id="mp-seg-' + i + '" x1="' + (pc[0] + ux * pad) + '" y1="' + (pc[1] + uy * pad) + '" x2="' + (nc[0] - ux * pad) + '" y2="' + (nc[1] - uy * pad) + '" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="7 5" opacity="0.55" marker-end="url(#mp-arrow)"/>';
    }
    waypoints += '<g id="mp-wp-' + rid + '" style="cursor:pointer" onclick="mpSelect(\'' + rid + '\')">' +
      '<circle cx="' + pc[0] + '" cy="' + pc[1] + '" r="13" fill="' + rr.c + '" stroke="#fff" stroke-width="2"/>' +
      '<text x="' + pc[0] + '" y="' + (pc[1] + 4.5) + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">' + (i + 1) + '</text>' +
    '</g>';
  }
  var legend = '<g>' +
    '<rect x="420" y="30" width="330" height="150" rx="12" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>' +
    '<text x="440" y="54" font-size="12.5" font-weight="700" fill="#475569">图例 · S 形走位顺序</text>' +
    '<line x1="440" y1="74" x2="470" y2="74" stroke="#64748b" stroke-width="2.5"/><text x="478" y="78" font-size="10.5" fill="#64748b">实线 = 已走过 · 虚线 = 还没走</text>' +
    '<circle cx="447" cy="97" r="7.5" fill="#94a3b8" stroke="#fff" stroke-width="1.5"/><text x="462" y="101" font-size="10.5" fill="#64748b">圆点数字 = 巡游站序（1 进宫 · 10 出宫）</text>' +
    '<rect x="438" y="114" width="38" height="15" rx="7" fill="#dc2626"/><text x="457" y="125" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">≈10年</text><text x="484" y="126" font-size="10.5" fill="#64748b">回归徽章：红≥8年 · 橙≥5年（越红越优先背）</text>' +
    '<text x="440" y="150" font-size="10.5" fill="#94a3b8">走位：玄关→客厅→餐厅→厨房→浴室→书房</text>' +
    '<text x="440" y="167" font-size="10.5" fill="#94a3b8">　　　→卧室→阳台→车库→花园（S 形不交叉）</text>' +
  '</g>';

  var stationChips = "";
  MP.tour.forEach(function(id, i) {
    var r = MP.rooms[id];
    stationChips += '<span id="mp-chip-' + id + '" onclick="mpSelect(\'' + id + '\')" style="cursor:pointer;padding:4px 12px;border-radius:14px;border:1px solid var(--border-2);background:var(--bg-surface-high);font-size:12.5px;color:var(--text-1)">' + (i + 1) + '. ' + r.name + '<span style="color:#94a3b8;font-size:11px"> ' + r.tag.split(" · ")[0] + '</span></span>';
  });

  c.innerHTML = '<style>' +
    '.mp-room{cursor:pointer}' +
    '.mp-room rect.room{transition:fill-opacity .25s,stroke-width .25s}' +
    '.mp-room:hover rect.room{fill-opacity:.24}' +
    '.mp-room.active rect.room{fill-opacity:.34;stroke-width:2.5}' +
    '.mp-room text{transition:font-weight .1s}' +
    '#mp-floor line,#mp-floor circle{transition:stroke .3s,opacity .3s}' +
    '</style>' +
    '<div class="page-title">记忆宫殿 · 论文知识点的空间记忆</div>' +
    '<div class="page-subtitle">参考思维宫殿法（Method of Loci）：把 8 张理论卡 + 万能项目 + 考场策略放进一套 10 站的住宅动线，每件物品锚定一个采分点——考前闭眼走一遍，考场上按题"回房间取物"</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px">' +
      '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px;font-weight:600">10 站 · 38 件记忆锚点</span>' +
      '<span style="padding:6px 14px;border-radius:20px;background:#fef3c7;color:#92400e;font-size:13px">动线即考场流程：进门定策略 → 客厅取项目 → 按题进房取理论 → 玄关对口径</span>' +
    '</div>' +
    '<div class="stack" style="margin-top:14px">' +
    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">宫殿平面图 · S 形巡游动线</div>' +
      '<button id="mp-tour-btn" onclick="mpStartTour()" style="padding:6px 16px;border-radius:8px;border:1px solid var(--primary-6);background:var(--primary-6);color:#fff;cursor:pointer;font-weight:600;font-size:13px">▶ 开始巡游</button></div>' +
      '<div class="content-card-body" style="display:flex;gap:18px;flex-wrap:wrap">' +
        '<div style="flex:1.35;min-width:560px"><svg id="mp-floor" viewBox="0 0 780 540" style="width:100%">' +
          route + legend + roomSvg + waypoints +
        '</svg></div>' +
        '<div id="mp-detail" style="flex:1;min-width:340px"></div>' +
      '</div></div>' +
    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">十站站点（按巡游顺序，点任一站直达）</div></div>' +
      '<div class="content-card-body" style="display:flex;gap:8px;flex-wrap:wrap">' + stationChips + '</div></div>' +
    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">考场取用方法（三步）</div></div><div class="content-card-body" style="font-size:13.5px;line-height:2">' +
      '<b>① 考前一周：</b>每天闭眼走完全程一遍（2 分钟），重点房间（厨房/书房/卧室/花园=回归窗口最大的四站）各停留默写口诀；' +
      '<b>② 考场审题时：</b>读完题干第 2 问，判断它住哪个房间——"有哪些分类"进书房/卧室，"核心组成+协同"进阳台/餐厅，"权衡/评估"进花园；' +
      '<b>③ 交卷前 8 分钟：</b>回到玄关看挂钟——全文搜一遍数字口径（50亿/28人/15服务）与专有名词（风险预警Agent）是否前后一致。</div></div>' +
    '</div>';
  mpSelect("foyer");
}

function mpSelect(id) {
  var r = MP.rooms[id]; if (!r) return;
  var idx = MP.tour.indexOf(id);
  Object.keys(MP.rooms).forEach(function(k) {
    var el = document.getElementById("mp-room-" + k);
    if (el) el.classList.toggle("active", k === id);
    var chip = document.getElementById("mp-chip-" + k);
    if (chip) { chip.style.background = k === id ? r.c : "var(--bg-surface-high)"; chip.style.color = k === id ? "#fff" : "var(--text-1)"; chip.style.borderColor = k === id ? r.c : "var(--border-2)"; }
    var wp = document.getElementById("mp-wp-" + k);
    if (wp) { wp.firstChild.setAttribute("stroke", k === id ? "#1e293b" : "#fff"); wp.firstChild.setAttribute("stroke-width", k === id ? "3" : "2"); }
  });
  for (var i = 0; i < MP.tour.length - 1; i++) {
    var seg = document.getElementById("mp-seg-" + i);
    if (seg) {
      var walked = i < idx;
      seg.setAttribute("stroke", walked ? "#64748b" : "#cbd5e1");
      seg.setAttribute("stroke-dasharray", walked ? "none" : "7 5");
      seg.setAttribute("opacity", walked ? "0.9" : "0.55");
      seg.setAttribute("marker-end", walked ? "url(#mp-arrow-walk)" : "url(#mp-arrow)");
    }
  }
  var html = '<div style="border:2px solid ' + r.c + ';border-radius:12px;padding:14px 16px;background:var(--bg-card);height:100%">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">' +
      '<span style="font-size:19px;font-weight:800;color:' + r.c + '">第' + (idx + 1) + '站 · ' + r.name + '</span>' +
      '<span style="padding:2px 10px;border-radius:10px;font-size:11.5px;color:#fff;background:' + r.c + '">' + r.tag + '</span>' +
    '</div>' +
    '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">口诀：<b style="color:var(--text-1)">' + r.mnemonic + '</b></div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">';
  r.items.forEach(function(it) {
    html += '<div style="border-left:3px solid ' + r.c + ';padding:2px 0 2px 10px">' +
      '<div style="font-size:13.5px;font-weight:700;color:var(--text-1)">' + it.obj + ' <span style="font-weight:400;color:' + r.c + '">→ ' + it.theory + '</span></div>' +
      '<div style="font-size:12.5px;line-height:1.8;color:var(--text-2);margin-top:2px">' + it.detail + '</div></div>';
  });
  html += '</div></div>';
  document.getElementById("mp-detail").innerHTML = html;
}

function mpStartTour() {
  mpStopTour(); mpTourIdx = -1;
  var btn = document.getElementById("mp-tour-btn");
  btn.textContent = "■ 停止巡游"; btn.onclick = mpStopTourBtn;
  mpTourTimer = setInterval(function() {
    mpTourIdx++;
    if (mpTourIdx >= MP.tour.length) { mpStopTourBtn(); mpSelect("foyer"); return; }
    mpSelect(MP.tour[mpTourIdx]);
  }, 3500);
  mpSelect(MP.tour[0]); mpTourIdx = 0;
}
function mpStopTourBtn() {
  mpStopTour();
  var btn = document.getElementById("mp-tour-btn");
  if (btn) { btn.textContent = "▶ 开始巡游"; btn.onclick = mpStartTour; }
}
/* ============================================================
   综合备考 (#mcq-insight) —— 综合知识 75 题考频/预算/框架卡
   数据来源：11-mcq-analysis.md（kp 父级聚合，合计校验通过）
   ============================================================ */
const MQ = {
  /* [域, 全期每卷, 机考后每卷, 档位1/2/3] */
  domains: [
    ["系统架构设计",12.3,19.8,1],
    ["系统分析与设计",4.7,6.0,1],
    ["软件工程",6.1,5.0,1],
    ["操作系统",4.6,4.8,1],
    ["软件测试",2.7,4.6,1],
    ["信息安全",2.3,4.0,1],
    ["数据库系统",3.1,4.0,1],
    ["计算机网络",3.4,3.6,2],
    ["法律法规与标准化",2.7,2.8,2],
    ["数学与经济管理",1.7,2.4,2],
    ["企业信息化战略",2.3,2.4,2],
    ["系统可靠性",0.7,1.8,2],
    ["项目管理",1.8,1.4,2],
    ["专业英语",0.75,0.8,3],
    ["计算机组成原理",1.4,1.2,3],
    ["系统运行与维护",0.9,0.2,3]
  ],
  /* 叶子考点 Top20（全期题数） */
  leaves: [
    ["软件架构风格",45,"架构"],["软件质量属性",31,"架构"],["软件架构评估",29,"架构"],
    ["基于构件的软件工程",27,"软工"],["开发模型",26,"软工"],["关系数据库",23,"库"],
    ["进程管理",22,"OS"],["嵌入式系统",19,"组成"],["产权归属",19,"法规"],["设计模式",17,"软工"],
    ["基于架构的软件开发",16,"架构"],["信息安全基础知识",16,"安全"],["结构化分析",16,"分析"],
    ["特定领域软件架构",15,"架构"],["规划设计",13,"软工"],["文件系统",12,"OS"],
    ["配置管理",11,"软工"],["应用数学",11,"数学"],["专业英语",11,"英语"],["进度管理",10,"项目"]
  ],
  tierColor: { 1:"#2563eb", 2:"#f59e0b", 3:"#94a3b8" },
  leafDomainColor: { "架构":"#2563eb","软工":"#6366f1","分析":"#22c55e","OS":"#10b981","库":"#0ea5e9","安全":"#14b8a6","法规":"#f97316","数学":"#f59e0b","英语":"#cbd5e1","项目":"#a855f7","组成":"#94a3b8" }
};

let mqCharts = [];
function mqDispose() { mqCharts.forEach(function(ch){ try { ch.dispose(); } catch(e){} }); mqCharts = []; }

async function renderMcqInsight(c) {
  mqDispose();
  var sorted = MQ.domains.slice().sort(function(a,b){ return b[2]-a[2]; });

  /* 75 题预算：[标签, 题量, 目标得分, 颜色] */
  var budget = [
    ["第一档 7 域",48.2,40,"#2563eb"],
    ["第二档 6 域",14.4,6.5,"#f59e0b"],
    ["明确放弃",2.2,0,"#94a3b8"],
    ["未覆盖+长尾",10.2,0,"#e2e8f0"]
  ];

  var html = '<style>' +
    '.mq-card summary{cursor:pointer;font-weight:700;font-size:13.5px;color:var(--primary-6)}' +
    '.mq-card{border:1px solid var(--border-2);border-radius:10px;padding:10px 14px;background:var(--bg-card)}' +
    '.mq-table{width:100%;border-collapse:collapse;font-size:12px;margin:8px 0}' +
    '.mq-table th,.mq-table td{border:1px solid var(--border-2);padding:4px 8px;text-align:left;line-height:1.6}' +
    '.mq-table th{background:var(--bg-surface-high);font-weight:600}' +
    '</style>' +
    '<div class="page-title">综合备考 · 75 题考频与得分策略</div>' +
    '<div class="page-subtitle">基于 16 卷 819 道综合知识真题（kp 父级聚合，合计校验通过）——考什么、拿多少、放弃什么、剩 24 天怎么执行</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 4px">' +
      '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px;font-weight:600">75 题 × 1 分 · 150 分钟 · 45 及格</span>' +
      '<span style="padding:6px 14px;border-radius:20px;background:#dbeafe;color:#1e40af;font-size:13px;font-weight:600">机考后架构占比 30.6%（每卷 19.8 题）</span>' +
      '<span style="padding:6px 14px;border-radius:20px;background:#dcfce7;color:#166534;font-size:13px;font-weight:600">得分模型 40 + 6.5 ≈ 46.5 过线</span>' +
      '<span style="padding:6px 14px;border-radius:20px;background:var(--bg-surface-high);font-size:13px">目标：2026.10.24/25</span>' +
    '</div>' +
    '<div class="stack" style="margin-top:14px">' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">16 域考频对比：全期 vs 机考后（每卷题数）</div><span class="text-muted" style="font-size:12px">蓝=第一档必拿 · 橙=第二档套路 · 灰=战略放弃</span></div>' +
      '<div class="content-card-body"><div id="mq-domains" style="width:100%;height:540px"></div></div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">75 题预算与得分模型</div><span class="text-muted" style="font-size:12px">上条=题量构成 · 下条=目标得分 · 红线=45 及格线</span></div>' +
      '<div class="content-card-body"><div id="mq-budget" style="width:100%;height:200px"></div>' +
      '<div style="margin-top:6px;font-size:13px;color:var(--text-2)">第一档 48.2 题拿 40（83%）+ 第二档 14.4 题拿 6.5（45%）≈ <b style="color:#166534">46.5 分过线</b>；架构每多稳 1 题 +1 分——<b style="color:var(--text-1)">一切增量投架构</b>。未覆盖 10.2 题是爬虫缺口+长尾冷门，本就不在计划内。</div></div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">叶子考点 Top 20（全期题数）</div><span class="text-muted" style="font-size:12px">颜色=所属域 · 架构五件套合计 136 题=全卷 16.6%</span></div>' +
      '<div class="content-card-body"><div id="mq-leaves" style="width:100%;height:520px"></div></div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">第一档 · 六大框架卡（≈48 题/卷，目标拿 40）</div><span class="text-muted">点击展开 · 与论文宫殿/背诵卡同源</span></div>' +
      '<div class="content-card-body" style="display:flex;flex-direction:column;gap:10px">';
  MQ_CARD.forEach(function(cd, i) {
    html += '<details class="mq-card"><summary>' + (i+1) + '. ' + cd.t + ' <span style="font-size:11.5px;color:#92400e;background:#fef3c7;padding:1px 8px;border-radius:8px">' + cd.tag + '</span></summary>' +
      '<div style="font-size:12.5px;line-height:1.8;margin-top:8px;color:var(--text-1)">' + cd.body + '</div></details>';
  });
  html += '</div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">第二档 · 六张套路卡（14.4 题，拿 6~7）</div></div>' +
      '<div class="content-card-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">';
  MQ_TACTIC.forEach(function(tc) {
    html += '<div style="border:1px solid var(--border-2);border-radius:10px;padding:10px 14px;background:var(--bg-card)">' +
      '<div style="font-weight:700;font-size:13px;color:var(--text-1)">' + tc.t + ' <span style="font-size:11px;color:#92400e;background:#fef3c7;padding:1px 8px;border-radius:8px">' + tc.tag + '</span></div>' +
      '<div style="font-size:12.5px;line-height:1.8;color:var(--text-2);margin-top:4px">' + tc.body + '</div></div>';
  });
  html += '</div></div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">速记总表（考前最后一遍 · 遮住右侧自测）</div><span class="text-muted" style="font-size:12px">关键词→一句话本质 · 竖线分隔</span></div>' +
      '<div class="content-card-body">';
  MQ_MEMO.forEach(function(m) {
    html += '<div style="border:1px solid var(--border-2);border-radius:10px;padding:8px 12px;background:var(--bg-surface-low);margin-bottom:8px">' +
      '<span style="display:inline-block;padding:1px 8px;border-radius:8px;background:#fff7ed;color:#c2410c;font-weight:700;font-size:11.5px;margin-right:8px">' + m[0] + '</span>' +
      '<span style="font-size:12.5px;line-height:2;color:var(--text-1)">' + m[1] + '</span></div>';
  });
  html += '</div></div>' +

    '<div class="grid-2">' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">第三档 · 战略放弃（让出 ≈2.2 分，不许回头补）</div></div>' +
        '<div class="content-card-body" style="font-size:13px;line-height:2">' +
          '<span style="color:#dc2626;font-weight:700">✕ 专业英语</span>（0.8 题/卷）语感题无法突击，考场全选同一字母<br>' +
          '<span style="color:#dc2626;font-weight:700">✕ 组成原理大部</span>（1.2 题/卷）机考后腰斩；只保留嵌入式（叶子 19 题：看门狗/JTAG/交叉开发）<br>' +
          '<span style="color:#dc2626;font-weight:700">✕ 系统运行与维护</span>（0.2 题/卷）机考后几乎消失<br>' +
          '<span style="color:#94a3b8">长尾冷门（Top20 之外数百节点，绝大多数 ≤2 次考频）——每年 3~5 分防不住，不防</span></div></div>' +
      '<div class="content-card"><div class="content-card-header"><div class="content-card-title">Study Hub 工具联动</div></div>' +
        '<div class="content-card-body" style="font-size:13px;line-height:2">' +
          '<b>刷题战斗</b>：按域配比抽题——架构 40% / 软工+分析 20% / OS+库+安全+测试 28% / 第二档 12%，每日 30 题<br>' +
          '<b>错题本</b>：错题按框架卡归类，回炉时按卡复习<br>' +
          '<b>记忆宫殿</b>：架构理论题错了 → 回对应房间（风格=卧室、评估=花园）<br>' +
          '<b>全真模拟</b>：最后两周整卷计时，练单题 ≤2 分钟<br>' +
          '<b>论文备考页</b>：架构理论回归窗口 = 综合同考点高频依据</div></div>' +
    '</div>' +

    '<div class="content-card"><div class="content-card-header"><div class="content-card-title">24 天冲刺计划（9.30 → 10.24/25，三科并行）</div><span class="text-muted">验收线：P1 末架构 ≥85% · P2 末四域 ≥75% · P3 末模拟 ≥50</span></div>' +
      '<div class="content-card-body" style="overflow-x:auto"><table class="mq-table" style="font-size:12.5px;min-width:640px">' +
        '<tr><th>阶段</th><th>日期</th><th>综合知识（每日45分钟）</th><th>论文（每日60分钟）</th><th>案例（每日45分钟）</th></tr>' +
        '<tr><td><b>P1</b></td><td>10.1–10.7</td><td>卡1 架构五件套 + 架构域刷题每日 30 题</td><td>v3 微服务范文骨架默写 3 遍</td><td>UML/质量属性小问专题</td></tr>' +
        '<tr><td><b>P2</b></td><td>10.8–10.14</td><td>卡2~卡6 + 四域刷题</td><td>05/07 两篇范文精读改写</td><td>历年案例真题每日一题</td></tr>' +
        '<tr><td><b>P3</b></td><td>10.15–10.21</td><td>第二档套路卡 + 错题回炉</td><td>全真模拟限时 1 篇</td><td>全真模拟 1 套</td></tr>' +
        '<tr><td><b>P4</b></td><td>10.22–10.23</td><td>只看错题本+套路卡</td><td>只看背诵卡+宫殿巡游</td><td>只看错题</td></tr>' +
        '<tr><td style="color:#dc2626;font-weight:700">考试</td><td colspan="4"><b>10.24/25 · 三科按准考证安排 · 放弃区从 Day1 就不碰</b></td></tr>' +
      '</table></div></div>' +

    '</div>';

  c.innerHTML = html;
  if (!window.echarts) return;

  /* 图1：域考频对比 */
  var dAll = [], dMech = [];
  sorted.forEach(function(d) {
    dAll.push({ value: d[1], itemStyle:{ color:"#cbd5e1" } });
    dMech.push({ value: d[2], itemStyle:{ color: MQ.tierColor[d[3]] }, trend: d[2]>d[1]*1.15?"↑":(d[2]<d[1]*0.85?"↓":"→"), all: d[1] });
  });
  var dm = echarts.init(document.getElementById("mq-domains"));
  dm.setOption({
    tooltip: { trigger:"axis", axisPointer:{ type:"shadow" }, formatter: function(ps) {
      var m = ps.filter(function(p){ return p.data && p.data.all !== undefined; })[0] || ps[0];
      return "<b>" + m.name + "</b><br>全期每卷 " + m.data.all + " 题<br>机考后每卷 " + m.data.value + " 题 " + (m.data.trend||"");
    } },
    legend: { data:["全期每卷","机考后每卷"], top:0, textStyle:{ fontSize:11, color:"#475569" } },
    grid: { left:8, right:52, top:28, bottom:8, containLabel:true },
    xAxis: { type:"value", axisLabel:{ fontSize:10, color:"#94a3b8" }, splitLine:{ lineStyle:{ color:"#f1f5f9" } } },
    yAxis: { type:"category", data: sorted.map(function(d){ return d[0]; }), inverse:true, axisLabel:{ fontSize:11.5, color:"#475569" }, axisTick:{show:false}, axisLine:{lineStyle:{color:"#e2e8f0"}} },
    series: [
      { name:"全期每卷", type:"bar", barWidth:9, data:dAll, itemStyle:{ borderRadius:[0,4,4,0] } },
      { name:"机考后每卷", type:"bar", barWidth:13, data:dMech, itemStyle:{ borderRadius:[0,4,4,0] },
        label:{ show:true, position:"right", fontSize:10.5, color:"#64748b", formatter:function(p){ return p.value.toFixed(1); } } }
    ]
  });
  mqCharts.push(dm);

  /* 图2：预算与得分模型 */
  var bg = echarts.init(document.getElementById("mq-budget"));
  var bSeries = budget.map(function(b, i) {
    return { name:b[0], type:"bar", stack:"tot", barWidth:34,
      data:[ b[1], b[2] ],
      itemStyle:{ color:b[3] },
      label:{ show:true, position:"inside", fontSize:10.5, color: i<3?"#fff":"#64748b", formatter:function(p){ return p.value>0?p.value:""; } } };
  });
  bSeries[0].markLine = { silent:true, symbol:"none",
    lineStyle:{ color:"#dc2626", width:2 },
    label:{ show:true, formatter:"45 及格线", position:"insideEndTop", fontSize:10.5, color:"#dc2626", fontWeight:700 },
    data:[{ xAxis:45 }] };
  bg.setOption({
    tooltip: { trigger:"axis", axisPointer:{ type:"shadow" }, formatter:function(ps){ return ps.filter(function(p){return p.value>0;}).map(function(p){return p.seriesName+"："+p.value;}).join("<br>"); } },
    legend: { top:0, textStyle:{ fontSize:10.5, color:"#475569" } },
    grid: { left:8, right:24, top:30, bottom:8, containLabel:true },
    xAxis: { type:"value", max:75, axisLabel:{ fontSize:10, color:"#94a3b8" }, splitLine:{ lineStyle:{ color:"#f1f5f9" } } },
    yAxis: { type:"category", data:["题量构成","目标得分"], axisLabel:{ fontSize:12, color:"#475569" }, axisTick:{show:false}, axisLine:{show:false} },
    series: bSeries
  });
  mqCharts.push(bg);

  /* 图3：叶子 Top20 */
  var lv = MQ.leaves.slice().reverse();
  var lf = echarts.init(document.getElementById("mq-leaves"));
  lf.setOption({
    tooltip: { formatter:function(p){ return "<b>"+p.name+"</b>：全期 "+p.value+" 题"; } },
    grid: { left:8, right:46, top:8, bottom:8, containLabel:true },
    xAxis: { type:"value", axisLabel:{ fontSize:10, color:"#94a3b8" }, splitLine:{ lineStyle:{ color:"#f1f5f9" } } },
    yAxis: { type:"category", data: lv.map(function(l){ return l[0]; }), axisLabel:{ fontSize:11, color:"#475569" }, axisTick:{show:false}, axisLine:{lineStyle:{color:"#e2e8f0"}} },
    series: [{ type:"bar", barWidth:13,
      data: lv.map(function(l){ return { value:l[1], itemStyle:{ color: MQ.leafDomainColor[l[2]] || "#94a3b8", borderRadius:[0,4,4,0] } }; }),
      label:{ show:true, position:"right", fontSize:10.5, color:"#64748b" } }]
  });
  mqCharts.push(lf);

  window.addEventListener("resize", function(){ mqCharts.forEach(function(ch){ try{ch.resize();}catch(e){} }); });
}

/* 框架卡内容 */
const MQ_CARD = [
  { t:"架构五件套 ★★★", tag:"19.8 题/卷", body:
    '<b>① 架构风格判断</b>（叶子 45，全场第一）<table class="mq-table"><tr><th>风格</th><th>题眼/典型系统</th></tr>' +
    '<tr><td>管道-过滤器</td><td>编译器、流处理（数据流单向）</td></tr><tr><td>分层</td><td>OSI、三层架构（层间单向调用）</td></tr>' +
    '<tr><td>事件驱动/隐式调用</td><td>IDE 插件、消息总线（注册-回调）</td></tr><tr><td>微内核</td><td>OS 内核、浏览器、Eclipse（核心+插件）</td></tr>' +
    '<tr><td>仓库/黑板</td><td>语音识别、专家系统（中央数据+多知识源）</td></tr><tr><td>解释器</td><td>规则引擎、脚本（自定义语言）</td></tr>' +
    '<tr><td>MVC</td><td>Web 框架；SOA/微服务=企业集成；云原生=新趋势</td></tr></table>' +
    '<b>② 质量属性</b>（叶子 31）：场景六元组（刺激源/刺激/环境/制品/响应/<b>响应度量</b>常被挖空）；性能=缓存/负载均衡，可用性=心跳/冗余，安全=认证/审计/入侵检测，可修改性=信息隐藏/接口分离<br>' +
    '<b>③ 架构评估</b>（叶子 29）：SAAM 场景五步 / ATAM 权衡九步效用树 / CBAM 成本效益；<b>敏感点=单属性关键决策，权衡点=多属性冲突</b><br>' +
    '<b>④ 设计模式 5/7/11</b>（叶子 17）：创建型 5 = 工厂方法/抽象工厂/单例/建造者/原型；结构型 7 = 适配器/桥接/组合/装饰/外观/享元/代理；行为型 11 = 策略/观察者/命令/模板方法/迭代器/状态/职责链/中介者/备忘录/访问者/解释器<br>' +
    '<b>⑤ 4+1 视图</b>：逻辑、开发、进程、物理 + 场景（贯穿全部视图）；构件 27 = 独立部署+第三方组装+接口契约；DSSA = 特定领域参考架构（领域分析→参考需求→参考架构）' },
  { t:"软件工程+分析与设计", tag:"11.0 题/卷", body:
    '<b>开发模型对号</b>（叶子 26）：瀑布=需求明确；V=测试对应；原型=需求模糊；螺旋=风险驱动大型项目；增量=分期交付；RUP=四阶段九工作流迭代<br>' +
    '<b>结构化分析</b>（16）：DFD 父图子图平衡、数据字典、加工规格<br>' +
    '<b>OO/UML</b>：用例图属静态视图；泛化 is-a / 聚合 has-a / 组合整体消亡 / 依赖虚线<br>' +
    '<b>构件</b>（叶子 27）：独立部署+第三方组装+接口契约；中间件分类<br>' +
    '<b>耦合内聚排序（高频）</b>：内聚高→低 = 功能/顺序/通信/过程/时间/逻辑/偶然；耦合低→高 = 数据/标记/控制/公共/内容——目标"高内聚低耦合"<br>' +
    '<b>敏捷</b>：Scrum 三角色（产品负责人/Scrum Master/开发团队）+ 冲刺/每日站会/评审回顾；XP = 结对编程/TDD/持续集成/重构' },
  { t:"操作系统", tag:"4.8 题/卷", body:
    '<b>进程管理</b>（叶子 22）：PV 操作信号量初值=资源数；前趋图每边一个信号量；死锁四条件（互斥/占有等待/不可剥夺/循环等待），<b>不死锁最少资源=Σ(nᵢ−1)+1</b>；高响应比=(等待+服务)/服务<br>' +
    '<b>存储</b>：页式地址=页号→块号+页内偏移；LRU 最近最久未用；快表加速<br>' +
    '<b>文件</b>（叶子 12）：索引寻址范围=直接+一级+二级；位示图=字号×字长+位号' },
  { t:"软件测试", tag:"4.6 题/卷（机考后+70%）", body:
    '覆盖强度：<b>语句<判定<条件<判定/条件<条件组合<路径</b><br>' +
    'McCabe：V(G)=边−节点+2=判定节点+1=区域数<br>' +
    '黑盒：等价类/边界值/因果图/错误推测；V 模型（验收↔需求）、W 模型双 V 全程；集成：自顶/自底/三明治<br>' +
    '静态测试=不运行程序（走查/评审/静态分析）；测试发现错误、调试定位修复——两者不同' },
  { t:"信息安全", tag:"4.0 题/卷（上升）", body:
    '<table class="mq-table"><tr><th>体系</th><th>算法</th><th>特征</th></tr>' +
    '<tr><td>对称</td><td>DES/AES/SM1/RC4</td><td>快、密钥分发难</td></tr><tr><td>非对称</td><td>RSA/ECC/SM2</td><td>慢、密钥交换</td></tr><tr><td>摘要</td><td>MD5/SHA/SM3</td><td>完整性</td></tr></table>' +
    '<b>签名=私钥加密摘要，验证=公钥解密比对</b>（方向判断必考）；混合体制=对称传数据+非对称传密钥<br>' +
    '攻击：重放→时间戳/一次性口令；XSS/SQL 注入→输入校验；协议：Kerberos=认证、IPSec=网络层、SSL/TLS=传输层、SET=电子支付<br>' +
    '防火墙：包过滤/状态检测/代理服务；IDS 检测报警 vs IPS 拦截联动；访问控制 DAC 自主/MAC 强制/RBAC 用户-角色-权限' },
  { t:"数据库系统", tag:"4.0 题/卷", body:
    '关系代数：π 投影、σ 选择、⋈ 连接、÷ 除法（"全部/至少"题眼）<br>' +
    'SQL：GROUP BY 后 SELECT 只能含分组列+聚合；HAVING 过组 WHERE 过行<br>' +
    '范式：部分依赖违 2NF、传递依赖违 3NF；分解保无损+保依赖<br>' +
    '并发三问题对号（丢失修改/不可重复读/读脏）；两段锁=可串行化；日志先写+检查点；分布式透明性（分片/复制/位置/全局）分类<br>' +
    '隔离级别四级：读未提交（脏读）→读已提交（不可重复读）→可重复读（幻读）→串行化——逐级消除<br>' +
    'E-R 转关系模式：实体→关系；m:n 联系单独建关系（码=双方码组合）' }
];

const MQ_TACTIC = [
  { t:"计算机网络", tag:"3.6 题/卷", body:'子网五步：掩码→网络位/主机位→块大小 2^h→可用 2^h−2→聚合取公共前缀；协议对号（TCP/UDP=传输、HTTP/DNS=应用）；路由器隔广播域、交换机隔冲突域' },
  { t:"法律法规与标准化", tag:"2.8 题/卷", body:'<b>产权归属 19 题必拿</b>：职务发明归单位；委托开发无约定归受托方；合作开发共有；著作权自动取得；专利三性；商标申请在先' },
  { t:"数学与经济管理", tag:"2.4 题/卷", body:'只背三套路：线性规划→可行域顶点取最优；图论→最小生成树（加边避圈）/最短路；决策→乐观 max-max/悲观 max-min/后悔值/期望值' },
  { t:"系统可靠性", tag:"1.8 题/卷（升）", body:'串联 R=∏Rᵢ；并联 R=1−∏(1−Rᵢ)；N 模表决多数胜；可用性 A=MTTF/(MTTF+MTTR)' },
  { t:"项目管理", tag:"1.4 题/卷", body:'关键路径=最长路径=总时差 0；挣值 SV=EV−PV、CV=EV−AC、SPI=EV/PV、CPI=EV/AC（>1 好）' },
  { t:"企业信息化战略", tag:"2.4 题/卷", body:'概念辨析读题即可：云三模式（IaaS 资源/PaaS 平台/SaaS 软件）、大数据 5V、AI 三要素、区块链去中心化不可篡改' }
];

/* 速记总表：关键词→一句话本质（考前最后一遍） */
const MQ_MEMO = [
  ["架构风格", '<b>管道-过滤器</b>→数据流单向增量 | <b>分层</b>→层间单向调用 | <b>事件驱动</b>→注册回调隐式 | <b>微内核</b>→核心最小+插件 | <b>仓库/黑板</b>→中央数据多知识源 | <b>解释器</b>→自定义文法 | <b>MVC</b>→三分离 | <b>SOA</b>→服务契约松耦合 | <b>微服务</b>→自治去中心 | <b>云原生</b>→弹性可观测自动化'],
  ["设计模式", '<b>工厂方法</b>→子类定创建 | <b>抽象工厂</b>→产品族 | <b>建造者</b>→分步组装 | <b>原型</b>→克隆复制 | <b>单例</b>→唯一实例 | <b>适配器</b>→接口转换兼容 | <b>桥接</b>→两维独立 M+N | <b>组合</b>→部分整体树 | <b>装饰</b>→动态叠职责 | <b>外观</b>→统一入口 | <b>享元</b>→共享细粒度 | <b>代理</b>→控制访问 | <b>模板方法</b>→骨架定子类填 | <b>策略</b>→算法可切换 | <b>命令</b>→请求封装成对象 | <b>观察者</b>→一对多通知 | <b>迭代器</b>→顺序访问藏内部 | <b>职责链</b>→逐级传递 | <b>备忘录</b>→状态快照存取 | <b>状态</b>→状态改行为 | <b>访问者</b>→结构上施操作 | <b>中介者</b>→网状变星型 | <b>解释器</b>→文法解释'],
  ["质量属性", '<b>性能</b>→缓存/并发/负载均衡 | <b>可用性</b>→心跳/冗余/投票 | <b>安全</b>→认证/审计/入侵检测 | <b>可修改性</b>→信息隐藏/接口分离 | <b>易用性</b>→界面分离/向导 | <b>可测试性</b>→断言/内置自测 | <b>六元组</b>→常挖响应度量'],
  ["架构评估", '<b>SAAM</b>→场景五步可修改 | <b>ATAM</b>→权衡九步效用树 | <b>CBAM</b>→成本效益 ROI | <b>敏感点</b>→单属性关键 | <b>权衡点</b>→多属性冲突'],
  ["操作系统", '<b>死锁</b>→四条件缺一不可 | <b>不死锁</b>→Σ(nᵢ−1)+1 | <b>PV</b>→初值=资源数 | <b>LRU</b>→最近最久未用 | <b>快表</b>→TLB 命中加速 | <b>位示图</b>→字号×字长+位号'],
  ["软件测试", '<b>覆盖链</b>→语句<判定<条件<判定/条件<组合<路径 | <b>McCabe</b>→边−点+2=判定+1 | <b>静态</b>→不运行程序 | <b>集成</b>→自顶/自底/三明治'],
  ["信息安全", '<b>对称</b>→快、分发难 | <b>非对称</b>→慢、可交换 | <b>摘要</b>→完整性 | <b>签名</b>→私钥加密摘要 | <b>验证</b>→公钥解比对 | <b>Kerberos</b>→认证 | <b>IPSec</b>→网络层 | <b>SSL/TLS</b>→传输层 | <b>RBAC</b>→用户-角色-权限 | <b>IDS/IPS</b>→报警/拦截'],
  ["数据库", '<b>除法</b>→全部至少 | <b>HAVING</b>→过滤组 | <b>2NF</b>→消部分依赖 | <b>3NF</b>→消传递依赖 | <b>BCNF</b>→主属性对码 | <b>两段锁</b>→可串行化 | <b>隔离级别</b>→逐级消脏读/幻读 | <b>m:n</b>→联系单独建关系'],
  ["第二档套路", '<b>子网</b>→块 2ʰ、可用−2 | <b>产权</b>→职务归单位、委托归受托 | <b>可靠性</b>→串∏、并 1−∏(1−Rᵢ) | <b>可用性A</b>→MTTF/(MTTF+MTTR) | <b>挣值</b>→SPI=EV/PV、CPI=EV/AC | <b>关键路径</b>→总时差 0 | <b>云三模式</b>→IaaS 资源/PaaS 平台/SaaS 软件']
];
