html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Hub - Quiz</title>
<link rel="stylesheet" href="css/quiz.css">
<style>
:root { --bg: #FAFAF9; --bg2: #FFFFFF; --ink: #1C1C1C; --muted: #6B7280; --rule: #E5E7EB; --accent: #1D4ED8; --green: #047857; --rose: #BE123C; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Microsoft YaHei', sans-serif; font-size: 16px; line-height: 1.75; color: var(--ink); background: var(--bg); }
.container { max-width: 800px; margin: 0 auto; padding: 24px; }
h1 { font-size: 1.5rem; margin-bottom: 8px; }
.domain-select { margin: 20px 0; display: flex; gap: 8px; flex-wrap: wrap; }
.domain-select button { padding: 8px 16px; border: 2px solid var(--rule); border-radius: 6px; background: var(--bg2); cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.domain-select button:hover { border-color: var(--accent); }
.domain-select button.active { background: var(--accent); color: #FFF; border-color: var(--accent); }
#quiz-content { margin-top: 20px; }
</style>
</head>
<body>
<div class="container">
    <h1>Study Hub - Online Quiz</h1>
    <p style="color: var(--muted);">Select a knowledge domain to start</p>
    <div class="domain-select" id="domain-select"></div>
    <div id="quiz-content">
        <p style="color: var(--muted);">Select a domain above to begin.</p>
    </div>
</div>

<script src="js/api.js"></script>
<script src="js/pages/quiz.js"></script>
<script>
(async function() {
    try {
        var domains = await api.getDomains();
        var selectDiv = document.getElementById('domain-select');
        domains.forEach(function(d) {
            var btn = document.createElement('button');
            btn.textContent = d.name + ' (' + d.pct + '%)';
            btn.onclick = function() {
                document.querySelectorAll('.domain-select button').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                QuizPage.init(d.id);
            };
            selectDiv.appendChild(btn);
        });
    } catch (e) {
        document.getElementById('quiz-content').innerHTML = '<p style="color: var(--rose);">Failed to load domains. Make sure the backend is running.</p>';
    }
})();
</script>
</body>
</html>"""

with open(r'E:\AiProject\study_hub\src\main\frontend\index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('index.html created')
