// 路由控制器
const pageTitles = {
  dashboard: '备考总览',
  diagnose: 'SFT 诊断',
  rl: 'RL 迭代',
  weekly: '13周计划',
  domains: '知识领域',
  quiz: '在线刷题',
  log: '学习日志',
  essays: '论文管理',
};

const pageRenderers = {
  dashboard: renderDashboard,
  diagnose: null,
  rl: null,
  weekly: null,
  domains: null,
  quiz: null,
  log: null,
  essays: null,
};

function switchPage(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // 移除所有导航高亮
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // 显示目标页面
  const targetPage = document.getElementById('page-' + pageName);
  if (targetPage) targetPage.classList.add('active');

  // 高亮目标导航
  const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (targetNav) targetNav.classList.add('active');

  // 更新标题
  document.getElementById('page-title').textContent = pageTitles[pageName] || pageName;

  // 调用渲染函数
  const renderFn = pageRenderers[pageName];
  if (renderFn) renderFn();
}

// 导航点击事件
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      switchPage(page);
    });
  });
});