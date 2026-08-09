package com.studyhub.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChallengeResultRequest {
    private List<AnswerItem> answers;

    @Data
    public static class AnswerItem {
        private Long questionId;
        private String userAnswer;
    }
}
