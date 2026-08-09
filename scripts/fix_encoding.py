# -*- coding: utf-8 -*-
import os

BASE = r"E:\AiProject\study_hub\src\main\resources\static"

# ============================================================
# index.html
# ============================================================
html = u"""<!DOCTYPE html>
<html lang="zh-CN" class="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Hub \u2014 \u5192\u9669\u8005\u5927\u5385</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.1/dist/index.global.js"></script>
<script src="https://unpkg.com/lucide@1.8.0/dist/umd/lucide.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>
<link rel="stylesheet" href="shared/variables.css">
<link rel="stylesheet" href="shared/layout.css">
<link rel="stylesheet" href="colors_and_type.css">
<link rel="stylesheet" href="components.css">
</head>
<body>
<div class="app-shell">
  <header class="app-topnav">
    <div class="topnav-brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      <span>Study Hub</span>
    </div>
    <div class="topnav-hud">
      <div class="topnav-hud-item"><span class="hud-dot hp"></span> HP <strong id="hud-hp">100/100</strong></div>
      <div class="topnav-hud-item"><span class="hud-dot exp"></span> EXP <strong id="hud-exp">0/100</strong></div>
      <div class="topnav-hud-item"><span class="hud-dot coin"></span> <strong id="hud-coin">0</strong></div>
      <div class="topnav-hud-item" style="font-weight:700;color:var(--primary-6)" id="hud-level">Lv.1</div>
    </div>
  </header>

  <div class="app-body">
    <nav class="app-sidenav">
      <div class="sidenav-section">
        <div class="sidenav-section-title">\u5927\u5385</div>
        <div class="sidenav-item active" data-page="dashboard" onclick="navigate(&quot;dashboard&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>
          \u4eea\u8868\u76d8
        </div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-section-title">\u6218\u6597</div>
        <div class="sidenav-item" data-page="quiz" onclick="navigate(&quot;quiz&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2l6 8H8l2 8-6-8h4L6 2z"/></svg>
          \u5237\u9898\u6218\u6597
        </div>
        <div class="sidenav-item" data-page="memory" onclick="navigate(&quot;memory&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.93 4.93l2.83 2.83M12.24 12.24l2.83 2.83M4.93 15.07l2.83-2.83M12.24 7.76l2.83-2.83"/></svg>
          \u8bb0\u5fc6\u7194\u7089
          <span class="nav-badge" id="memory-badge" style="display:none">12</span>
        </div>
        <div class="sidenav-item" data-page="simulation" onclick="navigate(&quot;simulation&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>
          \u5168\u771f\u6a21\u62df
        </div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-section-title">\u5206\u6790</div>
        <div class="sidenav-item" data-page="diagnosis" onclick="navigate(&quot;diagnosis&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h14v14H3z"/><path d="M7 13l3-5 3 5"/></svg>
          \u5f31\u70b9\u8bca\u65ad
        </div>
        <div class="sidenav-item" data-page="data" onclick="navigate(&quot;data&quot;)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="14" width="4" height="4" rx="1"/><rect x="8" y="8" width="4" height="10" rx="1"/><rect x="14" y="2" width="4" height="16" rx="1"/></svg>
          \u6570\u636e\u4e2d\u5fc3
        </div>
      </div>
    </nav>

    <main class="app-content" id="app-content">
      <div class="state-loading"><div class="spinner"></div><p>\u52a0\u8f7d\u4e2d...</p></div>
    </main>
  </div>

  <footer class="app-bottombar">
    <div class="bottombar-item">\u8ddd\u8003\u8bd5 <strong id="bottombar-days">--</strong> \u5929</div>
    <div class="bottombar-item">\u8fde\u7eed <strong id="bottombar-streak" class="streak">0</strong> \u5929</div>
  </footer>
</div>

<script src="shared/app.js"></script>
<script src="shared/pages.js"></script>
<script>lucide.createIcons();</script>
</body>
</html>"""

with open(os.path.join(BASE, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("index.html done")
