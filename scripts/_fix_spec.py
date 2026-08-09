import sys
sys.stdout.reconfigure(encoding='utf-8')

# Read current spec
with open('E:/AiProject/study_hub/docs/superpowers/specs/2026-07-29-quiz-system-upgrade-design.md', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Fix 1: .vue → .js naming
content = content.replace('QuizPage.vue', 'quiz-page.js')
content = content.replace('MapPage.vue', 'map-page.js')
content = content.replace('DataPage.vue', 'data-page.js')
content = content.replace('GameHUD.vue', 'game-hud.js')
content = content.replace('ModeSelector.vue', 'mode-selector.js')
content = content.replace('FilterBar.vue', 'filter-bar.js')
content = content.replace('QuestionPanel.vue', 'question-panel.js')
content = content.replace('BattleFeedback.vue', 'battle-feedback.js')
content = content.replace('AnalysisPanel.vue', 'analysis-panel.js')
content = content.replace('BookmarkButton.vue', 'bookmark-button.js')
content = content.replace('AnswerCard.vue', 'answer-card.js')
content = content.replace('Pagination.vue', 'pagination.js')
content = content.replace('ResultSummary.vue', 'result-summary.js')
content = content.replace('ChapterProgress.vue', 'chapter-progress.js')
content = content.replace('TerritoryMap.vue', 'territory-map.js')
content = content.replace('TerritoryDetail.vue', 'territory-detail.js')
content = content.replace('WorldProgress.vue', 'world-progress.js')
content = content.replace('GameStats.vue', 'game-stats.js')
content = content.replace('ProgressExport.vue', 'progress-export.js')
content = content.replace('ProgressImport.vue', 'progress-import.js')
content = content.replace('DiagnosisExport.vue', 'diagnosis-export.js')
content = content.replace('ClearData.vue', 'clear-data.js')
content = content.replace('DataSummary.vue', 'data-summary.js')

# Fix 2: Time limits
content = content.replace(
    '- 每天 3 次机会，每次限时 20 题',
    '- 每天 3 次机会，每次限时 10 分钟，20 题'
)
content = content.replace(
    '- 限时 10 题，全对才算击败，消耗 30 金币',
    '- 限时 5 分钟，10 题，全对才算击败，消耗 30 金币'
)

# Fix 3: Boss boundary condition
content = content.replace(
    '- 失败不退金币，可重试',
    '- 失败不退金币，可重试\n- 边界情况：如果模块题数 < 10 题，则取该模块全部题目，全部答对即可击败'
)

# Fix 4: API body format
content = content.replace(
    '| POST | /api/game/daily-challenge/result | 提交远征结果，返回评分+金币+EXP |',
    '| POST | /api/game/daily-challenge/result | 提交远征结果。body: { answers: [{ questionId, userAnswer }] }。返回 { score, correct, gold, exp, achievements } |'
)
content = content.replace(
    '| POST | /api/game/boss/{domainId}/result | 提交 Boss 结果 |',
    '| POST | /api/game/boss/{domainId}/result | 提交 Boss 结果。body: { answers: [{ questionId, userAnswer }] }。返回 { victory, correct, exp, territoryConquered, achievements } |'
)

# Fix 5: game_state singleton note
content = content.replace(
    '### 4.3 game_state\n```sql',
    '### 4.3 game_state\n\n> 设计假设：当前为单用户系统，game_state 全局只有一行。后续多用户时增加 user_id 字段。\n\n```sql'
)

# Fix 6: Combo scope
content = content.replace(
    '| 连击之王 | combo_king | 连续答对 20 题 | +50 EXP |',
    '| 连击之王 | combo_king | 单次练习内连续答对 20 题 | +50 EXP |'
)

# Fix 7: AI diagnosis example
old_ai = """### AI 诊断格式（增强版）
在 ruankao 格式基础上增加：
- dashboard.studyHours / weeklyHours / taskCompletionRate
- dashboard.recentSimulations / radarData
- game.exp / game.level / game.title / game.territories"""
new_ai = """### AI 诊断格式（增强版）
在 ruankao 格式基础上增加 dashboard 和 game 数据：
```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-29T...",
  "bank": { "source": "...", "counts": { "choices": 1822, "cases": 78, "essays": 60 } },
  "learner": {
    "summary": { "total": 500, "correct": 380, "wrong": 120, "accuracy": 0.76, "weakModules": [...] },
    "recentWrong": [...],
    "allAttempts": [...]
  },
  "dashboard": {
    "studyHours": 120.5, "weeklyHours": 8.5, "taskCompletionRate": 65,
    "recentSimulations": [{ "simDate": "2026-07-28", "knowledgeScore": 52, "caseScore": 48, "essayScore": 45 }],
    "radarData": [{ "name": "架构设计", "pct": 78 }, { "name": "数据库", "pct": 65 }]
  },
  "game": {
    "exp": 380, "level": 2, "title": "初级架构师", "gold": 120, "maxCombo": 15,
    "achievements": ["first_blood", "hundred_kills"],
    "territories": [{ "domainId": 1, "name": "架构设计", "state": "conquered", "accuracy": 0.92 }]
  },
  "aiInstructions": [
    "先按模块正确率找短板，不要只看单题。",
    "区分概念不会、审题失误、记忆混淆、计算错误。",
    "给出下一周6-8小时可执行学习安排。",
    "结合游戏数据（等级/成就/领土）评估学习投入度。"
  ]
}
```"""
content = content.replace(old_ai, new_ai)

# Fix 8: Split territory map to Phase 2
old_phase1 = """### 第一期（本次实现）
1. 新建 5 张表：memory_cards + bookmarks + game_state + achievements + territories
2. QuizService（7 种模式 + SM-2 + 游戏联动 + continueFrom 断点续做）
3. MemoryService（到期查询 + 模块统计）
4. ProgressService（导入导出 + AI 诊断）
5. GameService（等级/称号/连击/成就/每日重置）
6. TerritoryService（领地状态更新）
7. REST API：QuizController + GameController + TerritoryController + MemoryController + ProgressController
8. Vue 3 Quiz 页面（GameHUD + BattleFeedback + 答题卡 + 章节进度）
9. Vue 3 领地地图页面（TerritoryMap + 详情 + Boss 入口）
10. Vue 3 Data 页面（进度管理 + AI 诊断 + 成就墙）

### 第二期（后续）
1. 账号认证 + 云端同步
2. 案例分析和论文题 AI 判分
3. 夜间模式 / 主题切换
4. 与自己历史最佳排行榜
5. Boss 战动画特效增强"""
new_phase1 = """### 第一期（本次实现）
1. 新建 5 张表：memory_cards + bookmarks + game_state + achievements + territories
2. QuizService（7 种模式 + SM-2 + 游戏联动 + continueFrom 断点续做）
3. MemoryService（到期查询 + 模块统计）
4. ProgressService（导入导出 + AI 诊断）
5. GameService（等级/称号/连击/成就/每日重置）
6. TerritoryService（领地状态更新）
7. REST API 全部端点（Quiz + Memory + Progress + Game + Territory）
8. Vue 3 Quiz 页面（GameHUD + BattleFeedback + 答题卡 + 章节进度）
9. Vue 3 Data 页面（进度管理 + AI 诊断 + 成就墙 + 游戏统计）

### 第二期（后续）
1. 账号认证 + 云端同步
2. Vue 3 领地地图页面（TerritoryMap + 详情 + Boss 入口）
3. 案例分析和论文题 AI 判分
4. 夜间模式 / 主题切换
5. 与自己历史最佳排行榜
6. Boss 战动画特效增强"""

content = content.replace(old_phase1, new_phase1)

# Write back
with open('E:/AiProject/study_hub/docs/superpowers/specs/2026-07-29-quiz-system-upgrade-design.md', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK, fixed all 8 issues')
print('Final length:', len(content), 'chars')
