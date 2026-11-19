package com.studyhub.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnswerResponse {
    private boolean correct;
    private String answer;
    private String analysis;
    private Long answerRecordId;
    private MemoryInfo memory;
    private GameDelta game;
    /** 答错时的考点信息（举一反三入口） */
    private AnswerMeta meta;

    @Data
    @Builder
    public static class AnswerMeta {
        private String knowledgePoint;
        private Long variantCount;
    }

    @Data
    @Builder
    public static class MemoryInfo {
        private int streak;
        private String state;
        private String nextReviewAt;
    }

    @Data
    @Builder
    public static class GameDelta {
        private int exp;
        private int combo;
        private boolean levelUp;
        private String newTitle;
        private String achievementUnlocked;
    }
}
