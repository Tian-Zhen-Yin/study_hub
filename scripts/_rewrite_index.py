html = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Hub - Quiz</title>
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
.quiz-progress { text-align: center; color: var(--muted); font-size: 0.9rem; margin-bottom: 16px; }
.quiz-stem { font-size: 1.05rem; line-height: 1.8; margin-bottom: 20px; padding: 16px; background: var(--bg2); border-radius: 8px; border-left: 3px solid var(--accent); }
.quiz-options { display: flex; flex-direction: column; gap: 10px; }
.quiz-option { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: var(--bg2); border: 2px solid var(--rule); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.quiz-option:hover { border-color: var(--accent); background: rgba(29, 78, 216, 0.04); }
.quiz-option.selected { border-color: var(--accent); background: rgba(29, 78, 216, 0.08); }
.opt-label { font-weight: 700; color: var(--accent); min-width: 24px; }
.quiz-analysis { margin-top: 20px; padding: 16px; border-radius: 8px; font-size: 0.92rem; line-height: 1.7; }
.quiz-analysis.correct { background: rgba(4, 120, 87, 0.1); border: 1px solid var(--green); }
.quiz-analysis.wrong { background: rgba(190, 18, 60, 0.1); border: 1px solid var(--rose); }
.quiz-nav { display: flex; gap: 12px; margin-top: 24px; justify-content: center; }
.quiz-nav button { padding: 10px 24px; background: var(--accent); color: #FFF; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.quiz-nav button:hover { opacity: 0.9; }
.quiz-result { text-align: center; padding: 40px; }
.quiz-result .score { font-size: 3rem; font-weight: 700; color: var(--accent); margin: 20px 0; }
</style>
</head>
<body>
<div class="container">
    <h1>Study Hub - Online Quiz</h1>
    <p style="color: var(--muted);">Select a domain to start</p>
    <div class="domain-select" id="domain-select"></div>
    <div id="quiz-content">
        <p style="color: var(--muted);">Select a domain above to begin.</p>
    </div>
</div>

<script>
var QuizPage = {
    questions: [],
    index: 0,
    answers: [],
    domainId: null,

    load: async function(domainId) {
        var self = this;
        self.domainId = domainId;
        self.index = 0;
        self.answers = [];
        try {
            var resp = await fetch('/api/questions?domainId=' + domainId + '&count=10');
            var json = await resp.json();
            if (json.code !== 200) throw new Error(json.message);
            self.questions = json.data;
            if (self.questions.length === 0) {
                document.getElementById('quiz-content').innerHTML = '<p>No questions in this domain.</p>';
                return;
            }
            self.show();
        } catch (e) {
            document.getElementById('quiz-content').innerHTML = '<p style="color:var(--rose)">Error: ' + e.message + '</p>';
        }
    },

    show: function() {
        var self = this;
        var q = self.questions[self.index];
        var options = [];
        try { options = JSON.parse(q.optionsJson || '[]'); } catch(e) {}
        var labels = ['A', 'B', 'C', 'D'];

        var h = '<div class="quiz-progress">' + (self.index + 1) + ' / ' + self.questions.length + '</div>';
        h += '<div class="quiz-stem">' + (self.index + 1) + '. ' + self.esc(q.stem) + '</div>';
        h += '<div class="quiz-options">';

        for (var i = 0; i < options.length; i++) {
            var sel = self.answers[self.index] === labels[i] ? ' selected' : '';
            h += '<div class="quiz-option' + sel + '" data-idx="' + i + '">';
            h += '<span class="opt-label">' + labels[i] + '</span>';
            h += '<span class="opt-text">' + self.esc(options[i]) + '</span>';
            h += '</div>';
        }
        h += '</div>';

        if (self.answers[self.index]) {
            var ok = self.answers[self.index] === q.answer;
            h += '<div class="quiz-analysis ' + (ok ? 'correct' : 'wrong') + '">';
            h += '<strong>' + (ok ? 'Correct' : 'Wrong') + '</strong> Answer: ' + q.answer;
            if (q.analysis) h += '<p>' + self.esc(q.analysis) + '</p>';
            h += '</div>';
        }

        h += '<div class="quiz-nav">';
        if (self.index > 0) h += '<button id="btn-prev">Previous</button>';
        if (self.index < self.questions.length - 1) {
            h += '<button id="btn-next">Next</button>';
        } else if (self.answers.every(function(a) { return a; })) {
            h += '<button id="btn-result">Show Result</button>';
        }
        h += '</div>';

        document.getElementById('quiz-content').innerHTML = h;

        // Bind option clicks
        var opts = document.querySelectorAll('.quiz-option');
        for (var j = 0; j < opts.length; j++) {
            (function(idx) {
                opts[j].addEventListener('click', function() {
                    self.answers[self.index] = labels[idx];
                    self.show();
                });
            })(j);
        }

        // Bind nav buttons
        var btnPrev = document.getElementById('btn-prev');
        if (btnPrev) btnPrev.addEventListener('click', function() { self.index--; self.show(); });
        var btnNext = document.getElementById('btn-next');
        if (btnNext) btnNext.addEventListener('click', function() { self.index++; self.show(); });
        var btnResult = document.getElementById('btn-result');
        if (btnResult) btnResult.addEventListener('click', function() {
            var correct = 0;
            for (var k = 0; k < self.questions.length; k++) {
                if (self.answers[k] === self.questions[k].answer) correct++;
            }
            var pct = Math.round(correct / self.questions.length * 100);
            document.getElementById('quiz-content').innerHTML =
                '<div class="quiz-result"><h2>Result</h2>' +
                '<div class="score">' + correct + ' / ' + self.questions.length + ' (' + pct + '%)</div>' +
                '<button onclick="QuizPage.load(' + self.domainId + ')">Try Again</button></div>';
        });
    },

    esc: function(text) {
        var d = document.createElement('div');
        d.textContent = text || '';
        return d.innerHTML;
    }
};

// Load domains
(async function() {
    try {
        var resp = await fetch('/api/domains');
        var json = await resp.json();
        var domains = json.data;
        var div = document.getElementById('domain-select');
        for (var i = 0; i < domains.length; i++) {
            (function(d) {
                var btn = document.createElement('button');
                btn.textContent = d.name;
                btn.addEventListener('click', function() {
                    var all = document.querySelectorAll('.domain-select button');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
                    btn.classList.add('active');
                    QuizPage.load(d.id);
                });
                div.appendChild(btn);
            })(domains[i]);
        }
    } catch (e) {
        document.getElementById('quiz-content').innerHTML = '<p style="color:var(--rose)">Failed to load domains: ' + e.message + '</p>';
    }
})();
</script>
</body>
</html>'''

with open(r'E:\AiProject\study_hub\src\main\resources\static\index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Rewritten index.html')
