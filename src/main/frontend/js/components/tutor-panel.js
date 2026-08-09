// tutor-panel.js
const { defineComponent } = Vue;

export default defineComponent({
  props: {
    answerRecordId: { type: Number, default: null },
    visible: { type: Boolean, default: false }
  },
  emits: ['close'],
  template: `
    <div class="tutor-panel" v-if="visible">
      <div class="tutor-header">
        <span class="tutor-badge">AI 辅导</span>
        <span v-if="errorTypeLabel && !degraded" class="error-tag" :class="errorType">{{ errorTypeLabel }}</span>
        <span v-if="degraded" class="error-tag degraded-tag">AI 暂不可用</span>
        <span v-if="cached" class="cache-badge">历史命中</span>
      </div>
      <div v-if="loading" class="tutor-loading">AI 正在分析中...</div>
      <div v-else class="tutor-body">{{ explanation }}</div>
      <div class="tutor-footer">
        <span v-if="tokensUsed && !degraded" class="tokens">耗 {{ tokensUsed }} tokens</span>
        <button @click="$emit('close')" class="btn-close">明白了</button>
      </div>
    </div>
  `,
  data() {
    return {
      explanation: '',
      errorType: '',
      errorTypeLabel: '',
      confidence: 0,
      cached: false,
      degraded: false,
      tokensUsed: 0,
      loading: false
    };
  },
  watch: {
    visible(v) { if (v && this.answerRecordId) this.fetchExplanation(); }
  },
  methods: {
    async fetchExplanation() {
      this.loading = true;
      this.resetState();
      try {
        const res = await fetch('/api/tutor/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerRecordId: this.answerRecordId })
        });
        const data = await res.json();
        this.explanation = data.explanation || '';
        this.errorType = data.errorType || '';
        this.errorTypeLabel = data.errorTypeLabel || '';
        this.confidence = data.confidence || 0;
        this.cached = data.cached || false;
        this.degraded = data.degraded || false;
        this.tokensUsed = data.tokensUsed || 0;
      } catch(e) {
        this.explanation = '请求 AI 辅导失败：' + e.message;
        this.degraded = true;
      } finally {
        this.loading = false;
      }
    },
    resetState() {
      this.explanation = '';
      this.errorType = '';
      this.errorTypeLabel = '';
      this.cached = false;
      this.degraded = false;
      this.tokensUsed = 0;
    }
  }
});
