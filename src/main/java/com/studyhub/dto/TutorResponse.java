package com.studyhub.dto;

import com.studyhub.entity.ErrorType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TutorResponse {
    private String explanation;
    private ErrorType errorType;
    private String errorTypeLabel;
    private double confidence;
    private boolean cached;
    private boolean degraded;
    private int tokensUsed;

    public static TutorResponse degraded(String fallbackExplanation) {
        return TutorResponse.builder()
            .explanation(fallbackExplanation)
            .errorType(null)
            .errorTypeLabel(null)
            .confidence(0.0)
            .cached(false)
            .degraded(true)
            .tokensUsed(0)
            .build();
    }

    public static TutorResponse fromCache(String explanation, ErrorType errorType,
                                          double confidence) {
        return TutorResponse.builder()
            .explanation(explanation)
            .errorType(errorType)
            .errorTypeLabel(errorType != null ? errorType.getLabel() : null)
            .confidence(confidence)
            .cached(true)
            .degraded(false)
            .tokensUsed(0)
            .build();
    }
}
