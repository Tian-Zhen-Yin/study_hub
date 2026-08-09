// answer-card.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { questions: Array, answers: Object, results: Object, currentIndex: Number },
  emits: ['jump'],
  template: `
    <div class="answer-card">
      <div class="card-header">答题卡</div>
      <div class="answer-grid">
        <div v-for="(q, i) in questions" :key="q.id"
          class="answer-cell"
          :class="cellClass(i, q)"
          @click="$emit('jump', i)">
          {{ i + 1 }}
        </div>
      </div>
    </div>
  `,
  methods: {
    cellClass(i, q) {
      const cls = { current: i === this.currentIndex };
      if (this.results[q.id]) {
        cls.answered = true;
        cls.correct = this.results[q.id].correct;
        cls.wrong = !this.results[q.id].correct;
      } else if (this.answers[q.id]) {
        cls.answered = true;
      }
      return cls;
    }
  }
});
