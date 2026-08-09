import os

base = r'E:\AiProject\study_hub\src\main\frontend'

api_js = """// api.js -- Unified API wrapper for Study Hub
const API_BASE = 'http://localhost:8080/api';

async function fetchAPI(path, options = {}) {
    const config = {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    };
    const res = await fetch(API_BASE + path, config);
    if (!res.ok) {
        throw new Error('API Error ' + res.status + ': ' + (await res.text()));
    }
    const json = await res.json();
    if (json.code !== 200) {
        throw new Error(json.message || 'Unknown error');
    }
    return json.data;
}

const api = {
    getDomains: () => fetchAPI('/domains'),
    updateDomain: (id, dto) => fetchAPI('/domains/' + id, { method: 'PUT', body: JSON.stringify(dto) }),
    getQuestions: (domainId, count) => {
        count = count || 10;
        return fetchAPI('/questions?domainId=' + domainId + '&count=' + count);
    },
    getQuestionCount: (domainId) => fetchAPI('/questions/count?domainId=' + domainId),
    importMarkdown: (path) => fetchAPI('/questions/import/markdown', { method: 'POST', body: JSON.stringify({ path }) }),
    importPdf: (path) => fetchAPI('/questions/import/pdf', { method: 'POST', body: JSON.stringify({ path }) }),
};
"""

with open(os.path.join(base, 'js', 'api.js'), 'w', encoding='utf-8') as f:
    f.write(api_js)
print('api.js done')

quiz_js = """// quiz.js -- Online quiz page
var QuizPage = {
    currentQuestions: [],
    currentIndex: 0,
    answers: [],
    domainId: null,

    async init: function(domainId) {
        this.domainId = domainId;
        this.currentIndex = 0;
        this.answers = [];
        try {
            this.currentQuestions = await api.getQuestions(domainId, 10);
            if (this.currentQuestions.length === 0) {
                document.getElementById('quiz-content').innerHTML = '<p>No questions in this domain.</p>';
                return;
            }
            this.renderQuestion();
        } catch (e) {
            document.getElementById('quiz-content').innerHTML = '<p>Load failed: ' + e.message + '</p>';
        }
    },

    renderQuestion: function() {
        var q = this.currentQuestions[this.currentIndex];
        var options = [];
        try { options = JSON.parse(q.optionsJson || '[]'); } catch(e) {}
        var labels = ['A', 'B', 'C', 'D'];
        var progress = (this.currentIndex + 1) + ' / ' + this.currentQuestions.length;

        var html = '<div class="quiz-progress">' + progress + '</div>';
        html += '<div class="quiz-question">';
        html += '<div class="quiz-stem">' + (this.currentIndex + 1) + '. ' + this.escapeHtml(q.stem) + '</div>';
        html += '<div class="quiz-options">';

        var self = this;
        options.forEach(function(opt, i) {
            var selected = self.answers[self.currentIndex] === labels[i] ? ' selected' : '';
            html += '<div class="quiz-option' + selected + '" onclick="QuizPage.selectAnswer(\'' + labels[i] + '\')">';
            html += '<span class="opt-label">' + labels[i] + '</span>';
            html += '<span class="opt-text">' + self.escapeHtml(opt) + '</span>';
            html += '</div>';
        });

        html += '</div></div>';

        if (this.answers[this.currentIndex]) {
            var isCorrect = this.answers[this.currentIndex] === q.answer;
            html += '<div class="quiz-analysis ' + (isCorrect ? 'correct' : 'wrong') + '">';
            html += '<strong>' + (isCorrect ? 'Correct' : 'Wrong') + '</strong> Answer: ' + q.answer;
            if (q.analysis) html += '<p>' + this.escapeHtml(q.analysis) + '</p>';
            html += '</div>';
        }

        html += '<div class="quiz-nav">';
        if (this.currentIndex > 0) html += '<button onclick="QuizPage.prevQuestion()">Previous</button>';
        if (this.currentIndex < this.currentQuestions.length - 1) {
            html += '<button onclick="QuizPage.nextQuestion()">Next</button>';
        } else if (this.answers.every(function(a) { return a; })) {
            html += '<button onclick="QuizPage.showResult()">Show Result</button>';
        }
        html += '</div>';

        document.getElementById('quiz-content').innerHTML = html;
    },

    selectAnswer: function(label) {
        this.answers[this.currentIndex] = label;
        this.renderQuestion();
    },

    nextQuestion: function() {
        if (this.currentIndex < this.currentQuestions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
        }
    },

    prevQuestion: function() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
        }
    },

    showResult: function() {
        var correct = 0;
        var self = this;
        this.currentQuestions.forEach(function(q, i) {
            if (self.answers[i] === q.answer) correct++;
        });
        var score = Math.round((correct / this.currentQuestions.length) * 100);
        document.getElementById('quiz-content').innerHTML =
            '<div class="quiz-result">' +
            '<h2>Quiz Result</h2>' +
            '<div class="score">' + correct + ' / ' + this.currentQuestions.length + ' (' + score + '%)</div>' +
            '<button onclick="QuizPage.init(' + this.domainId + ')">Try Again</button>' +
            '</div>';
    },

    escapeHtml: function(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
"""

with open(os.path.join(base, 'js', 'pages', 'quiz.js'), 'w', encoding='utf-8') as f:
    f.write(quiz_js)
print('quiz.js done')

quiz_css = """/* quiz.css */
.quiz-progress { text-align: center; color: #6B7280; font-size: 0.9rem; margin-bottom: 16px; }
.quiz-stem { font-size: 1.05rem; line-height: 1.8; margin-bottom: 20px; padding: 16px; background: #FFFFFF; border-radius: 8px; border-left: 3px solid #1D4ED8; }
.quiz-options { display: flex; flex-direction: column; gap: 10px; }
.quiz-option { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.quiz-option:hover { border-color: #1D4ED8; background: rgba(29, 78, 216, 0.04); }
.quiz-option.selected { border-color: #1D4ED8; background: rgba(29, 78, 216, 0.08); }
.opt-label { font-weight: 700; color: #1D4ED8; min-width: 24px; font-family: 'JetBrains Mono', monospace; }
.quiz-analysis { margin-top: 20px; padding: 16px; border-radius: 8px; font-size: 0.92rem; line-height: 1.7; }
.quiz-analysis.correct { background: rgba(4, 120, 87, 0.1); border: 1px solid #047857; }
.quiz-analysis.wrong { background: rgba(190, 18, 60, 0.1); border: 1px solid #BE123C; }
.quiz-nav { display: flex; gap: 12px; margin-top: 24px; justify-content: center; }
.quiz-nav button { padding: 10px 24px; background: #1D4ED8; color: #FFF; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.quiz-nav button:hover { opacity: 0.9; }
.quiz-result { text-align: center; padding: 40px; }
.quiz-result .score { font-size: 3rem; font-weight: 700; color: #1D4ED8; margin: 20px 0; font-family: 'JetBrains Mono', monospace; }
"""

with open(os.path.join(base, 'css', 'quiz.css'), 'w', encoding='utf-8') as f:
    f.write(quiz_css)
print('quiz.css done')
print('All frontend files created')
