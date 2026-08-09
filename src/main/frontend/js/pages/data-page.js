// data-page.js
import DiagnosisReport from '../components/diagnosis-report.js';

const { defineComponent } = Vue;

export default defineComponent({
  components: { DiagnosisReport },
  props: { gameState: Object },
  data() {
    return {
      previewData: null,
      importSummary: null,
      diagnosis: null,
      diagnosisLoading: false
    };
  },
  template: `
    <div class="data-page">
      <h2>数据管理</h2>

      <div class="card game-stats">
        <div class="card-header">游戏统计</div>
        <div class="stats-grid">
          <div class="stat-item"><span class="stat-label">等级</span><span class="stat-value">Lv.{{ gameState.level }} {{ gameState.title }}</span></div>
          <div class="stat-item"><span class="stat-label">经验</span><span class="stat-value">{{ gameState.exp }}</span></div>
          <div class="stat-item"><span class="stat-label">金币</span><span class="stat-value">{{ gameState.gold }}</span></div>
          <div class="stat-item"><span class="stat-label">最高连击</span><span class="stat-value">{{ gameState.maxCombo }}</span></div>
          <div class="stat-item"><span class="stat-label">连续登录</span><span class="stat-value">{{ gameState.loginStreak }}d</span></div>
        </div>
        <div class="achievement-wall" v-if="gameState.achievements && gameState.achievements.length">
          <div class="card-header">成就 ({{ gameState.achievements.length }})</div>
          <div class="achievement-list">
            <span v-for="a in gameState.achievements" :key="a" class="achievement-badge">* {{ a }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">导出进度</div>
        <button @click="exportProgress" class="action-btn">下载 ruankao-progress.json</button>
      </div>

      <div class="card">
        <div class="card-header">导入进度</div>
        <input type="file" ref="fileInput" @change="onFileSelected" accept=".json" />
        <div v-if="importSummary" class="import-preview">
          <p><b>{{ importSummary.attempts }}</b> 条作答， <b>{{ importSummary.answeredQuestions }}</b> 项目， <b>{{ importSummary.wrong }}</b> 错题， <b>{{ importSummary.bookmarks }}</b> 收藏</p>
          <button @click="applyImport" class="action-btn primary">确认导入</button>
          <button @click="cancelImport">取消</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">AI 深度诊断</div>
        <button @click="generateDiagnosis" class="action-btn primary" :disabled="diagnosisLoading">
          {{ diagnosisLoading ? 'AI 诊断生成中...' : '生成深度诊断报告' }}
        </button>
        <button @click="loadLatestDiagnosis" class="action-btn">查看最近诊断</button>
        <div v-if="diagnosis && diagnosis.degraded" class="diagnosis-hint">{{ diagnosis.message }}</div>
        <diagnosis-report v-if="diagnosis && !diagnosis.degraded" :report="diagnosis" />
      </div>
    </div>
  `,
  methods: {
    async exportProgress() {
      const res = await fetch('/api/progress/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      this.download(blob, 'ruankao-progress.json');
    },
    async onFileSelected(e) {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      this.previewData = JSON.parse(text);
      const res = await fetch('/api/progress/import/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.previewData)
      });
      this.importSummary = await res.json();
    },
    async applyImport() {
      const res = await fetch('/api/progress/import/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.previewData)
      });
      const result = await res.json();
      alert('导入完成：' + JSON.stringify(result));
      this.importSummary = null;
      this.previewData = null;
    },
    cancelImport() { this.importSummary = null; this.previewData = null; },
    async generateDiagnosis() {
      this.diagnosisLoading = true;
      this.diagnosis = null;
      try {
        const res = await fetch('/api/diagnosis/generate', { method: 'POST' });
        this.diagnosis = await res.json();
      } catch(e) {
        this.diagnosis = { degraded: true, message: '请求失败：' + e.message };
      } finally {
        this.diagnosisLoading = false;
      }
    },
    async loadLatestDiagnosis() {
      try {
        const res = await fetch('/api/diagnosis/latest');
        this.diagnosis = await res.json();
      } catch(e) {
        this.diagnosis = { degraded: true, message: '请求失败：' + e.message };
      }
    },
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  }
});
