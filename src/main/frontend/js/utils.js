// 工具函数

function updateDate() {
  const now = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const str = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${weekdays[now.getDay()]}`;
  document.getElementById('today-date').textContent = str;
}

function updateCountdown() {
  const examDate = new Date('2026-10-24');
  const now = new Date();
  const diff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
  document.getElementById('countdown').textContent = diff > 0 ? diff : '0';
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function showToast(msg, type = '') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = 'toast-msg' + (type ? ' ' + type : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

function formatHours(h) {
  return h != null ? h.toFixed(1) + 'h' : '0h';
}

function stateLabel(state) {
  const map = { PENDING: '待诊断', DIAGNOSED: '已诊断', LEARNING: '补缺中', VERIFIED: '已验证' };
  return map[state] || state;
}