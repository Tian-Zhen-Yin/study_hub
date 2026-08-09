// analysis-panel.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { result: Object, question: Object },
  template: `
    <div class="analysis-panel" v-if="result">
      <div class="analysis-answer" :class="result.correct ? 'correct' : 'wrong'">
        <strong>{{ result.correct ? '正确' : '错误' }}</strong>
        正确答案：{{ result.answer }}
      </div>
      <div class="analysis-text" v-if="result.analysis">{{ result.analysis }}</div>
    </div>
  `
});
