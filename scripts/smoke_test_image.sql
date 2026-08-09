INSERT INTO questions (source, subject, domain_id, stem, options_json, answer, analysis, source_file, image_url)
VALUES ('MANUAL', '综合知识', 1,
        '【配图测试】这是一道用于验证图片渲染的题目',
        '["选项A", "选项B", "选项C", "选项D"]',
        'A', '', 'smoke-test',
        'https://placehold.co/600x200/orange/white?text=StudyHub+Image+Test');
SELECT id, source, LEFT(stem, 30) AS stem_preview, image_url FROM questions WHERE source_file='smoke-test';
