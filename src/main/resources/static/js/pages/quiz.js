// quiz.js -- Online quiz page
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
        html += this.renderQuestionImageHtml(q.imageUrl);
        html += '<div class="quiz-stem">' + (this.currentIndex + 1) + '. ' + this.escapeHtml(q.stem) + '</div>';
        html += '<div class="quiz-options">';

        var self = this;
        options.forEach(function(opt, i) {
            var selected = self.answers[self.currentIndex] === labels[i] ? ' selected' : '';
            html += '<div class="quiz-option' + selected + '" onclick="QuizPage.selectAnswer(\'" + labels[i] + "\')">';
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

    renderQuestionImageHtml: function(url) {
        var safe = this.safeImageUrl(url);
        if (!safe) return '';
        return '<div class="quiz-stem-image" style="margin:0 0 12px 0;text-align:center">' +
               '<img src="' + safe + '" alt="题目配图" loading="lazy" ' +
               'style="max-width:100%;max-height:360px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;object-fit:contain" ' +
               'onerror="this.parentNode.style.display=\'none\'"></div>';
    },

    safeImageUrl: function(url) {
        if (!url) return '';
        var u = String(url).trim();
        if (!u) return '';
        if (/^(https?:\/\/|\/uploads\/|data:image\/)/i.test(u)) return u;
        return '';
    },

    escapeHtml: function(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
