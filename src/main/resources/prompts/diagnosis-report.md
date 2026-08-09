你是软考系统架构设计师考试的学习诊断专家。请基于以下学习数据，生成一份结构化诊断报告。

【学习者画像数据】
{{learnerProfile}}

【各知识域作答统计】
{{domainStats}}

【错因分布统计】
{{errorDistribution}}

【记忆卡状态】
{{memoryStats}}

【游戏化投入度】
{{gameState}}

请综合分析以上数据，生成诊断报告，严格返回 JSON，格式如下：
{
  "learnerProfile": {
    "summary": "一句话总结学习者当前状态",
    "strengths": ["优势知识域1", "优势知识域2"],
    "weaknesses": ["薄弱知识域1", "薄弱知识域2"]
  },
  "weakDomains": [
    {"domainId": 1, "domainName": "域名", "accuracy": 0.42, "errorCount": 28}
  ],
  "errorDistribution": {
    "CONCEPT_MISS": 0.58, "MEMORY_CONFUSE": 0.22, "MISREAD": 0.12, "CALC_ERROR": 0.08
  },
  "weeklyAdvice": "针对薄弱点的下周学习建议，200字以内，具体可执行"
}

要求：
1. weakDomains 按正确率从低到高排列，只列正确率低于 70% 的域
2. errorDistribution 的四项之和应为 1.0
3. weeklyAdvice 要结合错因分布给出针对性建议（如概念不会多就建议系统复习，记忆混淆多就建议用记忆卡）
