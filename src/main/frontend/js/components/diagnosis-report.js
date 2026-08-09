// diagnosis-report.js
const { defineComponent } = Vue;

export default defineComponent({
  props: {
    report: { type: Object, default: null }
  },
  template: `
    <div class="diagnosis-report" v-if="report">
      <div class="report-section">
        <h3>学习者画像</h3>
        <div class="profile-grid" v-if="report.learnerProfile">
          <div class="profile-item"><span class="label">等级</span><span class="value">Lv.{{ report.learnerProfile.level }} {{ report.learnerProfile.title }}</span></div>
          <div class="profile-item"><span class="label">累计题数</span><span class="value">{{ report.learnerProfile.totalAnswered }}</span></div>
          <div class="profile-item"><span class="label">正确率</span><span class="value">{{ Math.round(report.learnerProfile.overallAccuracy * 100) }}%</span></div>
          <div class="profile-item"><span class="label">连续学习</span><span class="value">{{ report.learnerProfile.loginStreak }} 天</span></div>
          <div class="profile-summary" v-if="report.learnerProfile.summary">{{ report.learnerProfile.summary }}</div>
        </div>
      </div>

      <div class="report-section">
        <h3>薄弱知识域</h3>
        <div v-if="report.weakDomains && report.weakDomains.length" class="weak-domains">
          <div v-for="d in report.weakDomains" :key="d.domainId" class="weak-domain-bar">
            <span class="domain-name">{{ d.domainName }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: Math.round(d.accuracy * 100) + '%' }" :class="accuracyClass(d.accuracy)"></div>
            </div>
            <span class="domain-stat">{{ Math.round(d.accuracy * 100) }}% (错{{ d.errorCount }}题)</span>
          </div>
        </div>
        <div v-else class="empty-hint">暂无薄弱域，继续保持！</div>
      </div>

      <div class="report-section">
        <h3>错因分布</h3>
        <div v-if="report.errorDistribution" class="error-dist">
          <div v-for="(ratio, type) in report.errorDistribution" :key="type" class="dist-item">
            <span class="dist-label" :class="type">{{ errorLabel(type) }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: Math.round(ratio * 100) + '%' }" :class="type"></div>
            </div>
            <span class="dist-ratio">{{ Math.round(ratio * 100) }}%</span>
          </div>
        </div>
        <div v-else class="empty-hint">暂无错因数据</div>
      </div>

      <div class="report-section">
        <h3>本周建议</h3>
        <div class="weekly-advice">{{ report.weeklyAdvice }}</div>
      </div>

      <div class="report-footer" v-if="report.tokensUsed">
        <span>本次诊断消耗 {{ report.tokensUsed }} tokens</span>
        <span v-if="report.triggerType === 'auto'">（每周自动生成）</span>
        <span v-else>（手动生成）</span>
      </div>
    </div>
  `,
  methods: {
    accuracyClass(acc) {
      if (acc < 0.5) return 'critical';
      if (acc < 0.7) return 'warning';
      return 'ok';
    },
    errorLabel(type) {
      const map = {
        CONCEPT_MISS: '概念不会',
        MISREAD: '审题失误',
        MEMORY_CONFUSE: '记忆混淆',
        CALC_ERROR: '计算错误'
      };
      return map[type] || type;
    }
  }
});
