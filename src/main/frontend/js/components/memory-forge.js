// memory-forge.js
const { defineComponent } = Vue;

export default defineComponent({
  template: `
    <div class="memory-forge">
      <div class="mf-header">
        <h3>记忆熔炉</h3>
        <div class="mf-stats" v-if="stats">
          <span class="mf-stat" :class="{due: stats.due > 0}">
            <b>{{ stats.due }}</b> 待复习
          </span>
          <span class="mf-stat"><b>{{ stats.learning }}</b> 学习中</span>
          <span class="mf-stat mastered"><b>{{ stats.mastered }}</b> 已掌握</span>
          <span class="mf-stat total">共 <b>{{ stats.total }}</b> 张</span>
        </div>
      </div>

      <div v-if="loading" class="mf-empty">加载中...</div>

      <div v-else-if="cards.length === 0" class="mf-empty">
        暂无记忆卡片，答题后会自动生成错题卡
      </div>

      <div v-else class="mf-card-grid">
        <div v-for="card in cards" :key="card.id"
             class="mf-card"
             :class="[card.state, { flipped: flippedId === card.id, due: isDue(card) }]">

          <div class="mf-card-face mf-front">
            <div class="mf-card-meta">
              <span class="mf-badge" :class="card.state">{{ stateText(card.state) }}</span>
              <span v-if="isDue(card)" class="mf-due-tag">到期</span>
              <span v-if="card.streak > 0" class="mf-streak">连对{{ card.streak }}</span>
            </div>
            <div class="mf-card-question" :title="card.question">{{ card.question }}</div>
            <div class="mf-card-footer">
              <span class="mf-next">下次: {{ formatDate(card.nextReviewAt) }}</span>
              <button @click="flip(card.id)" class="mf-flip-btn">查看答案</button>
            </div>
          </div>

          <div class="mf-card-face mf-back">
            <div class="mf-card-meta">
              <span class="mf-badge answer">答案</span>
              <span class="mf-correct-rate" v-if="card.correctCount + card.wrongCount > 0">
                {{ card.correctCount }}/{{ card.correctCount + card.wrongCount }} 正确
              </span>
            </div>
            <div class="mf-card-answer">{{ card.answer }}</div>
            <div class="mf-review-buttons">
              <button @click="review(card.id, 0)" class="mf-review-btn forget">忘记</button>
              <button @click="review(card.id, 2)" class="mf-review-btn fuzzy">模糊</button>
              <button @click="review(card.id, 3)" class="mf-review-btn remember">记得</button>
            </div>
            <button @click="flip(card.id)" class="mf-flip-btn mf-back-btn">返回</button>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      cards: [],
      stats: null,
      flippedId: null,
      loading: true
    };
  },
  mounted() { this.load(); },
  methods: {
    async load() {
      this.loading = true;
      try {
        const [cardsRes, statsRes] = await Promise.all([
          fetch('/api/memory/cards'),
          fetch('/api/memory/stats')
        ]);
        this.cards = cardsRes.ok ? await cardsRes.json() : [];
        this.stats = statsRes.ok ? await statsRes.json() : null;
      } catch(e) {
        console.error('记忆熔炉加载失败', e);
      } finally {
        this.loading = false;
      }
    },
    flip(id) {
      this.flippedId = this.flippedId === id ? null : id;
    },
    async review(cardId, quality) {
      try {
        await fetch('/api/memory/cards/' + cardId + '/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quality })
        });
        this.flippedId = null;
        await this.load();
      } catch(e) {
        alert('复习失败: ' + e.message);
      }
    },
    isDue(card) {
      if (!card.nextReviewAt) return true;
      return new Date(card.nextReviewAt) <= new Date();
    },
    stateText(state) {
      return { new: '新卡', learning: '学习中', mastered: '已掌握' }[state] || state;
    },
    formatDate(dt) {
      if (!dt) return '立即';
      const d = new Date(dt);
      const now = new Date();
      const diff = d - now;
      if (diff < 0) return '已到期';
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) return hours + '小时后';
      return Math.floor(hours / 24) + '天后';
    }
  }
});
