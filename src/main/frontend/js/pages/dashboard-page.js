// dashboard-page.js
import WeeklyPlan from '../components/weekly-plan.js';
import MemoryForge from '../components/memory-forge.js';
import FiveElementsChart from '../components/five-elements-chart.js';
import { api } from '../api.js';

const { defineComponent } = Vue;

export default defineComponent({
  components: { WeeklyPlan, MemoryForge, FiveElementsChart },
  props: { gameState: Object },
  emits: ['state-update'],
  data() {
    return {
      fiveElementsProfile: null
    };
  },
  async mounted() {
    await this.loadFiveElements();
  },
  methods: {
    async loadFiveElements() {
      try {
        this.fiveElementsProfile = await api.getFiveElementsProfile();
      } catch(e) {
        console.error('Failed to load five elements profile', e);
      }
    }
  },
  template: `
    <div class="dashboard-page">
      <h2>仪表盘</h2>
      <div class="game-hud" v-if="gameState">
        <span>Lv.{{ gameState.level }} {{ gameState.title }}</span>
        <span>经验 {{ gameState.exp }}</span>
        <span>金币 {{ gameState.gold }}</span>
        <span>连续 {{ gameState.loginStreak }} 天</span>
      </div>
      <div class="quick-nav">
        <a href="#/quiz"><button class="action-btn primary">开始刷题</button></a>
        <a href="#/data"><button class="action-btn">数据与诊断</button></a>
      </div>
      <five-elements-chart :profile="fiveElementsProfile" />
      <memory-forge />
      <weekly-plan />
    </div>
  `
});
