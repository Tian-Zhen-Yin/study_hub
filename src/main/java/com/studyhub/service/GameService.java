package com.studyhub.service;

import com.studyhub.dto.AnswerResponse.GameDelta;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameStateRepository gameStateRepo;
    private final AchievementRepository achievementRepo;

    private static final int[] LEVELS = {0, 100, 500, 1000, 2500, 5000, 10000};
    private static final String[] TITLES = {
        "\u5b66\u5f92", "\u521d\u7ea7\u67b6\u6784\u5e08", "\u4e2d\u7ea7\u67b6\u6784\u5e08",
        "\u9ad8\u7ea7\u67b6\u6784\u5e08", "\u8d44\u6df1\u67b6\u6784\u5e08",
        "\u67b6\u6784\u4e13\u5bb6", "\u67b6\u6784\u5b97\u5e08"
    };

    @Transactional
    public GameDelta onAnswer(boolean correct) {
        GameState gs = getOrCreate();
        boolean levelUp = false;
        String achievement = null;
        String newTitle = null;
        int oldLevel = gs.getLevel();

        if (correct) {
            gs.setExp(gs.getExp() + 1);
            gs.setCurrentCombo(gs.getCurrentCombo() + 1);
            if (gs.getCurrentCombo() >= 5) {
                gs.setExp(gs.getExp() + 1);
            }
            if (gs.getCurrentCombo() > gs.getMaxCombo()) {
                gs.setMaxCombo(gs.getCurrentCombo());
            }
        } else {
            gs.setCurrentCombo(0);
        }

        gs.setLevel(calcLevel(gs.getExp()));
        gs.setTitle(TITLES[gs.getLevel() - 1]);
        if (gs.getLevel() > oldLevel) {
            levelUp = true;
            newTitle = gs.getTitle();
        }

        achievement = checkAchievements(gs);
        gameStateRepo.save(gs);

        return GameDelta.builder()
            .exp(gs.getExp())
            .combo(gs.getCurrentCombo())
            .levelUp(levelUp)
            .newTitle(newTitle)
            .achievementUnlocked(achievement)
            .build();
    }

    private int calcLevel(int exp) {
        for (int i = LEVELS.length - 1; i >= 0; i--) {
            if (exp >= LEVELS[i]) return i + 1;
        }
        return 1;
    }

    private String checkAchievements(GameState gs) {
        if (gs.getExp() >= 1 && !achievementRepo.existsByAchievementKey("first_blood")) {
            achievementRepo.save(newAchievement("first_blood"));
            return "\u521d\u51fa\u8305\u5e90";
        }
        if (gs.getMaxCombo() >= 20 && !achievementRepo.existsByAchievementKey("combo_king")) {
            achievementRepo.save(newAchievement("combo_king"));
            return "\u8fde\u51fb\u4e4b\u738b";
        }
        if (gs.getExp() >= 100 && !achievementRepo.existsByAchievementKey("hundred_kills")) {
            achievementRepo.save(newAchievement("hundred_kills"));
            return "\u767e\u9898\u65a9";
        }
        if (gs.getExp() >= 1000 && !achievementRepo.existsByAchievementKey("thousand_kills")) {
            achievementRepo.save(newAchievement("thousand_kills"));
            return "\u5343\u9898\u65a9";
        }
        if (gs.getLoginStreak() >= 7 && !achievementRepo.existsByAchievementKey("seven_day_streak")) {
            achievementRepo.save(newAchievement("seven_day_streak"));
            return "\u4e03\u65e5\u575a\u6301";
        }
        return null;
    }

    private Achievement newAchievement(String key) {
        Achievement a = new Achievement();
        a.setAchievementKey(key);
        return a;
    }

    @Transactional
    public GameState getOrCreate() {
        GameState gs = gameStateRepo.findTopByOrderByIdAsc().orElseGet(() -> {
            GameState n = new GameState();
            n.setId(1L);
            return gameStateRepo.save(n);
        });

        LocalDate today = LocalDate.now();

        if (gs.getDailyChallengeDate() == null || !gs.getDailyChallengeDate().equals(today)) {
            gs.setDailyChallengesUsed(0);
            gs.setDailyChallengeDate(today);
        }

        if (gs.getLastLoginDate() != null) {
            if (gs.getLastLoginDate().equals(today.minusDays(1))) {
                gs.setLoginStreak(gs.getLoginStreak() + 1);
            } else if (!gs.getLastLoginDate().equals(today)) {
                gs.setLoginStreak(1);
            }
        } else {
            gs.setLoginStreak(1);
        }
        gs.setLastLoginDate(today);

        if (gs.getDailyChallengesUsed() >= 3 && !achievementRepo.existsByAchievementKey("perfect_day")) {
            achievementRepo.save(newAchievement("perfect_day"));
        }

        return gameStateRepo.save(gs);
    }

    public int calculateGold(int correct, int total) {
        double pct = (double) correct / total;
        if (pct >= 1.0) return 50;
        if (pct >= 0.9) return 30;
        if (pct >= 0.7) return 20;
        if (pct >= 0.5) return 10;
        return 0;
    }

    @Transactional
    public GameDelta onChallengeResult(int correct, int total) {
        GameState gs = getOrCreate();
        int gold = calculateGold(correct, total);
        gs.setGold(gs.getGold() + gold);
        gs.setDailyChallengesUsed(gs.getDailyChallengesUsed() + 1);

        String achievement = null;
        if (correct == total && !achievementRepo.existsByAchievementKey("flawless")) {
            achievementRepo.save(newAchievement("flawless"));
            achievement = "\u4e0d\u6b7b\u9e1f";
        }

        gameStateRepo.save(gs);
        return GameDelta.builder()
            .exp(gs.getExp())
            .combo(gs.getCurrentCombo())
            .levelUp(false)
            .achievementUnlocked(achievement)
            .build();
    }

    @Transactional
    public GameDelta onBossVictory(GameState gs) {
        gs.setExp(gs.getExp() + 100);
        gs.setGold(gs.getGold() - 30);
        int oldLevel = gs.getLevel();
        gs.setLevel(calcLevel(gs.getExp()));
        gs.setTitle(TITLES[gs.getLevel() - 1]);

        String achievement = null;
        boolean conquered = territoryFullyConquered();
        if (conquered && !achievementRepo.existsByAchievementKey("total_domination")) {
            achievementRepo.save(newAchievement("total_domination"));
            achievement = "\u5168\u5883\u7edf\u4e00";
        }
        if (!achievementRepo.existsByAchievementKey("conqueror")) {
            achievementRepo.save(newAchievement("conqueror"));
            if (achievement == null) achievement = "\u5f81\u670d\u8005";
        }

        gameStateRepo.save(gs);
        return GameDelta.builder()
            .exp(gs.getExp())
            .combo(gs.getCurrentCombo())
            .levelUp(gs.getLevel() > oldLevel)
            .newTitle(gs.getLevel() > oldLevel ? gs.getTitle() : null)
            .achievementUnlocked(achievement)
            .build();
    }

    private boolean territoryFullyConquered() {
        return false; // TODO: check all territories from TerritoryService
    }
}
