DELETE FROM questions WHERE source_file = 'smoke-test';
SELECT 'cleanup done' AS status, COUNT(*) AS remaining_smoke FROM questions WHERE source_file = 'smoke-test';
