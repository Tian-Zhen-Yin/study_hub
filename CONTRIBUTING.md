# 贡献指南（Contributing to Study Hub）

感谢你关注 **Study Hub**！无论是代码改进、Bug 修复、文档完善，还是原创高质量备考解析与错别字纠错，都非常欢迎你的 PR 或 Issue。

---

## 一、你可以贡献什么

1. **代码与工程改进**
   - 修复前后端 Bug 或提升移动端体验
   - 推进 v1.1 路线图任务（如 `shared/pages.js` 模块化拆分、核心 Service 单元测试、AI 论文批改器等）
   - 优化 Prompt 模板（`src/main/resources/prompts/`）提升 AI 辅导与弱点诊断准确度
2. **原创备考内容共建**
   - 完善 `data/papers/` 或在线备考手册中的错别字、知识点勘误与考场经验补充
   - 按 [docs/question-bank-format.md](docs/question-bank-format.md) 贡献**原创/教材公开概念题与高质量解析**

---

## 二、内容合规红线（务必遵守）

为保护开源社区健康与项目长期可用，提交 PR 时请务必遵守：
- **严禁提交**受版权保护的第三方培训机构付费教材原文、押题原卷、商业题库导出数据或外部网站爬虫脚本。
- **严禁提交**任何真实的 API Key、数据库密码、个人敏感信息或本机绝对路径。
- 如引用真实工作项目作为论文素材示例，请做好彻底的匿名化脱敏处理。

---

## 三、本地开发与提交前验证

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/<你的用户名>/study_hub.git
cd study_hub

# 2. 创建特性分支
git checkout -b feat/your-feature-name

# 3. 运行全量测试（包含 H2 端到端冒烟集成测试，无需安装 MySQL）
mvn -B test

# 4. 如改动了 Markdown 题库示例，验证解析器
python3 scripts/parse_markdown_questions.py examples/sample-bank /tmp/check.json
```

---

## 四、Commit 风格建议

推荐使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
- `feat:` 新增功能（例如 `feat: 新增学习记录 JSON 导出接口`）
- `fix:` Bug 修复（例如 `fix: 修复手机端背诵卡滚动穿透问题`）
- `docs:` 文档或备考手册勘误（例如 `docs: 补充 ATAM 权衡点示例说明`）
- `refactor:` 代码重构（不改变对外行为）
- `test:` 补充或改进测试

提交 PR 后，GitHub Actions CI 会自动执行构建与测试，通过后即可进入 Review。期待你的加入！
