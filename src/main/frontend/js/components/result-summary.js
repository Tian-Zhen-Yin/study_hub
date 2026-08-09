// result-summary.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { questions: Array, results: Object, gameState: Object },
  emits: ['close'],
  template: `
    <div class="result-summary" v-if="questions.length">
      <h2>练习结果</h2>
      <div class="result-score">{{ correctCount }} / {{ questions.length }} ({{ percentage }}%)</div>
      <button @click="$emit('close')">关闭</button>
    </div>
  `,
  computed: {
    correctCount() {
      return this.questions.filter(q => this.results[q.id] && this.results[q.id].correct).length;
    },
    percentage() {
      return Math.round((this.correctCount / this.questions.length) * 100);
    }
  }
});
