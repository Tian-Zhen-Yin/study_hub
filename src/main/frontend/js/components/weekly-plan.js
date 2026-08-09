// weekly-plan.js
const { defineComponent } = Vue;

export default defineComponent({
  props: {
    weekNum: { type: Number, default: null }
  },
  template: `
    <div class="weekly-plan">
      <div class="plan-header">
        <h3>本周学习计划</h3>
        <button @click="generate" class="action-btn primary" :disabled="loading">
          {{ loading ? 'AI 规划生成中...' : '生成 AI 周计划' }}
        </button>
      </div>

      <div v-if="degraded" class="plan-hint">{{ message }}</div>

      <div v-if="!degraded && (planItems.length || tasks.length)" class="plan-summary">
        <div class="summary-item">
          <span class="summary-num">{{ tasks.length }}</span>
          <span class="summary-label">总任务</span>
        </div>
        <div class="summary-item">
          <span class="summary-num done">{{ completedCount }}</span>
          <span class="summary-label">已完成</span>
        </div>
        <div class="summary-item">
          <span class="summary-num">{{ totalMinutes >= 60 ? Math.floor(totalMinutes/60) + 'h' : totalMinutes + 'm' }}</span>
          <span class="summary-label">总时长</span>
        </div>
        <div class="summary-item" v-if="avgAccuracy !== null">
          <span class="summary-num" :class="accuracyLevelClass(avgAccuracy)">{{ Math.round(avgAccuracy * 100) }}%</span>
          <span class="summary-label">平均正确率</span>
        </div>
      </div>

      <div v-if="planItems.length" class="plan-blocks">
        <div v-for="(item, idx) in sortedPlanItems" :key="item.domainId"
             class="plan-block" :class="accuracyLevelClass(item.accuracy)">
          <div v-if="idx === 0 && item.accuracy < 0.5" class="priority-corner">重点攻克</div>

          <div class="block-header">
            <span class="domain-badge">{{ item.domainName }}</span>
            <span v-if="item.accuracy !== undefined && item.errorCount > 0" class="accuracy-badge" :class="accuracyLevelClass(item.accuracy)">
              {{ Math.round(item.accuracy * 100) }}%
              <span class="accuracy-sub">{{ accuracyLevelText(item.accuracy) }}</span>
            </span>
            <span v-if="item.errorCount > 0" class="error-warn">⚠ 错{{ item.errorCount }}题</span>
            <span class="time-tag">{{ item.estimatedMinutes }}分钟</span>
          </div>

          <div class="block-focus">
            <span class="focus-icon">🎯</span>
            <span class="focus-text">{{ item.focus }}</span>
          </div>
          <div class="block-reason">{{ item.reason }}</div>

          <div class="block-progress" v-if="matchingTasks(item.domainId).length">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: domainProgress(item.domainId) + '%' }"></div>
            </div>
            <span class="progress-text">{{ domainCompleted(item.domainId) }}/{{ matchingTasks(item.domainId).length }} 完成</span>
          </div>

          <ul class="block-tasks">
            <li v-for="task in matchingTasks(item.domainId)" :key="task.id" class="task-item" :class="{done: task.done}">
              <label>
                <input type="checkbox" :checked="task.done" @change="toggleTask(task.id)" />
                <span class="task-text">{{ task.text }}</span>
                <span v-if="task.estimatedMinutes" class="task-time">{{ task.estimatedMinutes }}min</span>
              </label>
            </li>
          </ul>
        </div>
      </div>

      <div v-else-if="tasks.length" class="plan-tasks">
        <div v-for="task in tasks" :key="task.id" class="task-item" :class="{done: task.done}">
          <label>
            <input type="checkbox" :checked="task.done" @change="toggleTask(task.id)" />
            <span class="task-text">{{ task.text }}</span>
            <span v-if="task.focus" class="task-focus">{{ task.focus }}</span>
            <span v-if="task.estimatedMinutes" class="task-time">{{ task.estimatedMinutes }}min</span>
          </label>
        </div>
      </div>

      <div v-if="totalMinutes > 0 && !degraded" class="plan-footer">
        本周预估总时长: {{ Math.floor(totalMinutes/60) }}小时{{ totalMinutes%60 }}分钟
        <span v-if="tokensUsed"> | 本次规划耗 {{ tokensUsed }} tokens</span>
        <span v-if="weekNum"> | 第 {{ weekNum }} 周</span>
      </div>
    </div>
  `,
  data() {
    return {
      planItems: [],
      tasks: [],
      totalMinutes: 0,
      tokensUsed: 0,
      degraded: false,
      message: '',
      loading: false
    };
  },
  computed: {
    completedCount() {
      return this.tasks.filter(t => t.done).length;
    },
    avgAccuracy() {
      const itemsWithAccuracy = this.planItems.filter(i => i.accuracy !== undefined && i.accuracy !== null);
      if (itemsWithAccuracy.length === 0) return null;
      const sum = itemsWithAccuracy.reduce((s, i) => s + i.accuracy, 0);
      return sum / itemsWithAccuracy.length;
    },
    sortedPlanItems() {
      return [...this.planItems].sort((a, b) => {
        const accA = a.accuracy !== undefined ? a.accuracy : 1;
        const accB = b.accuracy !== undefined ? b.accuracy : 1;
        return accA - accB;
      });
    }
  },
  mounted() { this.loadCurrent(); },
  methods: {
    accuracyLevelClass(acc) {
      if (acc === undefined || acc === null) return '';
      if (acc < 0.3) return 'critical';
      if (acc < 0.5) return 'weak';
      if (acc < 0.7) return 'caution';
      return 'ok';
    },
    accuracyLevelText(acc) {
      if (acc < 0.3) return '极薄弱';
      if (acc < 0.5) return '偏弱';
      if (acc < 0.7) return '一般';
      return '尚可';
    },
    domainCompleted(domainId) {
      return this.matchingTasks(domainId).filter(t => t.done).length;
    },
    domainProgress(domainId) {
      const list = this.matchingTasks(domainId);
      if (list.length === 0) return 0;
      return Math.round(this.domainCompleted(domainId) / list.length * 100);
    },
    async loadCurrent() {
      try {
        const res = await fetch('/api/plan/current');
        const data = await res.json();
        this.applyData(data);
      } catch(e) { this.degraded = true; this.message = '加载失败'; }
    },
    async generate() {
      this.loading = true;
      try {
        const res = await fetch('/api/plan/generate', { method: 'POST' });
        const data = await res.json();
        this.applyData(data);
      } catch(e) { this.degraded = true; this.message = '生成失败: ' + e.message; }
      finally { this.loading = false; }
    },
    async toggleTask(id) {
      try {
        const res = await fetch('/api/plan/task/' + id + '/toggle', { method: 'PATCH' });
        const updated = await res.json();
        const t = this.tasks.find(t => t.id === id);
        if (t) t.done = updated.done;
      } catch(e) {}
    },
    applyData(data) {
      this.planItems = data.planItems || [];
      this.tasks = data.tasks || [];
      this.totalMinutes = data.totalEstimatedMinutes || 0;
      this.tokensUsed = data.tokensUsed || 0;
      this.degraded = data.degraded || false;
      this.message = data.message || '';
    },
    matchingTasks(domainId) {
      return this.tasks.filter(t => t.domainId === domainId);
    }
  }
});
