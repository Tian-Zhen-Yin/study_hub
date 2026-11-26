# 标准化题库导入指南（Markdown / PDF）

Study Hub 内置了「精品示例数据包」（首次启动自动加载 25 道高频选择题 + 4 道案例/论文种子题 + 17 个核心考点图谱），方便开箱即用。你可以按以下标准格式导入自己的笔记题库，也欢迎向社区贡献原创高质量题目与解析！

---

## 一、Markdown 题库格式规范

解析脚本位于 [scripts/parse_markdown_questions.py](../scripts/parse_markdown_questions.py)，单道题目之间使用 `---` 分隔。

### 1. 文件命名与知识域自动映射

将 `.md` 文件放在同一个目录中，文件名（不含后缀）会自动映射到系统内的知识域（未在映射表中的文件名默认归入 `架构设计`）：

| 文件名前缀 | 自动归属知识域 |
| :--- | :--- |
| `01-computer-systems`、`22-embedded` | 计算机系统基础 |
| `02-os-concepts` | 操作系统 |
| `03-database` | 数据库技术 |
| `04-networking` | 计算机网络 |
| `05-uml`、`06-ip-and-standards`、`07-software-engineering`、`09-software-metrics`、`23-english-reading` | 软件工程 |
| `08-project-management` | 项目管理 |
| `10-architecture-styles`、`11-quality-attributes`、`12-atam-evaluation`、`14-absd-views`、`15-microservice-cloud-native`、`16-middleware`、`17-distributed-transactions`、`18-cache`、`19-big-data`、`20-reliability`、`24-devops-serverless`、`25-enterprise-integration`、`26-soa-evolution` | 架构设计 |
| `13-design-patterns` | 设计模式 |
| `21-security` | 系统安全 |

### 2. 单题结构模板

每道题用独立一行 `---` 分隔，支持可选的 Markdown 配图语法（`![说明](图片URL)`）：

```markdown
# 架构设计专项示例题库

---

### 1. 在 ATAM（架构权衡分析方法）评估过程中，如果某项架构决策会同时提升可用性但降低一致性与可测试性，该决策被称为？

A. 风险点（Risk）
B. 非风险点（Non-Risk）
C. 敏感点（Sensitivity Point）
D. 权衡点（Tradeoff Point）

**答案**：D

**解析**：敏感点是指对单一质量属性产生显著影响的架构特性；权衡点是指同时影响多个质量属性且相互制约的设计决策。

---

### 2. 以下关于微服务拆分原则的描述，不正确的是？

A. 围绕业务能力与 DDD 限界上下文划分服务边界
B. 每个微服务应尽量拥有独立的私有数据存储
C. 为提高复用度，应尽量让多个微服务共享同一张核心业务表
D. 结合团队组织结构（康威定律）保持服务自治

**答案**：C

**解析**：多个微服务共享同一数据库表会导致强耦合与“分布式单体”反模式，违背微服务数据自治原则。
```

完整可直接测试的示例文件见：[examples/sample-bank/10-architecture-styles.md](../examples/sample-bank/10-architecture-styles.md)。

---

## 二、如何导入到 Study Hub

### 方式 A：通过后端接口或前端「题库管理」导入

1. 启动 Study Hub 后，打开侧边栏 **「题库管理」** 页面，或直接调用导入接口：
   ```bash
   curl -X POST "http://localhost:8080/api/questions/import/markdown?dirPath=/你的/题库目录绝对路径"
   ```
2. 也可以先在本地用 Python 脚本预校验 Markdown 格式是否正确：
   ```bash
   python3 scripts/parse_markdown_questions.py examples/sample-bank /tmp/check.json
   ```

### 方式 B：贡献原创题库给社区

如果你整理了原创高质量考点题、踩坑解析或论文提纲，欢迎提 PR！请遵循以下原则：
1. **原创/合规优先**：仅提交原创整理、教材公开概念题或经脱敏重构的经典考点，**严禁上传受版权保护的培训机构原卷或付费资料原文**。
2. **解析高质量**：不仅标明正确选项，最好补充“为什么选它 + 干扰项错在哪里 + 考场速记口诀”。
3. 提交前请用 `python3 scripts/parse_markdown_questions.py` 本地跑通解析校验。
