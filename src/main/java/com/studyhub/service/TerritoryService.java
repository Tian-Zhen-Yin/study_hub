package com.studyhub.service;

import com.studyhub.dto.TerritoryDTO;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TerritoryService {

    private final TerritoryRepository territoryRepo;
    private final DomainRepository domainRepo;
    private final QuestionRepository questionRepo;
    private final AchievementRepository achievementRepo;
    private final AnswerRecordRepository answerRecordRepo;

    public List<TerritoryDTO> getMap() {
        List<Domain> domains = domainRepo.findAll();
        Map<Long, Territory> territoryMap = territoryRepo.findAll()
            .stream().collect(Collectors.toMap(Territory::getDomainId, t -> t, (existing, replacement) -> existing));

        // 实时从答题记录统计每个领域的答题数和正确率
        // 使用 DISTINCT question_id 避免重复答题导致已答数超过总题数
        Map<Long, double[]> stats = new HashMap<>();
        for (Object[] row : answerRecordRepo.aggregateByDomain()) {
            Long domainId = (Long) row[0];
            long totalAttempts = ((Number) row[1]).longValue();
            long correct = ((Number) row[2]).longValue();
            double acc = totalAttempts > 0 ? (double) correct / totalAttempts : 0.0;
            stats.put(domainId, new double[]{totalAttempts, acc});
        }
        // 统计每个领域已答的不同题目数（去重），避免超过总题数
        Map<Long, Long> distinctAnswered = new HashMap<>();
        for (Object[] row : answerRecordRepo.distinctQuestionsByDomain()) {
            Long domainId = (Long) row[0];
            long distinctCount = ((Number) row[1]).longValue();
            distinctAnswered.put(domainId, distinctCount);
        }

        return domains.stream().map(d -> {
            Territory t = territoryMap.get(d.getId());
        if (t == null) {
            t = createDefault(d.getId());
        }
            double[] s = stats.getOrDefault(d.getId(), new double[]{0, 0.0});
            // 使用去重后的题目数作为"已答"，避免超过总题数
            int answered = distinctAnswered.getOrDefault(d.getId(), 0L).intValue();
            double accuracy = s[1];
            boolean bossDefeated = Boolean.TRUE.equals(t.getBossDefeated());
            String state;
            if (bossDefeated) {
                state = "conquered";
            } else if (answered > 0 && accuracy >= 0.8) {
                state = "lit";
            } else if (answered > 0) {
                state = "learning";
            } else {
                state = "fog";
            }
            TerritoryDTO dto = new TerritoryDTO();
            dto.setDomainId(d.getId());
            dto.setDomainName(d.getName());
            dto.setState(state);
            dto.setAccuracy(accuracy);
            dto.setBossDefeated(bossDefeated);
            dto.setBossUnlocked(accuracy >= 0.8);
            dto.setQuestionsAnswered(answered);
            dto.setTotalQuestions((int) questionRepo.countByDomainId(d.getId()));
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void updateTerritory(Long domainId, double accuracy) {
        Territory t = territoryRepo.findByDomainId(domainId).orElseGet(() -> {
            Territory n = new Territory();
            n.setDomainId(domainId);
            return n;
        });
        t.setAccuracy(accuracy);
        t.setQuestionsAnswered(t.getQuestionsAnswered() + 1);

        if (accuracy >= 0.9 && t.getBossDefeated()) {
            t.setState("conquered");
        } else if (accuracy >= 0.8) {
            t.setState("lit");
        } else if (t.getQuestionsAnswered() > 0) {
            t.setState("learning");
        }
        territoryRepo.save(t);
    }

    public boolean tryBossBattle(Long domainId) {
        Territory t = territoryRepo.findByDomainId(domainId)
            .orElseThrow(() -> new RuntimeException("Territory not found"));
        return t.getAccuracy() >= 0.8;
    }

    @Transactional
    public void defeatBoss(Long domainId) {
        Territory t = territoryRepo.findByDomainId(domainId)
            .orElseThrow(() -> new RuntimeException("Territory not found"));
        t.setBossDefeated(true);
        t.setState("conquered");

        if (!achievementRepo.existsByAchievementKey("conqueror")) {
            Achievement a = new Achievement();
            a.setAchievementKey("conqueror");
            achievementRepo.save(a);
        }
        territoryRepo.save(t);
    }

    public boolean allConquered() {
        List<Territory> all = territoryRepo.findAll();
        return !all.isEmpty() && all.stream().allMatch(Territory::getBossDefeated);
    }

    private Territory createDefault(Long domainId) {
        Territory t = new Territory();
        t.setDomainId(domainId);
        return territoryRepo.save(t);
    }
}

