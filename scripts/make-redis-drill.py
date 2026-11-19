# 生成 data/redis-drill.html —— Redis 五年真题集训页
# 数据源: extracted_pdf/yuce202610/redis_past.json (题库五年真题) + 文老师试题六要点(转录)
# 用法: python scripts/make-redis-drill.py
import json
import re
import html as H

SRC = r'E:\AiProject\study_hub\extracted_pdf\yuce202610\redis_past.json'
DST = r'E:\AiProject\study_hub\data\redis-drill.html'

EXAMS = json.load(open(SRC, encoding='utf-8'))
BY = {(e['date'], e['sort']): e for e in EXAMS}


def rich(t):
    """子问/答案文本 → 安全 HTML: 已含标签原样, 纯文本转义换行, [图:]占位与外链图渲染"""
    if not t:
        return ''
    t = t.replace('\r', '')
    # ![url] markdown 图 → img(加载失败隐藏)
    t = re.sub(r'!\[(.*?)\]\((\S+?)\)', lambda m: img(m.group(2)), t)
    t = re.sub(r'!\[(https?://\S+?)\]', lambda m: img(m.group(1)), t)
    # 【图: /uploads/x】占位 → img
    t = re.sub(r'【图[:：]\s*([^\u3011\s]+)\u3011', lambda m: img(m.group(1)), t)
    if '<' in t and '>' in t:
        return t
    return H.escape(t).replace('\n', '<br>')


def img(url):
    return ('<div style="text-align:center;margin:8px 0"><img src="%s" loading="lazy" '
            'style="max-width:100%%;max-height:420px;border-radius:8px;border:1px solid var(--line)" '
            'onerror="this.parentNode.style.display=\'none\'"></div>' % url)


# ---------- 考点分组 ----------
G = []
def grp(id_, name, full, pr, note):
    G.append({'id': id_, 'name': name, 'full': full, 'pr': pr, 'note': note, 'exams': []})

grp('g1', '击穿·两方案', '缓存击穿：互斥锁 vs 逻辑过期', 1,
    '2025-11 原题(25分)。判据：击穿=热点Key失效瞬间并发打到库；对策两路线+五维对比。')
grp('g2', '旁路缓存', 'Cache-Aside 读写流程与一致性', 1,
    '2024-11 原题。读5步/写2步要能默画；多线程不一致=写慢读快窗口，解法≥3。')
grp('g3', '主从·持久化', '主从复制全量/增量 + RDB/AOF', 1,
    '2025-05 原题。PSYNC/BGSAVE/backlog 指令流程填图 + 两种持久化优缺点。')
grp('g4', '并发·锁', '悲观/乐观/分布式锁 + zset', 2,
    '2026-05 原题 + 2024-05 原题。锁分类、死锁场景、秒杀 zset 指令。')
grp('g5', '预测候选', '未考轮换点：穿透/布隆/淘汰/丢数据', 2,
    '文老师试题六押题范围。五年轮换没出过的：哨兵转移、Cluster、淘汰八种、布隆。')

# 真题挂到组
G[0]['exams'].append(BY[('2025-11', 3)])
G[1]['exams'].append(BY[('2024-11', 2)])
G[2]['exams'].append(BY[('2025-05', 3)])
G[3]['exams'].append(BY[('2026-05', 5)])
G[3]['exams'].append(BY[('2024-05', 4)])

# 文老师预测补充(组内附卡)
G[0]['extra'] = {'t': '文老师押题要点：击穿两方案优缺点',
  'q': '互斥锁：未命中先抢分布式锁，抢到者查库重建，其余等待重查。优=强一致防击穿；缺=锁竞争延迟、需处理锁超时死锁。<br>逻辑过期：不设物理TTL，加逻辑过期字段；过期后请求触发异步更新但立即返回旧数据。优=快吞吐高；缺=弱一致读旧数据。<br>选型：一致性高(库存扣减)用锁；容忍短暂不一致求高并发(详情页)用逻辑过期。'}
G[4]['extra'] = {'t': '文老师押题要点：穿透布隆 + 淘汰策略 + 丢数据防护',
  'q': '布隆：二进制向量+多哈希；合法ID先置1；查询任一位为0→<b>一定不存在</b>直接返回，源头拦截恶意查不存在ID；全1仅可能存在(误判率&lt;1%)。<br>删除失效：定期删除没删到+此后无人访问(惰性未触发)→Key长期占内存，堆积致内存飙升。<br>淘汰八种：noeviction(不淘汰,写报错)；已设过期集合内：volatile-lru / volatile-lfu / volatile-ttl(剩余生存最短) / volatile-random；全库：allkeys-lru / allkeys-lfu / allkeys-random。（文老师卷按旧教材口径答六条：去掉两个 lfu 即可）<br>主从丢数据：复制异步，主写成功即返回不等从确认；防护=min-replicas-to-write+max-lag、关键数据同步等从确认、Cluster多副本、定期对账。'}

# ---------- 第 7 组：首考候选（历史从未考的轮换点，对账2018-2026全部架构师真题） ----------
CAND = [
 ('g7-c1', '哨兵模式与故障转移流程（宝典标超级重点）',
  '哨兵三职责：<b>监控</b>(持续ping主从)、<b>选主</b>(判定下线并主持转移)、<b>通知</b>(客户端与其他哨兵)。<br>'
  '主观下线：单个哨兵在 down-after-milliseconds 内未收到主库响应→初判下线。<br>'
  '客观下线：判主观下线的哨兵数 ≥ <b>quorum(法定票数)</b>→确认客观下线。<br>'
  '<b>转移流程：</b>①在线哨兵竞选领头（Raft思路：先到先得拉票，需过半+1）②领头从从库中选新主：过滤断连久的从库→按 replica-priority 优先级→<b>复制偏移量 offset 最大</b>(数据最全)→runid 字典序最小 ③其余从库改 replicaof 指向新主 ④旧主恢复后降级为从库 ⑤通知客户端并更新配置。<br>'
  '与Cluster区别：哨兵=只做高可用不分片(容量受单机限制)；Cluster=分片+高可用去中心化。'),
 ('g7-c2', '缓存雪崩（三件套唯一未单独考）',
  '定义：大量key<b>同一时刻集体失效</b>(统一TTL到期/缓存服务宕机)→请求全量打到数据库压垮系统。与击穿区别：击穿=单个热点key失效；雪崩=大面积同时失效。<br>'
  '<b>三层对策话术：</b>①预防：TTL加随机值打散过期(基础值+随机)；热点数据不过期或逻辑过期+异步更新 ②高可用：Redis主从+哨兵/Cluster集群，避免缓存整体宕机 ③兜底：多级缓存(本地Caffeine+Redis)、网关/Sentinel限流降级熔断、DB连接池上限保护。'),
 ('g7-c3', 'Redis 事务（宝典标超级重点）',
  '四命令：<b>MULTI</b>开队→命令入队(返回QUEUED)→<b>EXEC</b>原子执行；<b>DISCARD</b>放弃；<b>WATCH</b>乐观锁(被监视key在EXEC前被改→事务失败返回nil，客户端重试=CAS)。<br>'
  '关键特性：①入队阶段语法错误→整个事务放弃 ②执行阶段运行时错误(如对String用LPUSH)→<b>其余命令照常执行，不回滚</b>(与关系库事务最大区别) ③官方不回滚理由：错误仅由编程错误引起，回滚不能挽救，保持简单高效。<br>'
  '原子性替代：WATCH+重试=乐观锁；Lua脚本单线程整体原子执行。'),
 ('g7-c4', '热 Key 与大 Key',
  '<b>热Key</b>：单key访问量极端集中(爆款商品)→单分片CPU/带宽打满、集群负载不均。发现：redis-cli --hotkeys、代理层统计。解法：本地缓存多级化(Caffeine+Redis)、key加随机后缀打散成多副本随机读、读写分离由从库承载、限流。<br>'
  '<b>大Key</b>：value过大(String&gt;1MB或集合元素过万)→慢查询阻塞单线程、网络拥塞、删除卡顿。发现：redis-cli --bigkeys、RDB离线分析。解法：按业务拆分多key/hash分桶、压缩(gzip/snappy)、<b>UNLINK异步删除</b>代替DEL、过期时间打散。'),
 ('g7-c5', 'Cluster 架构（只考过分片算法，模式本身未考）',
  '定位：分片+高可用一体，<b>去中心化</b>(无哨兵节点)，每个主节点带从节点。<br>'
  '<b>16384哈希槽</b>：slot = CRC16(key) mod 16384；槽位分配到各主节点；客户端直连任意节点，key不属该节点返回<b>MOVED重定向</b>(智能客户端缓存槽映射表)；迁移期间用ASK临时重定向。<br>'
  '<b>gossip协议</b>：节点间PING/PONG传播集群状态(对比哨兵的集中式监控)。<br>'
  '故障转移：主节点被<b>半数以上主节点</b>判定下线→其从库发起选举当新主。扩容：resharding迁槽+迁移数据。<br>'
  '局限：多key操作/事务受跨槽限制，客户端更复杂。'),
]
G.append({'id': 'g7', 'name': '首考候选', 'full': '历史从未考的轮换点：哨兵/雪崩/事务/热大Key/Cluster', 'pr': 1, 'note':
    '对账2018-2026全部架构师真题的结论：这五个点从未考过（哨兵仅18年概念带过、Cluster只考过分片算法2022）。按子专题轮换规律，它们是2026-10新增量概率最大的方向。',
    'exams': [], 'cards': [{'id': i, 't': t, 'q': q} for i, t, q in CAND]})

# 默画自查组(图+步骤)
G.append({'id': 'g6', 'name': '默画自查', 'full': '四张填图默画（先画再对答案）', 'pr': 1, 'note':
    '五年三场考填图。打开图→自己默写步骤→展开核对。', 'exams': []})
draws = [
    ('d1', '旁路缓存·读流程(5步)', BY[('2024-11', 2)]['subs'][0]),
    ('d2', '主从·全量同步(指令)', BY[('2025-05', 3)]['subs'][0]),
    ('d3', '主从·增量同步(指令)', BY[('2025-05', 3)]['subs'][1]),
    ('d4', '互斥锁查询序列', BY[('2025-11', 3)]['subs'][0]),
    ('d5', '逻辑过期查询序列', BY[('2025-11', 3)]['subs'][1]),
]
G6 = next(g for g in G if g['id'] == 'g6')
G6['draws'] = [{'id': i, 't': t, 'q': rich(s.get('q', '')), 'a': rich(s.get('answer', ''))} for i, t, s in draws]

# 序列化(答案预渲染HTML)
for g in G:
    for e in g.get('exams', []):
        e['stemH'] = rich(e['stem'])
        for s in e['subs']:
            s['qH'] = rich(s.get('q', ''))
            s['aH'] = rich(s.get('answer', ''))
    if 'extra' in g:
        g['extra']['qH'] = g['extra']['q']
DATA = json.dumps(G, ensure_ascii=False)

PAGE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>集训·Redis 五年真题（2024-05→2026-05）</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#222;--sub:#777;--line:#e3e5e9;--acc:#dc2626;--ok:#16a34a;--p1:#dc2626;--p2:#d97706}
html.dark{--bg:#111418;--card:#1b1f24;--ink:#d8dce1;--sub:#8a919a;--line:#2a2f36;--acc:#f87171;--ok:#34d399;--p1:#f87171;--p2:#fbbf24}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.75 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding-bottom:44px}
header{position:sticky;top:0;z-index:9;background:var(--card);border-bottom:1px solid var(--line);padding:8px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
header b{font-size:1.02em}
.cd{font-size:.82em;color:var(--sub)}
.hbtn{background:var(--bg);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:3px 9px;font-size:.85em;text-decoration:none;cursor:pointer}
.hbtn:hover{border-color:var(--acc);color:var(--acc)}
.hbtn.on{background:var(--acc);border-color:var(--acc);color:#fff}
#search{background:var(--bg);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:4px 9px;font-size:.9em;width:150px}
#hitinfo{font-size:.8em;color:var(--sub)}
nav{display:flex;gap:6px;padding:10px 12px 0;flex-wrap:wrap}
nav button{padding:7px 10px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px 10px 0 0;font-size:.9em;cursor:pointer;white-space:nowrap}
nav button.on{border-bottom:2px solid var(--acc);color:var(--acc);font-weight:700}
main{padding:0 12px}
.bar{height:8px;background:var(--line);border-radius:6px;margin:12px 0 4px;overflow:hidden}
.bar i{display:block;height:100%;background:var(--ok);width:0;transition:width .3s}
.pt{font-size:.85em;color:var(--sub);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.warn{background:color-mix(in srgb,#f59e0b 12%,transparent);border:1px solid #f59e0b;border-radius:10px;padding:8px 12px;font-size:.88em;margin:10px 0}
h2{font-size:1.05em;margin:20px 0 4px;color:var(--acc)}
h2 .hn{font-weight:400;font-size:.8em;color:var(--sub);margin-left:6px}
h2 .cnt{font-weight:400;font-size:.78em;color:var(--sub);margin-left:4px}
.gnote{font-size:.85em;color:var(--sub);margin:0 0 8px}
.exm{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:10px 0}
.exm summary{cursor:pointer;font-weight:700;font-size:.92em}
.exm .stem{font-size:.88em;color:var(--sub);margin-top:6px;white-space:pre-line}
.card{background:var(--card);border:1px solid var(--line);border-left-width:4px;border-left-color:var(--acc);border-radius:12px;padding:12px 14px;margin:10px 0}
.card.done{border-color:var(--ok);border-left-color:var(--ok)}
.card h3{margin:0;font-size:.98em;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.card h3 .n{font-weight:400;font-size:.8em;color:var(--sub)}
.etag{font-size:.7em;border-radius:5px;padding:0 6px;font-weight:700;background:#dbeafe;color:#1d4ed8;white-space:nowrap}
html.dark .etag{background:#172554;color:#93c5fd}
.qq{font-size:.92em;margin:6px 0 0}
.txt{border-top:1px dashed var(--line);margin-top:8px;padding-top:8px;display:none;font-size:.9em}
.txt.show{display:block}
.txt b{color:var(--acc)}
.btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.btns button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:4px 12px;font-size:.85em;cursor:pointer}
.btns button.on{border-color:var(--acc);color:var(--acc);font-weight:700}
.btns button.dk{border-color:var(--ok);color:var(--ok)}
#empty{display:none;text-align:center;color:var(--sub);padding:30px 0}
footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);font-size:.72em;color:var(--sub);padding:5px 12px;text-align:center}
</style>
</head>
<body>
<header>
  <b>🔧 Redis 五年真题集训</b><span class="cd">2024-05→2026-05 五连考 · 5 卷 15 问 + 押题 + 默画</span>
  <span id="cdays" class="cd" style="font-weight:700;color:var(--acc)"></span>
  <input id="search" type="search" placeholder="搜题…（/ 聚焦）"><span id="hitinfo"></span>
  <span style="margin-left:auto;display:flex;gap:6px">
    <a class="hbtn" href="/yuce-case.html">案例背诵卡</a>
    <a class="hbtn" href="/case-mindmap.html">13.Redis 章节</a>
    <button class="hbtn" onclick="fsz(-1)">A−</button><button class="hbtn" onclick="fsz(1)">A＋</button><button class="hbtn" onclick="th()">◐ 夜间</button>
  </span>
</header>
<nav id="tabs"></nav>
<main>
  <div class="bar"><i id="pfill"></i></div>
  <div class="pt"><span id="ptext"></span><span>题库存档 · cheko 真题 · 图为原卷填图</span></div>
  <div class="warn">⭐ Redis 案例近五场<b>全考</b>（每年换一个子专题：锁→旁路缓存→主从持久化→击穿→并发锁），子专题轮换从不重复。先攻 1-3 组必背（红），再过第 4-5 组和<b>第 7 组首考候选</b>（历史对账 2018-2026 从未考的五个点：哨兵/雪崩/事务/热大Key/Cluster），最后进「默画自查」组——五年三场考填图，<b>能默画才算会</b>。</div>
  <div id="empty">（无匹配内容）</div>
  <div id="body"></div>
</main>
<footer>单文件 · 数据源题库 cheko 真题 + 文老师预测 · 进度存 localStorage(rd-done)</footer>
<script>
const G = __DATA__;
const UNITS=[];G.forEach(g=>{
  g.exams.forEach(e=>e.subs.forEach(s=>UNITS.push({id:g.id+'-'+e.date+'-'+s.no,g,e,s})));
  if(g.extra)UNITS.push({id:g.id+'-extra',g,t:g.extra.t+' '+g.extra.qH});
  (g.cards||[]).forEach(c=>UNITS.push({id:c.id,g,t:c.t+' '+c.q}));
  (g.draws||[]).forEach(d=>UNITS.push({id:d.id,g}));
});
let TAB='all',Q='';
let done={};try{done=JSON.parse(localStorage.getItem("rd-done")||"{}")}catch(e){}
function save(){try{localStorage.setItem("rd-done",JSON.stringify(done))}catch(e){}}
const $=id=>document.getElementById(id);
function hit(u){if(!Q)return true;const t=((u.s&&u.s.qH||'')+(u.s&&u.s.aH||'')+(u.e&&u.e.stemH||'')+(u.g.full)+(u.t||'')).toLowerCase();return t.indexOf(Q)>=0}

function render(){
  const tabs=$('tabs');tabs.innerHTML='';
  const mk=(id,l)=>{const b=document.createElement('button');b.textContent=l;b.className=TAB===id?'on':'';b.onclick=()=>{TAB=id;render()};tabs.appendChild(b)};
  mk('all','全部');G.forEach(g=>mk(g.id,g.name));
  let html='',shown=0;
  G.forEach(g=>{
    if(TAB!=='all'&&TAB!==g.id)return;
    const vis=UNITS.filter(u=>u.g===g&&hit(u));
    if(!vis.length)return;
    const tot=UNITS.filter(u=>u.g===g).length,d=UNITS.filter(u=>u.g===g&&done[u.id]).length;
    html+=`<h2>${g.full}<span class="hn">已背 ${d}/${tot}</span></h2><p class="gnote">${g.note||''}</p>`;
    g.exams.forEach(e=>{
      if(!e.subs.some(s=>hit({g,s,e})))return;
      html+=`<details class="exm"><summary>📄 ${e.date} 案例第${e.sort}题 · 原题说明（点击展开）</summary><div class="stem">${e.stemH}</div></details>`;
      e.subs.forEach(s=>{
        const id=g.id+'-'+e.date+'-'+s.no,isD=!!done[id];
        html+=`<div class="card${isD?' done':''}" id="c-${id}">
<h3><span class="etag">${e.date} #${e.sort}</span>问题${s.no}<span class="n">${s.score||''}分</span></h3>
<div class="qq">${s.qH}</div>
<div class="txt" id="tx-${id}"><b>参考答案：</b><br>${s.aH}</div>
<div class="btns"><button onclick="tgTx('${id}',this)">显示答案</button><button class="${isD?'dk':''}" onclick="tg('${id}')">${isD?'✓ 已背':'标为已背'}</button></div>
</div>`;
        shown++;
      });
    });
    if(g.extra){
      const id=g.id+'-extra',isD=!!done[id];
      if(hit({g})){
        html+=`<div class="card${isD?' done':''}" id="c-${id}">
<h3><span class="etag">文老师押题</span>${g.extra.t}</h3>
<div class="txt show" id="tx-${id}">${g.extra.qH}</div>
<div class="btns"><button class="${isD?'dk':''}" onclick="tg('${id}')">${isD?'✓ 已背':'标为已背'}</button></div>
</div>`;shown++;
      }
    }
    (g.cards||[]).forEach(c=>{
      if(Q&&!(c.t+' '+c.q).toLowerCase().includes(Q))return;
      const isD=!!done[c.id];shown++;
      html+=`<div class="card${isD?' done':''}" id="c-${c.id}">
<h3><span class="etag">未考新增</span>${c.t}</h3>
<div class="txt show">${c.q}</div>
<div class="btns"><button class="${isD?'dk':''}" onclick="tg('${c.id}')">${isD?'✓ 已背':'标为已背'}</button></div>
</div>`;
    });
    (g.draws||[]).forEach(dr=>{
      const isD=!!done[dr.id];
      html+=`<div class="card${isD?' done':''}" id="c-${dr.id}">
<h3><span class="etag">默画</span>${dr.t}<span class="n">先默写步骤再核对</span></h3>
<div class="qq">${dr.q}</div>
<div class="txt" id="tx-${dr.id}"><b>步骤参考：</b><br>${dr.a}</div>
<div class="btns"><button onclick="tgTx('${dr.id}',this)">展开核对</button><button class="${isD?'dk':''}" onclick="tg('${dr.id}')">${isD?'✓ 已默画':'标为已默画'}</button></div>
</div>`;shown++;
    });
  });
  $('body').innerHTML=html;
  $('empty').style.display=html?'none':'block';
  const vis=UNITS.filter(u=>hit(u)).length;
  $('hitinfo').textContent=Q?('命中 '+vis+'/'+UNITS.length):'';
  const d=UNITS.filter(u=>done[u.id]).length;
  $('pfill').style.width=(d/UNITS.length*100)+'%';
  $('ptext').textContent=`已背 ${d}/${UNITS.length}`;
}
function tgTx(id,btn){const tx=$('tx-'+id);const on=tx.classList.toggle('show');btn.textContent=on?'收起':'显示答案';btn.classList.toggle('on',on)}
function tg(id){done[id]=!done[id];if(!done[id])delete done[id];save();render()}
$('search').addEventListener('input',e=>{Q=e.target.value.trim().toLowerCase();render()});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==$('search')){e.preventDefault();$('search').focus()}});
(function(){const ex=new Date('2026-10-24T09:00:00');const ms=ex-Date.now();
 $('cdays').textContent=ms>0?('⏳ 距考试 '+Math.ceil(ms/864e5)+' 天'):'📚 考试进行中/已结束'})();
function fsz(n){var s=parseInt(document.documentElement.style.fontSize||"17px")+n;s=Math.min(23,Math.max(14,s));document.documentElement.style.fontSize=s+"px";try{localStorage.setItem("sp-fs",s)}catch(e){}}
function th(){var k=document.documentElement.classList.toggle("dark");try{localStorage.setItem("sp-th",k?"1":"0")}catch(e){}}
try{var f=localStorage.getItem("sp-fs");if(f)document.documentElement.style.fontSize=f+"px";if(localStorage.getItem("sp-th")==="1")document.documentElement.classList.add("dark")}catch(e){}
render();
</script>
</body>
</html>
"""

open(DST, 'w', encoding='utf-8').write(PAGE.replace('__DATA__', DATA))
n_units = sum(len(e['subs']) for g in G for e in g.get('exams', [])) + sum(1 for g in G if g.get('extra')) + sum(len(g.get('cards', [])) for g in G) + sum(len(g.get('draws', [])) for g in G)
print("written", DST, "| groups:", len(G), "| units:", n_units)
