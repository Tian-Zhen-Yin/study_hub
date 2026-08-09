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
public class WeeklyPlanItem {
    private Long domainId;
    private String domainName;
    private String focus;
    private String reason;
    private List<String> tasks;
    private int estimatedMinutes;
    private double accuracy;
    private int errorCount;
}
