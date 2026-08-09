package com.studyhub.dto;

import lombok.Data;

@Data
public class TerritoryDTO {
    private Long domainId;
    private String domainName;
    private String state;
    private double accuracy;
    private boolean bossDefeated;
    private boolean bossUnlocked;
    private int questionsAnswered;
    private int totalQuestions;
}
