// quiz-page.js
import GameHud from '../components/game-hud.js';
import ModeSelector from '../components/mode-selector.js';
import QuestionPanel from '../components/question-panel.js';
import BattleFeedback from '../components/battle-feedback.js';
import AnalysisPanel from '../components/analysis-panel.js';
import BookmarkButton from '../components/bookmark-button.js';
import AnswerCard from '../components/answer-card.js';
import ResultSummary from '../components/result-summary.js';
import ChapterProgress from '../components/chapter-progress.js';
import TutorPanel from '../components/tutor-panel.js';

const { defineComponent } = Vue;

export default defineComponent({
  components: { GameHud, ModeSelector, QuestionPanel, BattleFeedback, AnalysisPanel, BookmarkButton, AnswerCard, ResultSummary, ChapterProgress, TutorPanel },
  props: { gameState: Object },
  emits: ['state-update'],
  data() {
    return {
      mode: 'continue',
      questions: [],
      currentIndex: 0,
      answers: {},
      results: {},
      showResult: false,
      battleResult: null,
      showBattle: false,
      bookmarked: {},
      showTutor: false,
      tutorRecordId: null,
    };
  },
  template: `
    <div class="quiz-page">
      <game-hud :state="gameState" />
      <mode-selector v-model="mode" @start="startQuiz" :gameState="gameState" />
      <div v-if="questions.length" class="quiz-layout">
        <div class="quiz-main">
          <question-panel :question="currentQuestion" :selectedAnswer="answers[currentQuestion.id]" :submitted="!!results[currentQuestion.id]" @select="onAnswer" />
          <battle-feedback :result="battleResult" :show="showBattle" />
          <analysis-panel v-if="results[currentQuestion.id]" :result="results[currentQuestion.id]" :question="currentQuestion" />
          <button v-if="currentResult && !currentResult.correct" @click="askTutor" class="action-btn tutor-trigger">问 AI 为什么错</button>
          <tutor-panel :answerRecordId="tutorRecordId" :visible="showTutor" @close="showTutor=false" />
          <bookmark-button :questionId="currentQuestion.id" :bookmarked="!!bookmarked[currentQuestion.id]" @toggle="toggleBookmark" />
          <div class="quiz-nav">
            <button @click="prev" :disabled="currentIndex===0">上一题</button>
            <button @click="next" :disabled="currentIndex>=questions.length-1">下一题</button>
            <button @click="showResult=true" v-if="allAnswered">查看结果</button>
          </div>
        </div>
        <answer-card :questions="questions" :answers="answers" :results="results" :currentIndex="currentIndex" @jump="currentIndex=$event" />
      </div>
      <div v-else class="quiz-empty">请选择练习模式开始。</div>
      <result-summary v-if="showResult" :questions="questions" :results="results" :gameState="gameState" @close="showResult=false" />
      <chapter-progress />
    </div>
  `,
  computed: {
    currentQuestion() { return this.questions[this.currentIndex] || {}; },
    allAnswered() { return this.questions.length > 0 && this.questions.every(q => this.results[q.id]); },
    currentResult() { return this.results[this.currentQuestion.id]; },
  },
  methods: {
    async startQuiz(params) {
      try {
        const res = await fetch('/api/quiz/set', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        this.questions = await res.json();
        this.currentIndex = 0;
        this.answers = {};
        this.results = {};
        this.showTutor = false;
      } catch(e) { alert('加载失败：' + e.message); }
    },
    async onAnswer(label) {
      const q = this.currentQuestion;
      if (this.results[q.id]) return;
      this.answers[q.id] = label;
      try {
        const res = await fetch('/api/quiz/answer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: q.id, userAnswer: label })
        });
        const result = await res.json();
        this.results[q.id] = result;
        this.battleResult = result;
        this.showBattle = true;
        setTimeout(() => this.showBattle = false, 2000);
        this.$emit('state-update');
      } catch(e) { alert('提交失败：' + e.message); }
    },
    askTutor() {
      const r = this.currentResult;
      if (!r || !r.answerRecordId) { alert('无法获取作答记录'); return; }
      this.tutorRecordId = r.answerRecordId;
      this.showTutor = true;
    },
    async toggleBookmark() {
      const q = this.currentQuestion;
      try {
        const res = await fetch('/api/bookmarks/' + q.id, { method: 'POST' });
        const data = await res.json();
        this.bookmarked[q.id] = data.bookmarked;
      } catch(e) {}
    },
    prev() { if (this.currentIndex > 0) this.currentIndex--; this.showTutor = false; },
    next() { if (this.currentIndex < this.questions.length - 1) this.currentIndex++; this.showTutor = false; },
  }
});
