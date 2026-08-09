package com.studyhub.dto;

import lombok.Data;
import java.util.List;

@Data
public class GameStateDTO {
    private int exp;
    private int gold;
    private int level;
    private String title;
    private int nextExp;
    private int currentCombo;
    private int maxCombo;
    private int dailyChallengesUsed;
    private int dailyChallengesMax = 3;
    private int loginStreak;
    private List<String> achievements;
}
