-- ============================================================
-- 取消 mock 数据: 清理 MockDataInitializer 历史加载到 DB 的内容
-- 说明: mock 题通过 questions.source='MOCK' 识别; 级联删除
--       ErrorTag / MemoryCard / AnswerRecord 后, 再删 Question 本身.
--       GameState 是单例行, MockDataInitializer 用 id=1 写入, 清除后
--       GameService.getOrCreate() 会在下次调用时自动重建为默认值.
-- ============================================================

SET @db := DATABASE();
SELECT @db AS target_db;

-- 1) 备份前看一眼
SELECT '=== 清理前 ===' AS step;
SELECT
  (SELECT COUNT(*) FROM questions     WHERE source = 'MOCK')   AS mock_questions,
  (SELECT COUNT(*) FROM answer_records WHERE question_id IN
     (SELECT id FROM questions WHERE source = 'MOCK'))         AS mock_answer_records,
  (SELECT COUNT(*) FROM error_tags    WHERE question_id IN
     (SELECT id FROM questions WHERE source = 'MOCK'))         AS mock_error_tags,
  (SELECT COUNT(*) FROM memory_cards  WHERE question_id IN
     (SELECT id FROM questions WHERE source = 'MOCK'))         AS mock_memory_cards,
  (SELECT COUNT(*) FROM game_state
     WHERE level = 3 AND exp = 500 AND title = '中级架构师')    AS mock_game_state;

START TRANSACTION;

-- 2) 删 ErrorTag (按 question_id 冗余字段)
DELETE FROM error_tags
 WHERE question_id IN (SELECT id FROM questions WHERE source = 'MOCK');

-- 3) 删 MemoryCard (按 question_id 冗余字段)
DELETE FROM memory_cards
 WHERE question_id IN (SELECT id FROM questions WHERE source = 'MOCK');

-- 4) 删 AnswerRecord (按 question_id 外键)
DELETE FROM answer_records
 WHERE question_id IN (SELECT id FROM questions WHERE source = 'MOCK');

-- 5) 删 Question 本身
DELETE FROM questions
 WHERE source = 'MOCK';

-- 6) 删预置 GameState: MockDataInitializer 唯一的特征是 title='中级架构师' 且 level=3 且 gold=120.
--    (用户答题可能改过 exp/max_combo, 所以不依赖这些字段)
DELETE FROM game_state
 WHERE level = 3 AND gold = 120 AND title = '中级架构师';

COMMIT;

-- 7) 校验清理后
SELECT '=== 清理后 ===' AS step;
SELECT
  (SELECT COUNT(*) FROM questions       WHERE source = 'MOCK') AS remaining_mock_questions,
  (SELECT COUNT(*) FROM questions)                              AS total_questions,
  (SELECT COUNT(*) FROM answer_records)                          AS total_answer_records,
  (SELECT COUNT(*) FROM error_tags)                             AS total_error_tags,
  (SELECT COUNT(*) FROM memory_cards)                           AS total_memory_cards,
  (SELECT COUNT(*) FROM game_state)                             AS total_game_state;
