/* ============================================================
   app.js — SPA Shell: Routing, Navigation, API Helpers
   ============================================================ */

const API = "http://localhost:8080/api";

/* ── State ── */
const state = {
  page: "dashboard",
  hp: 100, maxHp: 100,
  exp: 0, maxExp: 100,
  level: 1,
  coin: 0,
  streak: 0,
  examDate: "2026-10-24",
  domains: [],
  territories: [],
  gameState: null
};

/* ── API Helpers ── */
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
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

/* ── Navigation ── */
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
  document.title = el("sidenav-item", state.page)?.textContent?.trim() + " — Study Hub";
}

function el(sel, page) {
  return document.querySelector(`.${sel}[data-page="${page}"]`);
}

/* ── HUD ── */
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
    days.textContent = d + " 天";
  }
  if (streak) streak.textContent = state.streak;
}

/* ── Bootstrap ── */
async function init() {
  try {
    const [domains, territories, gameState] = await Promise.all([
      apiGet("/domains").catch(() => []),
      apiGet("/territories").catch(() => []),
      apiGet("/game/state").catch(() => null)
    ]);
    state.domains = Array.isArray(domains) ? domains : [];
    state.territories = Array.isArray(territories) ? territories : [];
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

  const hash = window.location.hash.replace("#/", "") || "dashboard";
  state.page = hash;
  updateHUD();
  updateBottomBar();
  renderNav();
  renderPage();
}

window.addEventListener("hashchange", () => {
  const page = window.location.hash.replace("#/", "") || "dashboard";
  if (page !== state.page) {
    state.page = page;
    renderNav();
    renderPage();
  }
});

window.addEventListener("DOMContentLoaded", init);
window.navigate = navigate;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.state = state;
