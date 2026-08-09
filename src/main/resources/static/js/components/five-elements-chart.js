// five-elements-chart.js - 阴阳五合雷达图组件
const { defineComponent } = Vue;

export default defineComponent({
  props: {
    profile: { type: Object, default: null }
  },
  setup(props) {
    const canvasRef = Vue.ref(null);

    function drawRadar() {
      const canvas = canvasRef.value;
      if (!canvas || !props.profile) return;
      const ctx = canvas.getContext('2d');
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxRadius = Math.min(cx, cy) - 50;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dims = [
        { key: 'metal',  label: '金·精准', value: props.profile.metal?.value ?? 0.5 },
        { key: 'wood',   label: '木·成长', value: props.profile.wood?.value ?? 0.5 },
        { key: 'water',  label: '水·流畅', value: props.profile.water?.value ?? 0.5 },
        { key: 'fire',   label: '火·热情', value: props.profile.fire?.value ?? 0.5 },
        { key: 'earth',  label: '土·稳固', value: props.profile.earth?.value ?? 0.5 }
      ];

      const n = dims.length;
      const angleStep = (Math.PI * 2) / n;
      const startAngle = -Math.PI / 2;

      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      for (let level = 1; level <= 5; level++) {
        const r = (maxRadius * level) / 5;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const angle = startAngle + i * angleStep;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = '#e0e0e0';
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + maxRadius * Math.cos(angle), cy + maxRadius * Math.sin(angle));
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(124, 58, 237, 0.2)';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const angle = startAngle + idx * angleStep;
        const r = maxRadius * dims[idx].value;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#7c3aed';
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const r = maxRadius * dims[i].value;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#333';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const labelR = maxRadius + 25;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        ctx.fillText(dims[i].label, x, y);
        ctx.fillStyle = '#999';
        ctx.font = '11px sans-serif';
        const valR = maxRadius + 42;
        const vx = cx + valR * Math.cos(angle);
        const vy = cy + valR * Math.sin(angle);
        ctx.fillText(dims[i].value.toFixed(3), vx, vy);
        ctx.fillStyle = '#333';
        ctx.font = '13px sans-serif';
      }

      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      for (let level = 1; level <= 5; level++) {
        const r = (maxRadius * level) / 5;
        ctx.fillText((level * 0.2).toFixed(1), cx + 4, cy - r - 2);
      }
    }

    Vue.watch(() => props.profile, drawRadar, { deep: true });
    Vue.onMounted(drawRadar);

    return { canvasRef };
  },
  template: `
    <div class="five-elements-chart">
      <h3>阴阳五合画像</h3>
      <div class="radar-container" v-if="profile">
        <canvas ref="canvasRef" width="320" height="320"></canvas>
      </div>
      <div class="loading" v-else>
        <p>加载中...</p>
      </div>
      <div class="balance-info" v-if="profile">
        <div class="balance-score">
          <span class="label">平衡度</span>
          <span class="value" :class="balanceClass">
            {{ (profile.balanceScore * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="crisis-warn" v-if="profile.crisisDimension">
          <span>⚠ {{ crisisLabel }} 需要加强</span>
        </div>
        <div class="stats-row">
          <span>累计 {{ profile.totalRounds }} 题</span>
          <span>正确率 {{ (profile.accuracy * 100).toFixed(1) }}%</span>
          <span>连击 {{ profile.currentStreak }}</span>
        </div>
      </div>
    </div>
  `,
  computed: {
    balanceClass() {
      if (!this.profile) return '';
      const b = this.profile.balanceScore;
      if (b >= 0.8) return 'good';
      if (b >= 0.6) return 'ok';
      return 'warn';
    },
    crisisLabel() {
      const map = {
        metal: '金(精准度)', wood: '木(成长性)', water: '水(流畅度)',
        fire: '火(热情度)', earth: '土(稳固度)'
      };
      return map[this.profile?.crisisDimension] || '';
    }
  }
});
