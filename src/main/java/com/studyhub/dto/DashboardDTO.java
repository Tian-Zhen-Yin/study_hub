package com.studyhub.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {

    private Stats stats;
    private List<TodayTask> todayTasks;
    private List<RadarItem> radarData;
    private List<RecentSimulation> recentSimulations;
    private Integer streak;
    private Boolean converged;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stats {
        private Double totalHours;
        private Double weeklyHours;
        private Double taskCompletionRate;
        private Integer streak;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TodayTask {
        private Long id;
        private String text;
        private Boolean done;
        private Integer weekNum;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RadarItem {
        private Long id;
        private String name;
        private Integer pct;
        private String state;
        private String priority;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSimulation {
        private Long id;
        private String simDate;
        private Integer knowledgeScore;
        private Integer caseScore;
        private Integer essayScore;
        private Boolean convergence;
    }
}