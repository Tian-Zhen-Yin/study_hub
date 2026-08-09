// question-panel.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { question: Object, selectedAnswer: String, submitted: Boolean },
  emits: ['select'],
  template: `
    <div class="question-panel" v-if="question">
      <div class="quiz-stem-image" v-if="imageUrl">
        <img :src="imageUrl" alt="题目配图" loading="lazy" @error="onImgError"
             style="max-width:100%;max-height:360px;border-radius:8px;border:1px solid var(--border-2);background:var(--bg-surface-low);object-fit:contain;display:block;margin:0 auto 12px">
      </div>
      <div class="quiz-stem">{{ question.stem }}</div>
      <div class="quiz-options">
        <div v-for="(opt, label) in options" :key="label"
          class="quiz-option"
          :class="optionClass(label)"
          @click="onSelect(label)">
          <span class="opt-label">{{ label }}</span>
          <span class="opt-text">{{ opt }}</span>
        </div>
      </div>
    </div>
  `,
  computed: {
    imageUrl() {
      const u = (this.question && this.question.imageUrl) ? String(this.question.imageUrl).trim() : '';
      if (!u) return '';
      if (/^(https?:\/\/|\/uploads\/|data:image\/)/i.test(u)) return u;
      return '';
    },
    options() {
      try {
        const arr = JSON.parse(this.question.optionsJson || '[]');
        return { A: arr[0]||'', B: arr[1]||'', C: arr[2]||'', D: arr[3]||'' };
      } catch(e) { return {}; }
    }
  },
  methods: {
    onSelect(label) { if (!this.submitted) this.$emit('select', label); },
    onImgError(e) { if (e && e.target && e.target.parentNode) e.target.parentNode.style.display = 'none'; },
    optionClass(label) {
      if (!this.submitted) return { selected: this.selectedAnswer === label };
      const correct = label === this.question.answer;
      const mine = label === this.selectedAnswer;
      return { correct, wrong: mine && !correct, selected: mine };
    }
  }
});
