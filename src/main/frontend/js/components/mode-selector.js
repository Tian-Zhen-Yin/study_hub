// mode-selector.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { modelValue: String, gameState: Object },
  emits: ['update:modelValue', 'start'],
  data() {
    return { selectedMode: this.modelValue, selectedDomain: null, count: 20, domains: [] };
  },
  template: `
    <div class="mode-selector">
      <div class="mode-buttons">
        <button v-for="m in modes" :key="m.key" @click="selectMode(m.key)"
          :class="{ active: selectedMode === m.key }" class="mode-btn">
          <b>{{ m.label }}</b><span>{{ m.desc }}</span>
        </button>
      </div>
      <div class="mode-filters" v-if="needsDomain">
        <select v-model="selectedDomain">
          <option :value="null">全部模块</option>
          <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <input type="number" v-model.number="count" min="5" max="100" />
        <button @click="start" class="start-btn">开始</button>
      </div>
    </div>
  `,
  computed: {
    modes() {
      return [
        { key: 'continue', label: '继续练习', desc: '接着上次位置' },
        { key: 'review', label: '记忆复习', desc: '到期卡片优先' },
        { key: 'special', label: '章节练习', desc: '按模块刷题' },
        { key: 'exam', label: '真题套卷', desc: '按年份刷题' },
        { key: 'wrong', label: '错题重刷', desc: '只看错题' },
        { key: 'favorite', label: '收藏题', desc: '只看收藏题' },
        { key: 'browse', label: '题库浏览', desc: '自由浏览' },
      ];
    },
    needsDomain() {
      return ['special', 'exam'].includes(this.selectedMode);
    }
  },
  methods: {
    selectMode(m) {
      this.selectedMode = m;
      this.$emit('update:modelValue', m);
      if (!this.needsDomain) this.start();
    },
    start() {
      this.$emit('start', { mode: this.selectedMode, domainId: this.selectedDomain, count: this.count });
    }
  },
  async mounted() {
    try {
      const res = await fetch('/api/questions/modules');
      if (res.ok) this.domains = await res.json();
    } catch(e) {}
  }
});
