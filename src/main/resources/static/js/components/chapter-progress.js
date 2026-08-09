// chapter-progress.js
const { defineComponent } = Vue;

export default defineComponent({
  props: { domainId: Number },
  data() { return { stats: null, open: false }; },
  template: `
    <div class="chapter-progress">
      <div class="cp-header" @click="open = !open">
        {{ open ? 'v' : '>' }} 章节进度
      </div>
      <div v-if="open && stats" class="cp-body">
        <div v-for="(v, k) in stats" :key="k" class="cp-row">
          <span class="cp-key">{{ k }}</span>
          <span class="cp-val">{{ v }}</span>
        </div>
      </div>
    </div>
  `,
  async mounted() {
    try {
      const res = await fetch('/api/memory/stats');
      if (res.ok) this.stats = await res.json();
    } catch(e) {}
  }
});
