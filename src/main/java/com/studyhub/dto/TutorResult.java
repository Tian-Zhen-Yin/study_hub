package com.studyhub.dto;

import com.studyhub.entity.ErrorType;

public record TutorResult(
    String explanation,
    ErrorType errorType,
    double confidence
) {
    public static TutorResult partial(String explanation, ErrorType errorType, double confidence) {
        if (explanation == null || explanation.isBlank()) {
            explanation = "AI 未能生成有效解释，请参考标准解析。";
        }
        if (errorType == null) {
            errorType = ErrorType.CONCEPT_MISS;
        }
        return new TutorResult(explanation, errorType, confidence);
    }
}
