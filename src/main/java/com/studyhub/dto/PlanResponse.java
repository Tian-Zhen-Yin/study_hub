package com.studyhub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanResponse {
    private int weekNum;
    private List<WeeklyPlanItem> planItems;
    private List<TaskView> tasks;
    private int totalEstimatedMinutes;
    private int tokensUsed;
    private boolean degraded;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskView {
        private Long id;
        private String text;
        private Boolean done;
        private String day;
        private Long domainId;
        private String focus;
        private Integer estimatedMinutes;
        private String source;
    }
}
