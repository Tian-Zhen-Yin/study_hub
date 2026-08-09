// bookmark-button.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { questionId: Number, bookmarked: Boolean },
  emits: ['toggle'],
  template: `
    <button class="bookmark-btn" :class="{ active: bookmarked }" @click="$emit('toggle')">
      {{ bookmarked ? '已收藏' : '收藏本题' }}
    </button>
  `
});
