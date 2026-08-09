import sys
sys.stdout.reconfigure(encoding='utf-8')

sections = []

# Section 3: 游戏化设计
sections.append("""

## 3. 游戏化设计

### 3.1 核心隐喻

| 刷题概念 | 游戏映射 |
|----------|----------|
| 知识域 | 领土（Territory） |
| 题目 | 战斗（Battle） |
| 答对 | 攻击命中（+Combo） |
| 答错 | 受伤（Combo 归零） |
| 连续答对 | 连击（Combo >= 5 额外 EXP） |
| 复习到期题 | 回血 |
| 模块正确率 > 90% | 领地占领 |
| 全部模块占领 | 通关 |

### 3.2 等级与称号

| 等级 | 称号 | 所需 EXP |
|------|------|----------|
| 1 | 学徒 | 0 |
| 2 | 初级架构师 | 100 |
| 3 | 中级架构师 | 500 |
| 4 | 高级架构师 | 1000 |
| 5 | 资深架构师 | 2500 |
| 6 | 架构专家 | 5000 |
| 7 | 架构宗师 | 10000 |

EXP = 累计正确题数。每答对一题 +1 EXP，Combo >= 5 时额外 +1 EXP。

### 3.3 连击系统
- 连续答对：Combo 计数 +1，Combo >= 5 时额外 +1 EXP
- 答错：Combo 归零
- 最高连击记录持久化

### 3.4 每日挑战（远征）
- 每天 3 次机会，每次限时 20 题
- 金币奖励：< 50% = 0, 50-69% = 10, 70-89% = 20, 90-99% = 30, 100% = 50
- 金币用途：解锁 Boss 关（30 金币/次）

### 3.5 Boss 战
- 模块正确率 > 80% 时解锁
- 限时 10 题，全对才算击败，消耗 30 金币
- 击败 = 占领领地，奖励 100 EXP
- 失败不退金币，可重试

### 3.6 领地地图
- 所有知识域可视化为一幅地图（SVG/Canvas）
- 未接触：灰色迷雾 | 学习中：闪烁 | 正确率 > 80%：点亮 | 已征服：金色 + 旗帜

### 3.7 成就系统

| 成就 | 标识 | 条件 | 奖励 |
|------|------|------|------|
| 初出茅庐 | first_blood | 首次答对 1 题 | +10 EXP |
| 连击之王 | combo_king | 连续答对 20 题 | +50 EXP |
| 不死鸟 | flawless | 单次练习 0 错题 | +30 EXP |
| 征服者 | conqueror | 占领一个领地 | +100 EXP |
| 百题斩 | hundred_kills | 累计答对 100 题 | +20 EXP |
| 千题斩 | thousand_kills | 累计答对 1000 题 | +200 EXP |
| 完美一天 | perfect_day | 完成每日 3 次远征 | +15 EXP |
| 七日坚持 | seven_day_streak | 连续 7 天登录 | +50 EXP |
| 全境统一 | total_domination | 占领全部领地 | +500 EXP |
""")

# Section 4: 数据表
sections.append("""
## 4. 新数据表

### 4.1 memory_cards
```sql
CREATE TABLE memory_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    streak INT DEFAULT 0,
    state VARCHAR(10) DEFAULT 'new',
    next_review_at DATETIME,
    wrong_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    last_answer_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE KEY uk_question (question_id)
);
```

### 4.2 bookmarks
```sql
CREATE TABLE bookmarks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE KEY uk_question (question_id)
);
```

### 4.3 game_state
```sql
CREATE TABLE game_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    exp INT DEFAULT 0,
    gold INT DEFAULT 0,
    level INT DEFAULT 1,
    title VARCHAR(30) DEFAULT '学徒',
    current_combo INT DEFAULT 0,
    max_combo INT DEFAULT 0,
    daily_challenges_used INT DEFAULT 0,
    daily_challenge_date DATE,
    login_streak INT DEFAULT 0,
    last_login_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4.4 achievements
```sql
CREATE TABLE achievements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    achievement_key VARCHAR(50) NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_achievement (achievement_key)
);
```

### 4.5 territories
```sql
CREATE TABLE territories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    domain_id BIGINT NOT NULL,
    state VARCHAR(20) DEFAULT 'fog',
    accuracy DOUBLE DEFAULT 0,
    boss_defeated BOOLEAN DEFAULT FALSE,
    questions_answered INT DEFAULT 0,
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    UNIQUE KEY uk_domain (domain_id)
);
```
""")

# Section 5: 后端组件
sections.append("""
## 5. 新后端组件

### 5.1 Entity（新增）
- MemoryCard、Bookmark、GameState、Achievement、Territory

### 5.2 Repository（新增）
- MemoryCardRepository、BookmarkRepository、GameStateRepository、AchievementRepository、TerritoryRepository

### 5.3 Service
- QuizService — 练习集生成（7 种模式）、判题 + SM-2 + 游戏联动 + continueFrom 断点续做
- MemoryService — 到期题查询、模块记忆统计
- ProgressService — JSON 导入导出、AI 诊断生成
- GameService — 等级计算、称号判定、连击管理、金币、成就检测、每日重置
- TerritoryService — 领地状态更新、地图数据生成

### 5.4 Controller
- QuizController（重写为 REST API）、MemoryController、ProgressController、GameController、TerritoryController
""")

# Section 6: API
sections.append("""
## 6. API 端点

### 6.1 题库查询
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/questions | 按 domain/examYear/source/keyword 筛选，分页 |
| GET | /api/questions/{id} | 单题详情 |
| GET | /api/questions/modules | 所有模块列表（含题数 + 领地状态） |

### 6.2 练习集
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/quiz/set | 生成练习集。body: { mode, domainId, examYear, count }。mode=continue 时自动从上次位置继续。返回完整题目列表 |
| POST | /api/quiz/answer | 提交答案。body: { questionId, userAnswer }。返回 { correct, answer, analysis, memory: {streak, state, nextReviewAt}, game: {exp, combo, levelUp, achievementUnlocked} } |

### 6.3 记忆复习
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/memory/due | 到期待复习题，?count=N（默认 20） |
| GET | /api/memory/stats | 各模块记忆状态统计 |

### 6.4 收藏
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/bookmarks/{questionId} | 切换收藏，返回 { bookmarked } |
| GET | /api/bookmarks | 获取收藏列表 |

### 6.5 进度
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/progress/export | 导出 ruankao-progress.json（含游戏数据） |
| POST | /api/progress/import/preview | 上传 JSON，返回摘要 |
| POST | /api/progress/import/apply | 确认后应用（body 含完整 JSON） |
| GET | /api/progress/diagnosis | 生成增强版 ai-diagnosis.json |

### 6.6 游戏
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/game/state | 获取当前游戏状态 |
| POST | /api/game/daily-challenge | 开始一次远征，返回限时 20 题 |
| POST | /api/game/daily-challenge/result | 提交远征结果，返回评分+金币+EXP |
| POST | /api/game/boss/{domainId} | 开始 Boss 关（消耗 30 金币） |
| POST | /api/game/boss/{domainId}/result | 提交 Boss 结果 |
| GET | /api/game/achievements | 已解锁成就列表 |
| GET | /api/territories | 领地地图数据 |
""")

# Section 7: 前端
sections.append("""
## 7. 前端页面

### 7.1 路由（Vue 3 hash 路由）
```
#/      → Dashboard（现有，增强）
#/quiz  → 刷题主页面（全新）
#/map   → 领地地图（全新）
#/data  → 数据管理页（全新）
```

### 7.2 Quiz 页面组件树
```
QuizPage.vue
├── GameHUD.vue            — 顶部 HUD：等级/称号/EXP条/金币/连击
├── ModeSelector.vue       — 7 种模式按钮 + 题数统计
├── FilterBar.vue          — 领域 / 年份 / 关键词筛选
├── QuestionPanel.vue      — 题干 + ABCD 选项（点击即判）
├── BattleFeedback.vue     — 答对/答错动画 + Combo特效 + EXP飘字
├── AnalysisPanel.vue      — 答案 + 解析 + 来源标签
├── BookmarkButton.vue     — 收藏/取消
├── AnswerCard.vue         — 右侧答题卡，分页（可配置 pageSize），支持跳转
├── Pagination.vue         — 上一页/下一页
├── ResultSummary.vue      — 本次练习总结 + 获得EXP/金币/成就
└── ChapterProgress.vue    — 可折叠章节进度（含领地状态图标）
```

### 7.3 领地地图页面
```
MapPage.vue
├── TerritoryMap.vue       — 可视化知识域地图（SVG/Canvas）
│   ├── 每个知识域 = 一块领地，根据状态渲染不同颜色
│   ├── 点击领地 → 跳转到该域章节练习
│   └── 已征服显示旗帜 + Boss击杀记录
├── TerritoryDetail.vue    — 选中领地详情
│   ├── 正确率进度条、已做题数、待复习数
│   ├── Boss状态（未解锁/可挑战/已击败）
│   └── 快速入口：章节练习 / Boss关
└── WorldProgress.vue      — 全球进度：X/Y 领地已征服
```

### 7.4 Data 页面
```
DataPage.vue
├── GameStats.vue          — 游戏统计（等级/称号/成就墙/连击记录）
├── ProgressExport.vue     — 下载进度 JSON
├── ProgressImport.vue     — 选择文件 → 预览摘要 → 确认导入
├── DiagnosisExport.vue    — 下载 AI 诊断 JSON
├── ClearData.vue          — 清空记录（需确认）
└── DataSummary.vue        — 题库统计 + 作答概览
```
""")

# Section 8-11
sections.append("""
## 8. 间隔重复算法（简化版 SM-2）

```js
const INTERVALS = [1, 1, 3, 7, 14, 30];

function updateMemoryCard(card, isCorrect) {
  if (isCorrect) {
    card.correctCount += 1;
    card.streak = Math.min(card.streak + 1, 5);
    card.state = card.streak >= 4 ? 'mastered' : 'learning';
  } else {
    card.wrongCount += 1;
    card.streak = 0;
    card.state = 'learning';
  }
  card.nextReviewAt = now + INTERVALS[card.streak] 天;
  card.lastAnswerAt = now;
}
```

## 9. 游戏逻辑核心（GameService）

### 答题联动
```
答对: exp += 1, combo += 1
      if combo >= 5: exp += 1 (额外连击奖励)
答错: combo = 0
每次答题后自动检测: 成就解锁 + 领地状态更新 + 等级提升
```

### 等级计算
```js
const LEVELS = [0, 100, 500, 1000, 2500, 5000, 10000];
const TITLES = ['学徒', '初级架构师', '中级架构师', '高级架构师', '资深架构师', '架构专家', '架构宗师'];

function calcLevel(exp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (exp >= LEVELS[i]) return { level: i + 1, title: TITLES[i], nextExp: LEVELS[i + 1] || null };
  }
}
```

### 每日重置
```
每次请求时检查 daily_challenge_date != today:
  → daily_challenges_used = 0, daily_challenge_date = today
检查 last_login_date:
  → 昨天登录过: login_streak += 1, 检测登录成就
  → 昨天未登录: login_streak = 1
```

## 10. 进度 JSON 格式

### 导出格式（与 ruankao 兼容 + 游戏数据）
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-07-29T12:00:00Z",
  "attempts": [
    { "questionId": "q-001", "answer": "A", "correctAnswer": "A", "correct": true, "answeredAt": "..." }
  ],
  "bookmarks": [
    { "questionId": "q-001", "createdAt": "..." }
  ],
  "game": {
    "exp": 250, "gold": 120, "level": 2, "title": "初级架构师",
    "maxCombo": 15, "loginStreak": 7,
    "achievements": ["first_blood", "combo_king"],
    "territories": [{ "domainId": 1, "state": "conquered", "accuracy": 0.92 }]
  }
}
```

### AI 诊断格式（增强版）
在 ruankao 格式基础上增加：
- dashboard.studyHours / weeklyHours / taskCompletionRate
- dashboard.recentSimulations / radarData
- game.exp / game.level / game.title / game.territories

## 11. 实施范围

### 第一期（本次实现）
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
5. Boss 战动画特效增强
""")

with open('E:/AiProject/study_hub/docs/superpowers/specs/2026-07-29-quiz-system-upgrade-design.md', 'a', encoding='utf-8') as f:
    for s in sections:
        f.write(s)
        
print('OK, appended', len(sections), 'sections')
