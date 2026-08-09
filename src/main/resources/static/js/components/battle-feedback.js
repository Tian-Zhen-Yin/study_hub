// battle-feedback.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { result: Object, show: Boolean },
  template: `
    <transition name="battle-pop">
      <div v-if="show && result" class="battle-feedback" :class="result.correct ? 'win' : 'lose'">
        <div class="battle-main">
          <span class="battle-icon">{{ result.correct ? '命中' : '未中' }}</span>
          <span class="battle-text">{{ result.correct ? '答对了！' : '答错了！' }}</span>
        </div>
        <div class="battle-details" v-if="result.game">
          <span v-if="result.game.combo >= 3" class="combo-text">{{ result.game.combo }} 连击！</span>
          <span v-if="result.game.levelUp" class="levelup-text">升级！{{ result.game.newTitle }}</span>
          <span v-if="result.game.achievementUnlocked" class="achieve-text">解锁成就：{{ result.game.achievementUnlocked }}</span>
        </div>
      </div>
    </transition>
  `
});
