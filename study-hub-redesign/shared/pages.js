
/* ???????????????????????????????????????????????????????????
   pages.js ? Page Renderers for All Modules
   ??????????????????????????????????????????????????????????? */

const $ = (id) => document.getElementById(id);
const content = () => $("app-content");

/* ?? Page Router ?? */
async function renderPage() {
  const c = content();
  c.innerHTML = `<div class="state-loading"><div class="spinner"></div><p>Loading...</p></div>`;
  try {
    switch (state.page) {
      case "dashboard": await renderDashboard(c); break;
      case "quiz":      await renderQuiz(c); break;
      case "memory":    await renderMemory(c); break;
      case "simulation":await renderSimulation(c); break;
      case "diagnosis": await renderDiagnosis(c); break;
      case "data":      await renderData(c); break;
      default:          await renderDashboard(c);
    }
  } catch (e) {
    c.innerHTML = `<div class="state-error"><p>Failed: ${e.message}</p></div>`;
  }
  lucide.createIcons();
}

/* ?? Helpers ?? */
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


/* ???????????????????????????????????????????????????????????
   Dashboard
   ??????????????????????????????????????????????????????????? */
async function renderDashboard(c) {
  const territories = state.territories.length ? state.territories : await loadTerritories();
  const domains = state.domains.length ? state.domains : await loadDomains();
  const conquered = territories.filter(t => t.bossDefeated).length;
  const total = territories.length || 9;

  c.innerHTML = `
    <div class="page-title">?? Adventure Hall</div>
    <div class="page-subtitle">Welcome back! Keep up the good work.</div>
    <div class="stack" style="margin-top:20px">
      <div class="grid-2">
        <div class="content-card">
          <div class="content-card-header">
            <div class="content-card-title">?? Daily Tasks</div>
            <span class="text-muted">Refresh in 6h</span>
          </div>
          <div class="content-card-body" id="daily-tasks"></div>
        </div>
        <div class="content-card">
          <div class="content-card-header">
            <div class="content-card-title">?? Achievement Hall</div>
            <span class="text-muted" id="ach-count">0/8</span>
          </div>
          <div class="content-card-body" id="achievements-list"></div>
        </div>
      </div>
      <div class="content-card">
        <div class="content-card-header"><div class="content-card-title">?? Study Trend</div></div>
        <div class="content-card-body"><canvas id="trend-chart" height="200"></canvas></div>
      </div>
      <div class="content-card">
        <div class="content-card-header">
          <div class="content-card-title">??? Territory Conquest</div>
          <span class="text-muted">${conquered}/${total} conquered</span>
        </div>
        <div class="content-card-body"><div class="grid-9" id="territory-grid"></div></div>
      </div>
    </div>`;

  renderDailyTasks();
  renderAchievements();
  renderTerritories(territories, domains);
  renderTrendChart();
}

function renderDailyTasks() {
  const tasks = [
    { text: "Answer 30 questions", done: false, icon: "??" },
    { text: "Review 10 memory cards", done: false, icon: "??" },
    { text: "Complete 1 simulation", done: false, icon: "??" },
    { text: "Review yesterday's mistakes", done: false, icon: "??" }
  ];
  if (!$("daily-tasks")) return;
  $("daily-tasks").innerHTML = tasks.map(t => `
    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-1)">
      <span>${t.icon} ${t.text}</span>
      <input type="checkbox" ${t.done?"checked":""} style="accent-color:var(--primary-6)">
    </div>`).join("");
}

function renderAchievements() {
  const achievements = [
    { key: "combo_king", name: "Combo King", desc: "20 correct in a row", icon: "?" },
    { key: "boss_slayer", name: "Boss Slayer", desc: "Defeat 3 Bosses", icon: "??" },
    { key: "streak_7", name: "7-Day Streak", desc: "Study 7 days in a row", icon: "??" },
    { key: "conqueror", name: "Conqueror", desc: "Conquer all territories", icon: "??" },
    { key: "speed_demon", name: "Speed Demon", desc: "20 questions in 5 min", icon: "?" },
    { key: "scholar", name: "Scholar", desc: "500 correct answers", icon: "??" },
    { key: "perfectionist", name: "Perfectionist", desc: "Perfect simulation", icon: "??" },
    { key: "collector", name: "Collector", desc: "Master all memory cards", icon: "??" }
  ];
  if (!$("achievements-list")) return;
  $("achievements-list").innerHTML = achievements.map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-1);opacity:0.4">
      <span style="font-size:20px">??</span>
      <div><div style="font-weight:500">${a.name}</div><div class="text-muted">${a.desc}</div></div>
    </div>`).join("");
}

function renderTerritories(territories, domains) {
  const el = $("territory-grid");
  if (!el) return;
  if (!territories.length) { el.innerHTML = `<div class="text-muted">No territory data</div>`; return; }
  el.innerHTML = territories.map((t, i) => {
    const d = domains.find(dd => dd.id === t.domainId) || {};
    const name = d.name || "Domain " + t.domainId;
    let cls = "locked";
    if (t.bossDefeated) cls = "conquered";
    else if (t.questionsAnswered > 0) cls = "in-progress";
    const pct = t.totalQuestions ? Math.round(t.accuracy * 100) : 0;
    return `<div class="territory-item ${cls}" style="cursor:pointer" onclick="navigate(''quiz'')">
      <div class="territory-icon">${t.bossDefeated?"?":(t.questionsAnswered>0?"?":"??")}</div>
      <div class="territory-info">
        <div class="territory-name">${name}</div>
        <div class="territory-progress-text">${t.bossDefeated?"Conquered":(t.questionsAnswered>0?pct+"%":"Fog")} ? ${t.totalQuestions||0}Q</div>
        ${t.questionsAnswered>0&&!t.bossDefeated?`<div class="territory-mini-bar"><div class="territory-mini-fill" style="width:${pct}%;background:${pct>=80?"var(--success-5)":"var(--warning-5)"}"></div></div>`:""}
      </div></div>`;
  }).join("");
}

function renderTrendChart() {
  const canvas = $("trend-chart");
  if (!canvas || typeof Chart === "undefined") return;
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      datasets: [{ label: "Answers", data: [12,25,18,30,22,35,28], backgroundColor: "rgba(22,100,255,0.6)", borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}


/* ???????????????????????????????????????????????????????????
   Quiz Battle
   ??????????????????????????????????????????????????????????? */
let quizState = { mode: "practice", domainId: null, questions: [], currentIdx: 0, answers: [], combo: 0, maxCombo: 0, hp: 100, startTime: 0 };

async function renderQuiz(c) {
  const domains = state.domains.length ? state.domains : await loadDomains();
  const territories = state.territories.length ? state.territories : await loadTerritories();
  const domainOpts = domains.map(d => `<option value="${d.id}">${d.name}</option>`).join("");

  c.innerHTML = `
    <div style="display:grid;grid-template-columns:260px 1fr 260px;gap:20px;min-height:calc(100vh - 160px)">
      <div class="content-card" style="max-height:calc(100vh - 160px);overflow-y:auto">
        <div class="content-card-header"><div class="content-card-title">??? Territories</div></div>
        <div class="content-card-body" id="quiz-territories"></div>
      </div>
      <div class="stack">
        <div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none">
          <div class="content-card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <div>
                <div style="font-size:var(--font-size-h4);font-weight:600" id="quiz-mode-label">Select Mode</div>
                <div style="font-size:var(--font-size-caption);color:var(--hud-text-dim)" id="quiz-progress">--</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;flex:1;max-width:300px">
                <div class="hud-stat-row"><span class="hud-stat-label">HP</span><div class="stat-bar"><div class="stat-bar-fill hp" id="quiz-hp-bar" style="width:100%"></div></div><span id="quiz-hp-text" style="color:var(--hud-text);font-size:12px">100</span></div>
                <div class="hud-stat-row"><span class="hud-stat-label">?</span><div class="stat-bar"><div class="stat-bar-fill exp" id="quiz-combo-bar" style="width:0%"></div></div><span id="quiz-combo-text" style="color:var(--hud-text);font-size:12px">Combo x0</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="content-card" id="quiz-mode-select">
          <div class="content-card-header"><div class="content-card-title">?? Select Battle Mode</div></div>
          <div class="content-card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${["practice","sequence","random","timed","intensive","endless","daily"].map(m => {
                const names = {practice:"Free Practice",sequence:"Sequence",random:"Random",timed:"Timed",intensive:"Intensive",endless:"Endless",daily:"Daily"};
                const descs = {practice:"Pick domain, no pressure",sequence:"Clear one by one",random:"Random draw, test reflexes",timed:"Per-question timer",intensive:"Focus on mistakes",endless:"Infinite grind",daily:"Daily 20 questions"};
                return `<button class="quiz-mode-btn" data-mode="${m}" onclick="startQuiz(''${m}'')" style="padding:12px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-card);cursor:pointer;text-align:left;transition:all .15s">
                  <div style="font-weight:600">${names[m]}</div><div class="text-muted">${descs[m]}</div></button>`;
              }).join("")}
            </div>
            <div style="margin-top:12px;display:flex;gap:10px;align-items:center">
              <label style="font-size:14px;white-space:nowrap">Domain:</label>
              <select id="quiz-domain-select" style="flex:1;padding:8px;border:1px solid var(--border-2);border-radius:6px">${domainOpts}</select>
              <button onclick="startBossBattle()" style="padding:8px 16px;background:linear-gradient(135deg,var(--danger-5),var(--danger-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">?? Boss</button>
            </div>
          </div>
        </div>
        <div class="content-card" id="quiz-question-card" style="display:none">
          <div class="content-card-header">
            <div class="content-card-title" id="quiz-q-num">Q1</div>
            <span class="text-muted" id="quiz-q-source"></span>
          </div>
          <div class="content-card-body">
            <div style="font-size:16px;line-height:1.7;margin-bottom:20px" id="quiz-q-stem"></div>
            <div id="quiz-options" style="display:flex;flex-direction:column;gap:10px"></div>
            <div id="quiz-feedback" style="display:none;margin-top:16px;padding:12px;border-radius:8px"></div>
            <div style="margin-top:16px;display:flex;gap:10px">
              <button id="quiz-next-btn" style="display:none;padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="nextQuestion()">Next ?</button>
              <button id="quiz-finish-btn" style="display:none;padding:10px 24px;background:var(--success-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600" onclick="finishQuiz()">Finish ?</button>
            </div>
          </div>
        </div>
      </div>
      <div class="content-card" style="max-height:calc(100vh - 160px);overflow-y:auto">
        <div class="content-card-header"><div class="content-card-title">?? Answer Sheet</div></div>
        <div class="content-card-body"><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px" id="quiz-sheet-grid"></div></div>
      </div>
    </div>`;
  renderQuizTerritories(territories, domains);
}

function renderQuizTerritories(territories, domains) {
  const el = $("quiz-territories");
  if (!el) return;
  if (!territories.length) { el.innerHTML = `<div class="text-muted">No data</div>`; return; }
  el.innerHTML = territories.map(t => {
    const d = domains.find(dd => dd.id === t.domainId) || {};
    const cls = t.bossDefeated ? "conquered" : (t.questionsAnswered > 0 ? "in-progress" : "locked");
    const pct = t.totalQuestions ? Math.round(t.accuracy * 100) : 0;
    return `<div class="territory-item ${cls}" style="margin-bottom:6px;cursor:pointer" onclick="document.getElementById(''quiz-domain-select'').value=''${t.domainId}''">
      <div class="territory-icon">${t.bossDefeated?"?":(t.questionsAnswered>0?"?":"??")}</div>
      <div class="territory-info">
        <div class="territory-name">${d.name||"Domain "+t.domainId}</div>
        <div class="territory-progress-text">${pct}% ? ${t.totalQuestions||0}Q</div>
        ${t.questionsAnswered>0&&!t.bossDefeated?`<div class="territory-mini-bar"><div class="territory-mini-fill" style="width:${pct}%"></div></div>`:""}
      </div></div>`;
  }).join("");
}

async function startQuiz(mode) {
  quizState.mode = mode;
  quizState.domainId = parseInt($("quiz-domain-select").value) || null;
  quizState.combo = 0; quizState.maxCombo = 0; quizState.hp = 100;
  quizState.currentIdx = 0; quizState.answers = []; quizState.startTime = Date.now();

  try {
    const params = new URLSearchParams();
    if (quizState.domainId) params.set("domainId", quizState.domainId);
    params.set("mode", mode);
    params.set("count", (mode === "timed" || mode === "daily") ? "20" : "30");
    const res = await fetch(API + "/quiz/start?" + params);
    if (res.ok) { const json = await res.json(); quizState.questions = json.data || json; }
    else { quizState.questions = await loadQuestions(quizState.domainId, 30); }
  } catch { quizState.questions = await loadQuestions(quizState.domainId, 30); }

  if (!quizState.questions.length) { alert("No questions in this domain"); return; }

  $("quiz-mode-select").style.display = "none";
  $("quiz-question-card").style.display = "";
  const names = {practice:"Free Practice",sequence:"Sequence",random:"Random",timed:"Timed",intensive:"Intensive",endless:"Endless",daily:"Daily"};
  $("quiz-mode-label").textContent = "?? " + names[mode];
  renderQuizSheet();
  showQuestion();
}

function renderQuizSheet() {
  const grid = $("quiz-sheet-grid");
  if (!grid) return;
  grid.innerHTML = quizState.questions.map((_, i) => `
    <div id="sheet-${i}" style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-2);border-radius:4px;font-size:12px;cursor:pointer;background:var(--bg-card)" onclick="quizState.currentIdx=${i};showQuestion()">${i+1}</div>`).join("");
}

function showQuestion() {
  const i = quizState.currentIdx;
  const q = quizState.questions[i];
  if (!q) return;
  $("quiz-q-num").textContent = "Q" + (i+1) + "/" + quizState.questions.length;
  $("quiz-q-source").textContent = q.source || q.examYear || "";
  $("quiz-q-stem").textContent = q.stem || "";
  $("quiz-progress").textContent = (i+1) + "/" + quizState.questions.length;

  let options = [];
  try { options = typeof q.optionsJson === "string" ? JSON.parse(q.optionsJson) : (q.optionsJson || []); } catch {}
  if (!options.length) options = ["A","B","C","D"];

  $("quiz-options").innerHTML = options.map((opt, oi) => {
    const letter = String.fromCharCode(65 + oi);
    const answered = quizState.answers[i];
    let cls = "";
    if (answered) {
      if (letter === q.answer) cls = "background:#e2f5eb;border-color:#8dd8b3";
      else if (letter === answered) cls = "background:#feeced;border-color:#fa9ea3";
      else cls = "opacity:0.5";
    }
    return `<button class="quiz-option" data-letter="${letter}" style="padding:12px 16px;border:1px solid var(--border-2);border-radius:8px;background:var(--bg-card);cursor:pointer;text-align:left;font-size:14px;transition:all .15s;${cls}" ${answered?"disabled":""} onclick="selectAnswer(${i},''${letter}'')">
      <strong>${letter}.</strong> ${opt}</button>`;
  }).join("");

  $("quiz-feedback").style.display = answered ? "" : "none";
  $("quiz-next-btn").style.display = answered ? "" : "none";
  $("quiz-finish-btn").style.display = (answered && i === quizState.questions.length - 1) ? "" : "none";

  document.querySelectorAll("[id^=''sheet-'']").forEach(el => {
    const si = parseInt(el.id.replace("sheet-",""));
    if (quizState.answers[si]) {
      const correct = quizState.answers[si] === (quizState.questions[si]?.answer || "");
      el.style.background = correct ? "var(--success-1)" : "var(--danger-2)";
      el.style.borderColor = correct ? "var(--success-5)" : "var(--danger-5)";
    }
    el.style.fontWeight = si === i ? "700" : "400";
  });
  updateQuizHUD();
}

function selectAnswer(idx, letter) {
  if (quizState.answers[idx]) return;
  quizState.answers[idx] = letter;
  const q = quizState.questions[idx];
  const correct = letter === q.answer;
  if (correct) { quizState.combo++; if (quizState.combo > quizState.maxCombo) quizState.maxCombo = quizState.combo; }
  else { quizState.combo = 0; quizState.hp = Math.max(0, quizState.hp - 10); }

  $("quiz-feedback").style.display = "";
  $("quiz-feedback").style.background = correct ? "var(--success-1)" : "var(--danger-2)";
  $("quiz-feedback").style.color = correct ? "var(--success-6)" : "var(--danger-6)";
  $("quiz-feedback").innerHTML = correct
    ? `? Correct!` + (q.analysis ? `<br><small>${q.analysis}</small>` : "")
    : `? Wrong! Answer is <strong>${q.answer}</strong>` + (q.analysis ? `<br><small>${q.analysis}</small>` : "");

  $("quiz-next-btn").style.display = "";
  if (idx === quizState.questions.length - 1) { $("quiz-next-btn").style.display = "none"; $("quiz-finish-btn").style.display = ""; }
  showQuestion();
}

function nextQuestion() {
  quizState.currentIdx++;
  if (quizState.currentIdx >= quizState.questions.length) { finishQuiz(); return; }
  $("quiz-feedback").style.display = "none";
  $("quiz-next-btn").style.display = "none";
  $("quiz-finish-btn").style.display = "none";
  showQuestion();
}

function updateQuizHUD() {
  const hpBar = $("quiz-hp-bar"), comboBar = $("quiz-combo-bar"), hpText = $("quiz-hp-text"), comboText = $("quiz-combo-text");
  if (hpBar) hpBar.style.width = quizState.hp + "%";
  if (hpText) hpText.textContent = quizState.hp;
  if (comboBar) comboBar.style.width = Math.min(100, quizState.combo * 5) + "%";
  if (comboText) comboText.textContent = "Combo x" + quizState.combo;
}

async function finishQuiz() {
  const correct = quizState.answers.filter((a, i) => a === quizState.questions[i]?.answer).length;
  const total = quizState.questions.length;
  const accuracy = total ? correct / total : 0;
  const elapsed = Math.round((Date.now() - quizState.startTime) / 1000);

  $("quiz-question-card").innerHTML = `
    <div class="content-card-header"><div class="content-card-title">?? Battle Complete</div></div>
    <div class="content-card-body" style="text-align:center">
      <div style="font-size:48px;font-weight:700;color:${accuracy>=0.6?"var(--success-5)":"var(--danger-5)"}">${Math.round(accuracy*100)}%</div>
      <div style="margin-top:8px">? ${correct} / ${total} correct</div>
      <div>? Max Combo: ${quizState.maxCombo}</div>
      <div>?? Time: ${elapsed}s</div>
      <div style="margin-top:16px">
        <button onclick="navigate(''quiz'')" style="padding:10px 24px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Play Again</button>
        <button onclick="navigate(''dashboard'')" style="padding:10px 24px;background:var(--bg-surface-high);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;margin-left:8px">Back to Hall</button>
      </div>
    </div>`;

  try {
    await apiPost("/game/quiz/result", { correct, total, accuracy, maxCombo: quizState.maxCombo, domainId: quizState.domainId, mode: quizState.mode });
    const gs = await apiGet("/game/state");
    if (gs) { state.hp = gs.hp; state.exp = gs.exp; state.level = gs.level; state.coin = gs.coin; updateHUD(); }
  } catch {}
}

async function startBossBattle() {
  const domainId = parseInt($("quiz-domain-select").value);
  if (!domainId) { alert("Select a domain first"); return; }
  try { await fetch(API + "/game/boss/" + domainId + "/can-battle"); }
  catch { alert("Boss not unlocked yet (need 80% accuracy)"); return; }
  quizState.mode = "boss";
  quizState.domainId = domainId;
  await startQuiz("boss");
}


/* ???????????????????????????????????????????????????????????
   Memory Forge
   ??????????????????????????????????????????????????????????? */
async function renderMemory(c) {
  let cards = [];
  try { cards = await apiGet("/memory/cards"); } catch { cards = []; }

  c.innerHTML = `
    <div class="page-title">?? Memory Forge</div>
    <div class="page-subtitle">Spaced Repetition ? Knowledge Forging</div>
    <div class="stack" style="margin-top:20px">
      <div class="flex-between">
        <div style="display:flex;gap:20px">
          <div><span class="text-muted">Due</span><br><strong style="font-size:20px" id="mem-due">${cards.filter(c=>!c.mastered).length}</strong></div>
          <div><span class="text-muted">Mastered</span><br><strong style="font-size:20px" id="mem-mastered">${cards.filter(c=>c.mastered).length}</strong></div>
        </div>
        <button onclick="addMemoryCard()" style="padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">+ Add Card</button>
      </div>
      <div class="content-card" id="memory-card-display">
        ${cards.length ? `<div class="content-card-body" style="text-align:center;padding:40px">
          <div class="text-muted">Click card to flip</div>
          <div id="memory-flashcard" style="margin:20px auto;width:300px;height:200px;perspective:1000px;cursor:pointer" onclick="flipCard()">
            <div id="memory-card-inner" style="position:relative;width:100%;height:100%;transition:transform .6s;transform-style:preserve-3d">
              <div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:var(--bg-card);border:2px solid var(--border-2);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:20px;font-size:16px;font-weight:600" id="mem-front">${cards[0]?.question || "Loading..."}</div>
              <div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:var(--primary-1);border:2px solid var(--primary-3);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:20px;font-size:14px;transform:rotateY(180deg)" id="mem-back">${cards[0]?.answer || ""}</div>
            </div>
          </div>
          <div id="memory-actions" style="display:flex;gap:10px;justify-content:center;margin-top:16px">
            <button onclick="rateMemory(0)" style="padding:10px 20px;border:1px solid var(--danger-5);border-radius:8px;background:var(--danger-2);color:var(--danger-6);cursor:pointer;font-weight:600">?? Forgot</button>
            <button onclick="rateMemory(1)" style="padding:10px 20px;border:1px solid var(--warning-5);border-radius:8px;background:var(--warning-1);color:var(--warning-6);cursor:pointer;font-weight:600">?? Hard</button>
            <button onclick="rateMemory(2)" style="padding:10px 20px;border:1px solid var(--success-5);border-radius:8px;background:var(--success-1);color:var(--success-6);cursor:pointer;font-weight:600">?? Easy</button>
          </div></div>` : `<div class="content-card-body state-empty"><p>No memory cards yet</p><p class="text-muted">Turn key concepts into cards to forge your memory</p></div>`}
      </div>
    </div>`;
  window._memCards = cards;
  window._memIdx = 0;
}

function flipCard() {
  const inner = $("memory-card-inner");
  if (inner) inner.style.transform = inner.style.transform === "rotateY(180deg)" ? "" : "rotateY(180deg)";
}

function rateMemory(quality) {
  flipCard();
  setTimeout(() => {
    window._memIdx++;
    const cards = window._memCards || [];
    if (window._memIdx >= cards.length) {
      $("memory-card-display").innerHTML = `<div class="content-card-body state-empty" style="padding:40px"><p>?? Review complete!</p><p class="text-muted">Next review scheduled by SM-2 algorithm</p><button onclick="navigate(''memory'')" style="margin-top:12px;padding:8px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:8px;cursor:pointer">Refresh</button></div>`;
      return;
    }
    const c = cards[window._memIdx];
    if (c) { $("mem-front").textContent = c.question || ""; $("mem-back").textContent = c.answer || ""; }
  }, 600);
}

function addMemoryCard() {
  const q = prompt("Front (question):");
  if (!q) return;
  const a = prompt("Back (answer):");
  if (!a) return;
  apiPost("/memory/cards", { question: q, answer: a }).then(() => navigate("memory")).catch(() => alert("Add failed"));
}

/* ???????????????????????????????????????????????????????????
   Simulation
   ??????????????????????????????????????????????????????????? */
async function renderSimulation(c) {
  let sims = [];
  try { sims = await apiGet("/simulations"); } catch {}

  c.innerHTML = `
    <div class="page-title">?? Full Simulation</div>
    <div class="page-subtitle">3-Subject Exam ? Real Timer ? Seasonal Rank</div>
    <div class="stack" style="margin-top:20px">
      <div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none">
        <div class="content-card-body" style="text-align:center;padding:40px">
          <div style="font-size:36px;font-weight:700">S3 Season</div>
          <div style="margin-top:8px;color:var(--hud-text-dim)">Knowledge 75Q ? Case 5Q ? Essay 1</div>
          <div style="margin-top:4px;color:var(--hud-text-dim)">?? 150 min</div>
          <button onclick="startSimulation()" style="margin-top:20px;padding:12px 40px;background:linear-gradient(135deg,var(--success-5),var(--success-6));color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:700">Start Challenge ??</button>
        </div>
      </div>
      <div class="content-card">
        <div class="content-card-header"><div class="content-card-title">?? History</div></div>
        <div class="content-card-body">
          ${sims.length ? sims.slice(0,10).map(s => `
            <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-1)">
              <div><strong>${s.simDate||"--"}</strong> <span class="text-muted">K:${s.knowledgeScore||0} C:${s.caseScore||0} E:${s.essayScore||0}</span></div>
              <span style="color:${s.convergence?"var(--success-5)":"var(--danger-5)"};font-weight:600">${s.convergence?"Pass ?":"Fail ?"}</span>
            </div>`).join("") : `<div class="state-empty"><p>No simulation records</p><p class="text-muted">Complete a full simulation to test your skills</p></div>`}
        </div>
      </div>
    </div>`;
}

function startSimulation() {
  alert("Simulation coming soon!\n\nIncludes:\n? Knowledge 75Q ? 120min\n? Case Analysis 5Q ? 90min\n? Essay 1 ? 120min\n\nStay tuned!");
}

/* ???????????????????????????????????????????????????????????
   Diagnosis
   ??????????????????????????????????????????????????????????? */
async function renderDiagnosis(c) {
  let diagnoses = [];
  try { diagnoses = await apiGet("/diagnoses"); } catch {}

  c.innerHTML = `
    <div class="page-title">?? Weakness Diagnosis</div>
    <div class="page-subtitle">AI Analysis ? Precision Strike</div>
    <div class="stack" style="margin-top:20px">
      <div class="content-card">
        <div class="content-card-header">
          <div class="content-card-title">?? Domain Radar</div>
          <button onclick="startDiagnosis()" style="padding:6px 16px;background:var(--primary-6);color:#fff;border:none;border-radius:6px;cursor:pointer">Start Diagnosis</button>
        </div>
        <div class="content-card-body"><div id="diagnosis-bars"></div></div>
      </div>
      ${diagnoses.length ? `
      <div class="content-card">
        <div class="content-card-header"><div class="content-card-title">?? History</div></div>
        <div class="content-card-body">
          ${diagnoses.slice(0,5).map(d => `
            <div style="padding:12px;margin-bottom:8px;background:var(--bg-surface-high);border-radius:8px">
              <div class="flex-between"><strong>${d.subject||"Diagnosis"}</strong> <span class="text-muted">${d.diagDate||""}</span></div>
              <div style="margin-top:4px">Score: <strong>${d.score||0}/${d.total||0}</strong></div>
              ${d.weaknesses?`<div class="text-muted" style="margin-top:4px">Weak: ${d.weaknesses}</div>`:""}
            </div>`).join("")}
        </div>
      </div>` : ""}
    </div>`;
  renderDiagnosisBars();
}

function renderDiagnosisBars() {
  const el = $("diagnosis-bars");
  if (!el) return;
  const domains = state.domains.length ? state.domains : [];
  const territories = state.territories;
  el.innerHTML = domains.map(d => {
    const t = territories.find(tt => tt.domainId === d.id) || {};
    const pct = Math.round((t.accuracy || 0) * 100);
    const color = pct >= 80 ? "var(--success-5)" : (pct >= 50 ? "var(--warning-5)" : "var(--danger-5)");
    const emoji = pct >= 80 ? "??" : (pct >= 50 ? "??" : "??");
    return `<div style="margin-bottom:12px">
      <div class="flex-between" style="margin-bottom:4px"><span>${emoji} ${d.name}</span><span style="font-weight:600;color:${color}">${pct}%</span></div>
      <div class="stat-bar" style="height:10px;background:var(--bg-surface-highest)"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join("") || `<div class="state-empty"><p>No data</p><p class="text-muted">Complete diagnosis to see weak points</p></div>`;
}

function startDiagnosis() {
  alert("Diagnosis coming soon!\n\nAI will analyze your answer data,\nfind weak domains, and give targeted advice.");
}

/* ???????????????????????????????????????????????????????????
   Data Center
   ??????????????????????????????????????????????????????????? */
async function renderData(c) {
  c.innerHTML = `
    <div class="page-title">?? Data Center</div>
    <div class="page-subtitle">Study Log ? Achievements ? Stats</div>
    <div class="stack" style="margin-top:20px">
      <div class="content-card" style="background:linear-gradient(135deg,var(--hud-bg-1),var(--hud-bg-2));color:var(--hud-text);border:none;overflow:hidden;position:relative">
        <div class="content-card-body" style="display:flex;align-items:center;gap:20px;position:relative;z-index:1">
          <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary-6),var(--hud-bg-2));display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.18);box-shadow:0 0 0 4px rgba(22,100,255,.18);font-size:32px">??</div>
          <div>
            <div style="font-size:22px;font-weight:700">Adventurer</div>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
              <span style="padding:2px 10px;border-radius:12px;background:rgba(22,100,255,.22);color:var(--hud-text-blue);font-size:12px;font-weight:600">Lv.${state.level}</span>
              <span style="padding:2px 10px;border-radius:12px;background:rgba(255,209,102,.16);color:var(--hud-coin);font-size:12px;font-weight:600">?? ${state.coin}</span>
              <span style="padding:2px 10px;border-radius:12px;background:rgba(30,191,111,.16);color:var(--color-combo);font-size:12px;font-weight:600">?? ${state.streak} days</span>
            </div>
          </div>
          <div style="margin-left:auto;display:flex;gap:20px;text-align:center">
            <div><div style="font-size:24px;font-weight:700" id="data-total-q">--</div><div class="text-muted">Total</div></div>
            <div><div style="font-size:24px;font-weight:700" id="data-accuracy">--</div><div class="text-muted">Accuracy</div></div>
            <div><div style="font-size:24px;font-weight:700" id="data-days">--</div><div class="text-muted">Days</div></div>
          </div>
        </div>
        <div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(22,100,255,.2),transparent 70%)"></div>
      </div>
      <div class="grid-2">
        <div class="content-card">
          <div class="content-card-header"><div class="content-card-title">?? Study Heatmap</div></div>
          <div class="content-card-body"><div id="heatmap" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px"></div></div>
        </div>
        <div class="content-card">
          <div class="content-card-header"><div class="content-card-title">?? Achievements</div></div>
          <div class="content-card-body" id="data-achievements"><div class="state-empty"><p>Loading...</p></div></div>
        </div>
      </div>
    </div>`;
  renderHeatmap();
  loadDataStats();
}

function renderHeatmap() {
  const el = $("heatmap");
  if (!el) return;
  let html = "";
  for (let i = 0; i < 28; i++) {
    const level = Math.floor(Math.random() * 4);
    const colors = ["var(--bg-surface-high)","#c6e48b","#7bc96f","#239a3b"];
    html += `<div style="aspect-ratio:1;border-radius:3px;background:${colors[level]}" title="Day ${28-i}"></div>`;
  }
  el.innerHTML = html;
}

async function loadDataStats() {
  try {
    const gs = await apiGet("/game/state");
    if (gs) {
      if ($("data-total-q")) $("data-total-q").textContent = gs.totalQuestions || 0;
      if ($("data-accuracy")) $("data-accuracy").textContent = Math.round((gs.accuracy || 0) * 100) + "%";
      if ($("data-days")) $("data-days").textContent = gs.streak || 0;
    }
  } catch {
    if ($("data-total-q")) $("data-total-q").textContent = "0";
    if ($("data-accuracy")) $("data-accuracy").textContent = "--";
    if ($("data-days")) $("data-days").textContent = "0";
  }
}
