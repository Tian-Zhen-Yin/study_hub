请分析下面这道答错的题目。

【题目】
{{question}}

【学生选择的答案】
{{userAnswer}}

【正确答案】
{{correctAnswer}}

【参考解析】
{{analysis}}

【该学生在同知识域的历史错因分布】
{{historyTags}}

请根据以上信息，给出：
1. explanation：为什么学生的答案是错的，正确答案为什么对，涉及什么核心知识点，如何避免再犯
2. errorType：判断这次错误属于哪类（CONCEPT_MISS/MISREAD/MEMORY_CONFUSE/CALC_ERROR）
3. confidence：你对错因判断的置信度（0.0-1.0）

严格返回 JSON，格式如下：
{"explanation": "...", "errorType": "CONCEPT_MISS", "confidence": 0.85}
