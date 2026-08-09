# Quiz System RPG Upgrade - Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform study_hub from a simple random-quiz tool into a gamified RPG quiz system.

**Architecture:** Spring Boot REST API + 5 new entities + 5 services + Vue 3 CDN SPA with hash routing.

**Tech Stack:** Java 17, Spring Boot 3.2, JPA/Hibernate, MySQL, Vue 3 CDN, vanilla CSS.

## Task 1: Database Entities & Repositories (5 entities + 5 repos)

Files: Create 10 files in entity/ and repository/ packages.

- [ ] Step 1: Create MemoryCard.java entity
- [ ] Step 2: Create Bookmark.java entity
- [ ] Step 3: Create GameState.java entity
- [ ] Step 4: Create Achievement.java entity
- [ ] Step 5: Create Territory.java entity
- [ ] Step 6: Create all 5 Repository interfaces
- [ ] Step 7: Run mvn spring-boot:run, verify tables created in MySQL
- [ ] Step 8: Add GameState initialization in DataInitializer.java

## Task 2: DTOs (8 files)

Files: Create in src/main/java/com/studyhub/dto/

- [ ] Step 1: QuizSetRequest.java (mode, domainId, examYear, count, keyword)
- [ ] Step 2: AnswerRequest.java (questionId, userAnswer)
- [ ] Step 3: AnswerResponse.java (correct, answer, analysis, memory, game)
- [ ] Step 4: ProgressSummary.java (schemaVersion, exportedAt, attempts, answeredQuestions, wrong, bookmarks, latestAt)
- [ ] Step 5: GameStateDTO.java (exp, gold, level, title, nextExp, combo, loginStreak, achievements)
- [ ] Step 6: TerritoryDTO.java (domainId, domainName, state, accuracy, bossDefeated, bossUnlocked, questionsAnswered, totalQuestions)
- [ ] Step 7: ChallengeResultRequest.java (answers: [{questionId, userAnswer}])
- [ ] Step 8: Verify compilation: mvn compile

## Task 3: QuizService - Core Quiz Logic

Files: Create src/main/java/com/studyhub/service/QuizService.java

- [ ] Step 1: Create service skeleton with @Service, @RequiredArgsConstructor, inject repos
- [ ] Step 2: Define SM-2 intervals: [1, 1, 3, 7, 14, 30]
- [ ] Step 3: Implement buildPracticeSet() - 7 modes (continue/review/special/exam/wrong/favorite/browse)
- [ ] Step 4: Implement continueFromLatest() - rotate queue from last answered question
- [ ] Step 5: Implement buildReviewSet() - query due MemoryCards, fill with unanswered
- [ ] Step 6: Implement gradeAnswer() - save AnswerRecord + update MemoryCard (SM-2) + call GameService
- [ ] Step 7: Implement latestAttemptByQuestion() helper
- [ ] Step 8: Verify: run app, POST /api/quiz/set with mode=continue, check response

## Task 4: GameService - RPG Logic

Files: Create src/main/java/com/studyhub/service/GameService.java

- [ ] Step 1: Define LEVELS [0,100,500,1000,2500,5000,10000] and TITLES [7 levels]
- [ ] Step 2: Implement onAnswer(correct) - update exp, combo, check level up, check achievements
- [ ] Step 3: Implement calcLevel(exp) - binary search through LEVELS
- [ ] Step 4: Implement checkAchievements() - first_blood, combo_king, hundred_kills, thousand_kills, seven_day_streak
- [ ] Step 5: Implement getOrCreate() - daily reset (challenge count, login streak)
- [ ] Step 6: Implement calculateGold(correct, total) - 0/10/20/30/50 tiers
- [ ] Step 7: Implement onChallengeResult(correct, total) - award gold, increment used count
- [ ] Step 8: Implement onBossVictory() - +100 exp, -30 gold, check level up
- [ ] Step 9: Verify: call onAnswer(true) twice, check exp increases, combo builds

## Task 5: MemoryService + TerritoryService + ProgressService

Files: Create 3 service files

**MemoryService:**
- [ ] Step 1: getDueCards(count) - query MemoryCard where nextReviewAt <= now, limit count
- [ ] Step 2: getStats() - aggregate counts by state (new/learning/mastered/due/wrong)

**TerritoryService:**
- [ ] Step 3: getMap() - join domains + territories, return list of TerritoryDTO
- [ ] Step 4: updateTerritory(domainId, accuracy) - update state based on accuracy thresholds
- [ ] Step 5: tryBossBattle(domainId) - check accuracy >= 0.8
- [ ] Step 6: defeatBoss(domainId) - set bossDefeated=true, state=conquered

**ProgressService:**
- [ ] Step 7: exportProgress() - assemble JSON with attempts + bookmarks + game data
- [ ] Step 8: previewImport(payload) - return ProgressSummary without writing
- [ ] Step 9: applyImport(payload) - clear and rewrite answer_records + bookmarks
- [ ] Step 10: generateDiagnosis() - build enhanced ai-diagnosis.json

## Task 6: REST API Controllers (5 controllers)

Files: Rewrite QuizController, create 4 new controllers

- [ ] Step 1: Rewrite QuizController as @RestController with /api prefix
  - GET /api/questions, GET /api/questions/{id}, GET /api/questions/modules
  - POST /api/quiz/set, POST /api/quiz/answer
- [ ] Step 2: Create MemoryController - GET /api/memory/due, GET /api/memory/stats
- [ ] Step 3: Create ProgressController - GET /api/progress/export, POST /api/progress/import/preview, POST /api/progress/import/apply, GET /api/progress/diagnosis
- [ ] Step 4: Create GameController - GET /api/game/state, POST /api/game/daily-challenge, POST /api/game/daily-challenge/result, POST /api/game/boss/{id}, POST /api/game/boss/{id}/result, GET /api/game/achievements
- [ ] Step 5: Create TerritoryController - GET /api/territories
- [ ] Step 6: Verify: start app, test all endpoints with curl

## Task 7: Vue 3 App Bootstrap + Router + API

Files: Create app.js, rewrite router.js, modify index.html, modify api.js

- [ ] Step 1: Update index.html - add Vue 3 CDN script, div#app wrapper, module script tag
- [ ] Step 2: Create app.js - createApp with hash router, mount to #app
- [ ] Step 3: Update api.js - add all new endpoints (quiz, game, memory, progress, bookmarks, territories)
- [ ] Step 4: Verify: open http://localhost:8080, check Vue 3 loads without errors

## Task 8: Quiz Page Components (10 components)

Files: Create 10 component files in frontend/js/components/ + frontend/js/pages/quiz-page.js

- [ ] Step 1: game-hud.js - top bar with level/title/EXP bar/gold/combo/streak
- [ ] Step 2: mode-selector.js - 7 mode buttons, emits start event
- [ ] Step 3: question-panel.js - stem + ABCD options, click-to-select, parse optionsJson
- [ ] Step 4: battle-feedback.js - animated correct/wrong + combo + level up + achievement
- [ ] Step 5: analysis-panel.js - correct answer, user answer, analysis text
- [ ] Step 6: bookmark-button.js - toggle star, calls api.toggleBookmark
- [ ] Step 7: answer-card.js - grid of question numbers, color-coded, clickable jump
- [ ] Step 8: result-summary.js - correct count, percentage, EXP gained
- [ ] Step 9: chapter-progress.js - collapsible per-domain progress bars
- [ ] Step 10: quiz-page.js - orchestrator component, wires all sub-components
- [ ] Step 11: Verify - open app, select mode, click through questions, see feedback

## Task 9: Data Page + CSS

Files: Create data-page.js + 4 components, update quiz.css + style.css

- [ ] Step 1: data-page.js - page orchestrator with game-stats + progress-export + progress-import + diagnosis-export + data-summary
- [ ] Step 2: game-stats.js - achievement wall + game stats display
- [ ] Step 3: progress-export.js - download JSON button
- [ ] Step 4: progress-import.js - file upload -> preview -> confirm -> apply
- [ ] Step 5: diagnosis-export.js - download ai-diagnosis.json button
- [ ] Step 6: data-summary.js - question/answer/accuracy overview
- [ ] Step 7: Update quiz.css - game HUD, battle feedback, quiz options, answer card, achievement grid, quiz layout
- [ ] Step 8: Update style.css - add game-stats, data-page, achievement-wall styles
- [ ] Step 9: Verify - navigate to #/data, test export/import/diagnosis buttons
