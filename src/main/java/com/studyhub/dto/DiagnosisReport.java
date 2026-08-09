package com.studyhub.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosisReport {
    private Long id;
    private LocalDate diagDate;
    private String triggerType;
    private LearnerProfile learnerProfile;
    private List<WeakDomain> weakDomains;
    private Map<String, Double> errorDistribution;
    private String weeklyAdvice;
    private List<Long> weakDomainRanking;
    private int tokensUsed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearnerProfile {
        private int level;
        private String title;
        private int totalAnswered;
        private double overallAccuracy;
        private int loginStreak;
        private String summary;
        private List<String> strengths;
        private List<String> weaknesses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeakDomain {
        private Long domainId;
        private String domainName;
        private double accuracy;
        private int errorCount;
    }
}
