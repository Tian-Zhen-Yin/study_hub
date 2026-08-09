// game-hud.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { state: Object },
  template: `
    <div class="game-hud" v-if="state">
      <div class="hud-left">
        <span class="hud-badge">Lv.{{ state.level }}</span>
        <span class="hud-title">{{ state.title }}</span>
        <div class="hud-exp-bar">
          <div class="hud-exp-fill" :style="{ width: expPercent + '%' }"></div>
        </div>
      </div>
      <div class="hud-right">
        <span class="hud-gold">{{ state.gold }}</span>
        <span class="hud-combo" v-if="state.currentCombo >= 3">{{ state.currentCombo }}连击</span>
        <span class="hud-streak">{{ state.loginStreak }}天</span>
      </div>
    </div>
  `,
  computed: {
    expPercent() {
      const levels = [0, 100, 500, 1000, 2500, 5000, 10000];
      const i = Math.min(this.state.level - 1, levels.length - 1);
      const cur = levels[i] || 0;
      const next = levels[i + 1] || (cur + 1);
      return Math.min(100, ((this.state.exp - cur) / (next - cur)) * 100);
    }
  }
});
