// app.js - Vue 3 application bootstrap
import QuizPage from './pages/quiz-page.js';
import DataPage from './pages/data-page.js';
import DashboardPage from './pages/dashboard-page.js';

const { createApp, defineComponent } = Vue;

const App = defineComponent({
  components: { QuizPage, DataPage, DashboardPage },
  data() {
    return {
      currentView: 'dashboard',
      gameState: { exp: 0, gold: 0, level: 1, title: '学徒', currentCombo: 0, maxCombo: 0, loginStreak: 0, achievements: [] },
    };
  },
  template: `
    <div id="app-root">
      <nav class="main-nav">
        <a href="#/dashboard" :class="{active: currentView==='dashboard'}">仪表盘</a>
        <a href="#/quiz" :class="{active: currentView==='quiz'}">刷题</a>
        <a href="#/data" :class="{active: currentView==='data'}">数据</a>
      </nav>
      <div id="game-hud" v-if="gameState">
        <span>Lv.{{ gameState.level }} {{ gameState.title }}</span>
        <span>经验 {{ gameState.exp }}</span>
        <span>金币 {{ gameState.gold }}</span>
        <span v-if="gameState.currentCombo >= 3"> {{ gameState.currentCombo }}连击</span>
        <span v-if="gameState.loginStreak">{{ gameState.loginStreak }}天连续</span>
      </div>
      <main id="page-container">
        <component :is="currentComponent" :gameState="gameState" @state-update="loadGameState"></component>
      </main>
    </div>
  `,
  computed: {
    currentComponent() {
      if (this.currentView === 'quiz') return 'quiz-page';
      if (this.currentView === 'data') return 'data-page';
      return 'dashboard-page';
    }
  },
  methods: {
    async loadGameState() {
      try {
        const res = await fetch('/api/game/state');
        if (res.ok) this.gameState = await res.json();
      } catch(e) {}
    },
    onHashChange() {
      const hash = window.location.hash.replace('#/', '') || 'dashboard';
      this.currentView = hash;
    }
  },
  async mounted() {
    await this.loadGameState();
    this.onHashChange();
    window.addEventListener('hashchange', () => this.onHashChange());
  }
});

createApp(App).mount('#app');
