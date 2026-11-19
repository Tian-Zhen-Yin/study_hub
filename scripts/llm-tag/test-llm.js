// 临时连通性测试: glm-5.3-flash
const fs = require('fs');
const key = fs.readFileSync(require('path').join(__dirname, '.key'), 'utf8').trim();

fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'glm-5.3-flash',
    messages: [{ role: 'user', content: '请用JSON回复：{"ok":true,"model":"你的模型名"}' }],
    temperature: 0.1
  })
}).then(r => r.json()).then(j => {
  console.log('content:', j.choices?.[0]?.message?.content);
  console.log('usage:', JSON.stringify(j.usage));
}).catch(e => { console.error('FAIL:', e.message); process.exit(1); });
