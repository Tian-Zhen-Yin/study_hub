// 仪表盘页面渲染

async function renderDashboard() {
  try {
    const data = await api.getDashboard();
    renderStats(data.stats);
    renderTodayTasks(data.todayTasks);
    renderRadar(data.radarData);
    renderRecentSimulations(data.recentSimulations);
  } catch (err) {
    console.error('仪表盘加载失败:', err);
  }
}

function renderStats(stats) {
  const html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${formatHours(stats.totalHours)}</div>
        <div class="stat-label">累计学习时长</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.taskCompletionRate}%</div>
        <div class="stat-label">任务完成率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatHours(stats.weeklyHours)}</div>
        <div class="stat-label">本周学习时长</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.streak}</div>
        <div class="stat-label">连续学习天数</div>
      </div>
    </div>
  `;
  document.getElementById('page-dashboard').innerHTML = html;
}

function renderTodayTasks(tasks) {
  const container = document.getElementById('page-dashboard');
  const items = tasks.map(t => `
    <li class="task-item${t.done ? ' done' : ''}">
      <span class="task-text">${t.text}</span>
      <span class="task-week">第${t.weekNum}周</span>
    </li>
  `).join('');

  const html = `
    <div class="two-col">
      <div class="card">
        <div class="card-header">今日待办</div>
        <ul class="task-list">${items || '<li class="task-item"><span class="task-text" style="color:var(--muted)">暂无待办</span></li>'}</ul>
      </div>
      <div class="card" id="radar-card">
        <div class="card-header">知识域雷达图</div>
        <div class="radar-container">
          <canvas id="radar-canvas" width="320" height="320"></canvas>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function renderRadar(radarData) {
  if (!radarData || radarData.length === 0) return;

  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = 120;
  const n = radarData.length;
  const angleStep = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, w, h);

  // 网格线
  for (let level = 1; level <= 5; level++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const lr = (r / 5) * level;
      const x = cx + lr * Math.cos(angle);
      const y = cy + lr * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(226,232,240,0.06)';
    ctx.stroke();
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const angle = angleStep * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.strokeStyle = 'rgba(226,232,240,0.1)';
    ctx.stroke();
  }

  // 数据多边形
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const pct = radarData[i].pct / 100;
    const angle = angleStep * i - Math.PI / 2;
    const x = cx + r * pct * Math.cos(angle);
    const y = cy + r * pct * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 数据点
  for (let i = 0; i < n; i++) {
    const pct = radarData[i].pct / 100;
    const angle = angleStep * i - Math.PI / 2;
    const x = cx + r * pct * Math.cos(angle);
    const y = cy + r * pct * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  }

  // 标签
  ctx.fillStyle = '#8892b0';
  ctx.font = '11px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const labelR = r + 22;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle) + 4;
    ctx.fillText(radarData[i].name, x, y);
  }
}

function renderRecentSimulations(simulations) {
  const container = document.getElementById('page-dashboard');
  const items = (simulations || []).map(s => `
    <li class="sim-item">
      <span class="sim-date">${s.simDate}</span>
      <div class="sim-scores">
        <span class="sim-score ${s.knowledgeScore >= 50 ? 'pass' : 'fail'}">综合:${s.knowledgeScore}</span>
        <span class="sim-score ${s.caseScore >= 50 ? 'pass' : 'fail'}">案例:${s.caseScore}</span>
        <span class="sim-score ${s.essayScore >= 50 ? 'pass' : 'fail'}">论文:${s.essayScore}</span>
      </div>
      ${s.convergence ? '<span class="sim-converged">已收敛</span>' : ''}
    </li>
  `).join('');

  const html = `
    <div class="card">
      <div class="card-header">最近模拟记录</div>
      <ul class="sim-list">${items || '<li class="sim-item"><span style="color:var(--muted)">暂无模拟记录</span></li>'}</ul>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}