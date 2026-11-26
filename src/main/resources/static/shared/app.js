/* ============================================================
   app.js - SPA Shell: Routing, Navigation, API Helpers
   ============================================================ */

const API = "/api";

function getDefaultExamDate() {
  const saved = localStorage.getItem("studyhub_exam_date");
  if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
  // 自动推算下一次软考高项/架构师考试日期（每年 5 月最后一个周六或 11 月第一个周六）
  const now = new Date();
  const y = now.getFullYear();
  const candidates = [`${y}-05-24`, `${y}-11-08`, `${y + 1}-05-24`];
  for (const c of candidates) {
    if (new Date(c) > now) return c;
  }
  return `${y + 1}-05-24`;
}

const state = {
  page: "dashboard",
  hp: 100, maxHp: 100,
  exp: 0, maxExp: 100,
  level: 1,
  coin: 0,
  streak: 0,
  examDate: getDefaultExamDate(),
  domains: [],
  territories: [],
  gameState: null
};

async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  return json.data ?? json;
}

async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let msg = res.status;
    try { const err = await res.json(); msg = err.message || err.error || JSON.stringify(err).substring(0, 200); } catch(e) { try { msg = await res.text(); } catch(e2) {} }
    throw new Error(msg);
  }
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(API + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.status);
  }
  const json = await res.json();
  return json.data ?? json;
}

async function apiDelete(path) {
  const res = await fetch(API + path, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.status);
  }
  return res.json();
}

function safeImageUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (!u) return "";
  if (/^(https?:\/\/|\/uploads\/|data:image\/)/i.test(u)) return u;
  return "";
}

function renderQuestionImageHtml(url) {
  const safe = safeImageUrl(url);
  if (!safe) return "";
  return '<div class="quiz-stem-image" style="margin:0 0 12px 0;text-align:center">' +
         '<img src="' + safe + '" alt="题目配图" loading="lazy" ' +
         'style="max-width:100%;max-height:360px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-low);object-fit:contain" ' +
         'onerror="this.parentNode.style.display=\'none\'"></div>';
}

function navigate(page) {
  state.page = page;
  window.location.hash = page;
  renderNav();
  renderPage();
}

function renderNav() {
  document.querySelectorAll(".sidenav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === state.page);
  });
}

function updateHUD() {
  const hp = document.getElementById("hud-hp");
  const exp = document.getElementById("hud-exp");
  const coin = document.getElementById("hud-coin");
  const level = document.getElementById("hud-level");
  if (hp) hp.textContent = state.hp + "/" + state.maxHp;
  if (exp) exp.textContent = state.exp + "/" + state.maxExp;
  if (coin) coin.textContent = state.coin;
  if (level) level.textContent = "Lv." + state.level;
}

function updateBottomBar() {
  const days = document.getElementById("bottombar-days");
  const streak = document.getElementById("bottombar-streak");
  if (days) {
    const d = Math.ceil((new Date(state.examDate) - new Date()) / 86400000);
    days.textContent = d >= 0 ? d : 0;
    days.parentElement.title = "目标考试日期：" + state.examDate + "（点击自定义）";
  }
  if (streak) streak.textContent = state.streak;
}

function editExamDate() {
  const input = prompt("请输入你的目标考试日期（格式 YYYY-MM-DD）：", state.examDate);
  if (!input) return;
  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || isNaN(new Date(trimmed).getTime())) {
    alert("日期格式不正确，请输入如 2027-05-29");
    return;
  }
  state.examDate = trimmed;
  localStorage.setItem("studyhub_exam_date", trimmed);
  updateBottomBar();
}

async function init() {
  try {
    const [domains, territories, gameState, appConfig] = await Promise.all([
      apiGet("/domains").catch(() => []),
      apiGet("/territories").catch(() => []),
      apiGet("/game/state").catch(() => null),
      apiGet("/config").catch(() => null)
    ]);
    state.domains = Array.isArray(domains) ? domains : [];
    state.territories = Array.isArray(territories) ? territories : [];
    if (!localStorage.getItem("studyhub_exam_date") && appConfig && appConfig.examDate) {
      state.examDate = appConfig.examDate;
    }
    if (gameState) {
      state.hp = gameState.hp ?? 100;
      state.maxHp = gameState.maxHp ?? 100;
      state.exp = gameState.exp ?? 0;
      state.maxExp = gameState.maxExp ?? 100;
      state.level = gameState.level ?? 1;
      state.coin = gameState.coin ?? 0;
      state.streak = gameState.streak ?? 0;
    }
  } catch (e) {
    console.warn("Backend unavailable, using defaults");
  }

  const hash = window.location.hash.slice(1) || "dashboard";
  state.page = hash;
  updateHUD();
  updateBottomBar();
  renderNav();
  renderPage();
}

window.addEventListener("hashchange", () => {
  const page = window.location.hash.slice(1) || "dashboard";
  if (page !== state.page) {
    state.page = page;
    renderNav();
    renderPage();
  }
});

window.addEventListener("DOMContentLoaded", init);
window.navigate = navigate;
window.editExamDate = editExamDate;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.state = state;
