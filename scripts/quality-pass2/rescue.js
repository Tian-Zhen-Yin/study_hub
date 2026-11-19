// 缺图题抢救:12 题文字改写(图只是引子/数据在解析里) + 7 题手绘 SVG 重建配图
// 8 题数据只在原图里(边权/表数据/拓扑细节),无法忠实重建,保留 MISSING_IMAGE
const fs = require('fs');
const path = require('path');

const rows = fs.readFileSync(path.join(__dirname, 'missing-img-full.b64'), 'utf8')
  .split('\n').filter(Boolean)
  .map(l => {
    const o = JSON.parse(l);
    return {
      id: o.id,
      stem: Buffer.from(o.stem, 'base64').toString('utf8'),
      ana: Buffer.from(o.ana, 'base64').toString('utf8')
    };
  });
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

// ---------- SVG 工具 ----------
const FONT = 'font-family="Microsoft YaHei,PingFang SC,sans-serif"';
const box = (x, y, w, h, lines, o = {}) => {
  const lh = 20, y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + 5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${o.fill || '#eef3fb'}" stroke="${o.stroke || '#4a6fa5'}" stroke-width="1.5"/>` +
    lines.map((t, i) => `<text x="${x + w / 2}" y="${y0 + i * lh}" text-anchor="middle" font-size="15" ${FONT} fill="#2c3e50" ${i === 0 && o.bold !== false && lines.length > 1 ? 'font-weight="bold"' : ''}>${t}</text>`).join('');
};
const arrow = (x1, y1, x2, y2, o = {}) => {
  const mk = o.hollow ? 'url(#tri)' : 'url(#arw)';
  const dash = o.dashed ? 'stroke-dasharray="5,4"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color || '#5a7bb5'}" stroke-width="1.6" ${dash} marker-end="${mk}"/>` +
    (o.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="13" ${FONT} fill="${o.color || '#5a7bb5'}">${o.label}</text>` : '');
};
const head = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>` +
  `<marker id="arw" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#5a7bb5"/></marker>` +
  `<marker id="tri" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto"><path d="M1,1 L13,7 L1,13 z" fill="#fff" stroke="#4a6fa5" stroke-width="1.4"/></marker>` +
  `</defs><rect width="${w}" height="${h}" fill="#ffffff"/>`;

// ---------- 7 张重建图 ----------
const svgs = {};

// 1935 三任务前驱图:行内 S→C→P,列内 S1→S2→S3 等
{
  const cols = [100, 340, 580], rowsY = [40, 190, 340];
  let s = head(760, 440);
  const names = ['S1', 'C1', 'P1', 'S2', 'C2', 'P2', 'S3', 'C3', 'P3'];
  names.forEach((n, i) => {
    const r = Math.floor(i / 3), c = i % 3;
    s += box(cols[c], rowsY[r], 90, 44, [n]);
  });
  for (const y of rowsY) for (const x of [100, 340]) s += arrow(x + 94, y + 22, x + 236, y + 22);
  for (const x of cols) for (const y of [40, 190]) s += arrow(x + 45, y + 48, x + 45, y + 146);
  s += '<text x="380" y="432" text-anchor="middle" font-size="12" fill="#8a94a6">行:任务内先后依赖 列:同类段串行(单CPU/单扫描仪/单打印机)</text></svg>';
  svgs[1935] = s;
}

// 1963 Command 模式类图
{
  let s = head(780, 340);
  s += box(40, 60, 190, 84, ['MenuItem', '- command: Command', '+ doClick()']);
  s += box(330, 60, 190, 64, ['«interface»', 'Command', '+ execute()']);
  s += box(590, 60, 150, 64, ['Open', '+ execute()']);
  s += box(440, 240, 230, 56, ['BulletinBoardScreen']);
  s += arrow(234, 92, 326, 92, { label: '持有并触发' });
  s += `<polygon points="234,92 246,86 246,98" fill="#4a6fa5"/>`;
  s += arrow(586, 100, 526, 100, { dashed: true, hollow: true });
  s += arrow(620, 128, 570, 236, { label: '调用' });
  s += '<text x="390" y="30" text-anchor="middle" font-size="12" fill="#8a94a6">Command 模式类图(公告板系统)</text></svg>';
  svgs[1963] = s;
}

// 2114 Composite 模式类图
{
  let s = head(920, 380);
  s += box(330, 50, 240, 88, ['Company', '{abstract}', '+ add(c: Company)', '+ remove(c: Company)']);
  s += box(60, 280, 190, 56, ['ConcreteCompany']);
  s += box(330, 280, 160, 56, ['Department']);
  s += box(540, 280, 140, 56, ['Finance']);
  s += box(720, 280, 170, 56, ['HRDepartment']);
  for (const [x1, y1, x2, y2] of [[155, 276, 380, 142], [410, 276, 440, 142], [610, 276, 470, 142], [805, 276, 510, 142]])
    s += arrow(x1, y1, x2, y2, { hollow: true });
  s += arrow(254, 292, 560, 130, { label: '子节点 *' });
  s += `<polygon points="254,292 266,285 278,292 266,299" fill="#4a6fa5"/>`;
  s += '</svg>';
  svgs[2114] = s;
}

// 2245 DNS 查询链(①~④逐级转发,均为递归)
{
  let s = head(950, 210);
  s += box(20, 90, 100, 56, ['主机 PC']);
  s += box(164, 90, 160, 56, ['本地域名服务器', '(中介)']);
  s += box(368, 90, 150, 56, ['根域名服务器']);
  s += box(562, 90, 160, 56, ['顶级域名服务器']);
  s += box(766, 90, 160, 56, ['授权域名服务器']);
  const marks = ['①', '②', '③', '④'];
  [[124, 160], [328, 364], [522, 558], [726, 762]].forEach(([a, b], i) =>
    s += arrow(a, 118, b, 118) + `<text x="${(a + b) / 2}" y="80" text-anchor="middle" font-size="15" ${FONT} fill="#5a7bb5" font-weight="bold">${marks[i]}</text>`);
  s += '<text x="475" y="195" text-anchor="middle" font-size="13" fill="#8a94a6">①~④ 均为递归查询,逐级转发,最终由授权域名服务器返回解析结果</text></svg>';
  svgs[2245] = s;
}

// 2412 Bridge 模式类图
{
  let s = head(660, 340);
  s += box(60, 60, 190, 84, ['Shape', '{abstract}', '- drawing: Drawing', '+ draw()']);
  s += box(390, 60, 190, 64, ['«interface»', 'Drawing', '+ drawElem()']);
  s += box(60, 250, 190, 56, ['Rectangle']);
  s += box(390, 250, 190, 56, ['V2Drawing']);
  s += arrow(150, 246, 150, 148, { hollow: true });
  s += arrow(480, 246, 480, 128, { dashed: true, hollow: true });
  s += arrow(254, 100, 386, 100, { label: '聚合' });
  s += `<polygon points="254,100 266,94 266,106" fill="#4a6fa5"/>`;
  s += '</svg>';
  svgs[2412] = s;
}

// 2592 网闸部署拓扑
{
  let s = head(800, 200);
  s += box(40, 70, 180, 64, ['政府内网', '(涉密业务)']);
  s += box(320, 60, 160, 84, ['设备 A', '内外网边界'], { fill: '#fdf1e7', stroke: '#c0392b' });
  s += box(580, 70, 180, 64, ['政府外网', '(互联网)']);
  s += arrow(224, 102, 316, 102);
  s += arrow(484, 102, 576, 102);
  s += '<text x="400" y="180" text-anchor="middle" font-size="12" fill="#8a94a6">内外网边界部署安全防护设备 A,实现信息安全交换与隔离</text></svg>';
  svgs[2592] = s;
}

// 2605 PCB 索引方式组织
{
  let s = head(820, 360);
  s += box(30, 30, 200, 30, ['进程三态模型'], { fill: '#f5f6f8', stroke: '#b8c0cc' });
  s += `<circle cx="80" cy="120" r="26" fill="#eef3fb" stroke="#4a6fa5" stroke-width="1.5"/><text x="80" y="125" text-anchor="middle" ${FONT}>运行</text>`;
  s += `<circle cx="210" cy="120" r="26" fill="#eef3fb" stroke="#4a6fa5" stroke-width="1.5"/><text x="210" y="125" text-anchor="middle" ${FONT}>就绪</text>`;
  s += `<circle cx="145" cy="230" r="26" fill="#eef3fb" stroke="#4a6fa5" stroke-width="1.5"/><text x="145" y="235" text-anchor="middle" ${FONT}>阻塞</text>`;
  s += arrow(108, 116, 182, 116, { label: '时间片到' });
  s += arrow(182, 138, 108, 138, { label: '调度' });
  s += arrow(88, 144, 124, 206, { label: '等待事件' });
  s += arrow(168, 208, 202, 146, { label: '事件到' });
  s += box(330, 60, 160, 50, ['就绪索引表']);
  s += box(330, 240, 160, 50, ['阻塞索引表']);
  s += box(590, 40, 120, 34, ['PCB1']);
  s += box(590, 90, 120, 34, ['PCB2']);
  s += box(590, 140, 120, 34, ['PCBn']);
  s += box(590, 240, 120, 34, ['PCBi']);
  s += box(590, 290, 120, 34, ['PCBj']);
  s += arrow(494, 85, 586, 60);
  s += arrow(494, 85, 586, 105);
  s += arrow(494, 95, 586, 155);
  s += arrow(494, 265, 586, 255);
  s += arrow(494, 265, 586, 305);
  s += '<text x="410" y="348" text-anchor="middle" font-size="12" fill="#8a94a6">按状态建立索引表,表项存放该状态下各 PCB 的起始地址</text></svg>';
  svgs[2605] = s;
}

// ---------- Tier A:文字改写(图只是引子/裁掉无选项支撑的空) ----------
const rewrites = {
  1663: '某大型企业ERP系统的架构采用了表示层、业务逻辑层、数据访问层三层分离的设计。这种架构最主要的优点是（）。',
  1934: '计算机系统中硬件层之上的软件通常按照三层来划分，自底向上依次为①、②、③，则①②③分别表示（1）。',
  2056: '某公司欲为某种型号的示波器开发内置软件。该公司的架构师设计了一套软件架构，其中划分了数据采集、信号处理、显示等功能模块及硬件构件，但仅覆盖了系统内部构成。在软件架构评审时，专家认为该架构存在的问题是（49）。',
  2105: '利用需求跟踪能力链（traceability link）可以跟踪一个需求使用的全过程，也就是从初始需求到实现的前后生存期。需求跟踪能力链有 4 类，链条自源头的①出发，经被跟踪对象②延伸至各类前后工作产品。其中的①和②分别是(24)。',
  2220: '在 PKI（公钥基础设施）系统结构中，负责生成和签署数字证书的是（ ）。',
  2381: '某航空公司机票销售系统有 n 个售票点，该系统为每个售票点创建一个进程 Pi（i=1，2，…，n）管理机票销售。假设 Tj（j=1，2，…，m）单元存放某日某航班的机票剩余票数，Temp 为 Pi 进程的临时工作单元，x 为某用户的订票张数。若用 P、V 操作实现各售票点进程对剩余票数 Tj 的互斥访问，则初始化时系统应将信号量 S 赋值为（ ）。',
  2408: '一个大型软件系统的需求总是有变化的。为了降低项目开发的风险，需要一个好的变更控制过程。需求变更管理过程通常由①②③三个阶段依次构成，①②③处对应的内容应是（ ）。',
  2417: '对于遗留系统的评价框架，按技术水平（高/低）和业务价值（高/低）两个维度将遗留系统划分为四个区域，那么处于“高水平、低价值”区的遗留系统适合于采用的演化策略为（37）。',
  2459: '某计算机系统输入/输出采用双缓冲工作方式。假设磁盘块与缓冲区大小相同，每个盘块读入缓冲区的时间 T 为 10μs，缓冲区送用户区的时间 M 为 6μs，系统对每个磁盘块数据的处理时间 C 为 2μs。若用户需要将大小为 10 个磁盘块的 Doc1 文件逐块从磁盘读入缓冲区，并送用户区进行处理，那么采用双缓冲需要花费的时间为（5）μs。',
  2554: '一个好的变更控制过程，给项目风险承担者提供了正式的建议变更机制。需求变更管理过程通常由①②③三个阶段依次构成，①②③处对应的内容应分别是(25)。',
  2828: '云计算服务体系结构包含三个层次，自上而下的①、②、③分别与 SaaS、PaaS、IaaS 三种服务模式相对应，则①、②、③应为（ ）。'
};

// Tier B:保留"如下图"引用,只裁掉无选项支撑的空 + OCR 修正
const rewritesB = {
  1935: '某计算机系统中有一个 CPU、一台扫描仪和一台打印机。现有三个图像处理任务，每个任务有三个程序段：扫描 Si、图像处理 Ci 和打印 Pi（i=1，2，3）。下图为三个任务各程序段并发执行的前驱图，其中，可并行执行的是（ ）。',
  1963: '某软件公司欲开发一个 Windows 平台上的公告板系统。在明确用户需求后，该公司的架构师决定采用 Command 模式实现该系统的界面显示部分，并设计 UML 类图如下图所示。图中与 Command 模式中的“Invoker”角色相对应的类是（30）。',
  2114: '某公司欲开发一门户网站，将公司的各个分公司及办事处信息进行整合。故决定采用 Composite 设计模式来实现公司的组织结构关系，并设计了如下图所示的 UML 类图。图中与 Composite 模式中的“Component”角色相对应的类是（33）。',
  2245: byId[2245].stem,  // 原样,补图即可
  2412: '某软件公司欲开发一个绘图软件，要求使用不同的绘图程序绘制不同的图形。在明确用户需求后，该公司的架构师决定采用 Bridge 模式实现该软件，并设计 UML 类图如下图所示。图中与 Bridge 模式中的“Abstraction”角色相对应的类是（32）。',
  2592: '在网络规划中，政府内外网之间应该部署网络安全防护设备。下图中部署在政府内网与外网之间的设备 A 是（64）。',
  2605: '某计算机系统中的进程管理采用三态模型，那么下图所示的 PCB（进程控制块）的组织方式采用（2）。'
};

// ---------- 生成 SQL ----------
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const sqls = [];
let nA = 0, nB = 0;

for (const [id, ns] of Object.entries(rewrites)) {
  sqls.push(`UPDATE questions SET stem='${esc(ns)}', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=${id};`);
  nA++;
}
for (const [id, ns] of Object.entries(rewritesB)) {
  sqls.push(`UPDATE questions SET stem='${esc(ns)}', image_url='/uploads/q${id}.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=${id};`);
  nB++;
}
// 1935 题干程序段 Q→C 已在改写中处理,解析同步 Q1/Q2/Q3 → C1/C2/C3
const ana1935 = byId[1935].ana.replace(/Q1/g, 'C1').replace(/Q2/g, 'C2').replace(/Q3/g, 'C3').replace(/图像处理Q/g, '图像处理C');
sqls.push(`UPDATE questions SET analysis='${esc(ana1935)}' WHERE id=1935;`);
sqls.push(`UPDATE questions SET flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1701;`); // 误标:题干已含完整权值表

fs.writeFileSync(path.join(__dirname, 'rescue.sql'), 'SET NAMES utf8mb4;\n' + sqls.join('\n') + '\n');

// SVG 落盘到 data/uploads/uploads/(safeImageUrl 只放行 /uploads/ 前缀)
const outDir = path.join(__dirname, '..', '..', 'data', 'uploads', 'uploads');
fs.mkdirSync(outDir, { recursive: true });
for (const [id, svg] of Object.entries(svgs)) fs.writeFileSync(path.join(outDir, `q${id}.svg`), svg);

console.log(`Tier A rewritten: ${nA}, Tier B with SVG: ${nB}, unflag-only: 1 (1701)`);
console.log(`SVG files: ${Object.keys(svgs).length} -> ${outDir}`);

// 1701 误标原因核查
const IMG_REF = /(如图所示|如下图|下图|见图|根据图|观察图|看图|图所示)/;
const m = byId[1701].stem.match(IMG_REF);
console.log('1701 IMG_REF match:', m && JSON.stringify(m[0]), '| stem head:', byId[1701].stem.slice(0, 40));
