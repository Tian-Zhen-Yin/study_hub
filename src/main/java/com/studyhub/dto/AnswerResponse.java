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
