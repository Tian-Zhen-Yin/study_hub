package com.studyhub.service;

import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FiveElementsService {

    private final UserProfileRepository userProfileRepo;
    private final AnswerRecordRepository answerRecordRepo;
    private final MemoryCardRepository memoryCardRepo;

    private static final double CLAMP_MIN = 0.0;
    private static final double CLAMP_MAX = 1.0;
    private static final double CRISIS_THRESHOLD = 0.35;
    private static final double OVERGROWTH_THRESHOLD = 0.85;

    private static final double ALPHA = 0.15;

    @Transactional
    public void updateOnAnswer(boolean correct, Long questionId) {
        UserProfile profile = getOrCreate();
        AnswerRecord latestRecord = findLatestRecord(questionId);

        double metal = profile.getMetalPrecision();
        double wood = profile.getWoodGrowth();
        double water = profile.getWaterFluency();
        double fire = profile.getFireEnthusiasm();
        double earth = profile.getEarthStability();

        metal = updateMetal(metal, correct);
        wood = updateWood(wood, correct);
        water = updateWater(water, correct, latestRecord);
        fire = updateFire(fire, profile);
        earth = updateEarth(earth, correct, questionId);

        profile.setMetalPrecision(clamp(metal));
        profile.setWoodGrowth(clamp(wood));
        profile.setWaterFluency(clamp(water));
        profile.setFireEnthusiasm(clamp(fire));
        profile.setEarthStability(clamp(earth));

        profile.setTotalRounds(profile.getTotalRounds() + 1);
        if (correct) {
            profile.setTotalCorrect(profile.getTotalCorrect() + 1);
            profile.setCurrentStreak(profile.getCurrentStreak() + 1);
        } else {
            profile.setCurrentStreak(0);
        }
        profile.setLastAnswerAt(LocalDateTime.now());

        double balance = calculateBalanceScore(
            profile.getMetalPrecision(), profile.getWoodGrowth(),
            profile.getWaterFluency(), profile.getFireEnthusiasm(),
            profile.getEarthStability());
        profile.setBalanceScore(balance);
        profile.setCrisisDimension(detectCrisis(profile));

        userProfileRepo.save(profile);
    }

    private double updateMetal(double current, boolean correct) {
        if (correct) {
            return current + ALPHA * (1.0 - current);
        } else {
            return current - 0.03 * current;
        }
    }

    private double updateWood(double current, boolean correct) {
        if (correct) {
            return current + 0.01 * (1.0 - current);
        } else {
            double growthBoost = Math.max(0, 0.7 - current) * 0.02;
            return current + growthBoost;
        }
    }

    private double updateWater(double current, boolean correct, AnswerRecord latestRecord) {
        if (latestRecord == null) return current;
        long responseSeconds = 30;
        if (latestRecord.getCreatedAt() != null) {
        }
        if (responseSeconds < 10) {
            return current + (correct ? 0.03 : 0.01) * (1.0 - current);
        } else if (responseSeconds > 60) {
            return current - 0.02 * current;
        }
        return current + (correct ? 0.01 : 0.0) * (1.0 - current);
    }

    private double updateFire(double current, UserProfile profile) {
        int todayRounds = countTodayAnswers(profile);
        double frequencyScore = Math.min(1.0, todayRounds / 20.0);
        return current + ALPHA * (frequencyScore - current);
    }

    private double updateEarth(double current, boolean correct, Long questionId) {
        MemoryCard card = memoryCardRepo.findByQuestionId(questionId).orElse(null);
        if (card == null) {
            return current + (correct ? 0.01 : 0.0) * (1.0 - current);
        }
        int interval = card.getIntervalDays() != null ? card.getIntervalDays() : 1;
        int streak = card.getStreak() != null ? card.getStreak() : 0;
        double intervalFactor = Math.min(1.0, interval / 14.0);
        double streakFactor = Math.min(1.0, streak / 5.0);
        double earthTarget = (intervalFactor + streakFactor) / 2.0;
        return current + ALPHA * (earthTarget - current);
    }

    public double calculateBalanceScore(double metal, double wood, double water, double fire, double earth) {
        double[] dims = {metal, wood, water, fire, earth};
        double sum = 0;
        for (double d : dims) {
            sum += d;
        }
        if (sum <= 0) return 0.0;
        double entropy = 0;
        for (double d : dims) {
            if (d > 0) {
                double p = d / sum;
                entropy -= p * Math.log(p);
            }
        }
        return entropy / Math.log(5);
    }

    public String detectCrisis(UserProfile profile) {
        Map<String, Double> dims = new LinkedHashMap<>();
        dims.put("metal", profile.getMetalPrecision());
        dims.put("wood", profile.getWoodGrowth());
        dims.put("water", profile.getWaterFluency());
        dims.put("fire", profile.getFireEnthusiasm());
        dims.put("earth", profile.getEarthStability());

        String crisisDim = null;
        double minVal = CRISIS_THRESHOLD;
        for (Map.Entry<String, Double> e : dims.entrySet()) {
            if (e.getValue() < minVal) {
                minVal = e.getValue();
                crisisDim = e.getKey();
            }
        }
        if (crisisDim != null) return crisisDim;

        String overgrowthDim = null;
        double maxVal = OVERGROWTH_THRESHOLD;
        for (Map.Entry<String, Double> e : dims.entrySet()) {
            if (e.getValue() > maxVal) {
                maxVal = e.getValue();
                overgrowthDim = e.getKey();
            }
        }
        return overgrowthDim;
    }

    public Map<String, Object> getProfileAsMap(UserProfile profile) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("metal", Map.of("name", "金·精准", "value", round3(profile.getMetalPrecision())));
        map.put("wood", Map.of("name", "木·成长", "value", round3(profile.getWoodGrowth())));
        map.put("water", Map.of("name", "水·流畅", "value", round3(profile.getWaterFluency())));
        map.put("fire", Map.of("name", "火·热情", "value", round3(profile.getFireEnthusiasm())));
        map.put("earth", Map.of("name", "土·稳固", "value", round3(profile.getEarthStability())));
        map.put("balanceScore", round3(profile.getBalanceScore()));
        map.put("crisisDimension", profile.getCrisisDimension());
        map.put("totalRounds", profile.getTotalRounds());
        map.put("totalCorrect", profile.getTotalCorrect());
        map.put("accuracy", profile.getTotalRounds() > 0
            ? round3((double) profile.getTotalCorrect() / profile.getTotalRounds())
            : 0.0);
        map.put("currentStreak", profile.getCurrentStreak());
        map.put("lastAnswerAt", profile.getLastAnswerAt());
        return map;
    }

    @Transactional
    public UserProfile getOrCreate() {
        return userProfileRepo.findById(1L).orElseGet(() -> {
            UserProfile p = new UserProfile();
            p.setId(1L);
            p.setBalanceScore(calculateBalanceScore(0.5, 0.5, 0.5, 0.5, 0.5));
            return userProfileRepo.save(p);
        });
    }

    private int countTodayAnswers(UserProfile profile) {
        if (profile.getLastAnswerAt() == null) return 0;
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        return (int) answerRecordRepo.countByCreatedAtAfter(startOfDay);
    }

    private AnswerRecord findLatestRecord(Long questionId) {
        if (questionId == null) return null;
        List<AnswerRecord> records = answerRecordRepo.findByQuestionIdOrderByCreatedAtDesc(questionId);
        return records.isEmpty() ? null : records.get(0);
    }

    private double clamp(double v) {
        return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, v));
    }

    private double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
