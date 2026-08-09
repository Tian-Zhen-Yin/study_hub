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

    public List<TerritoryDTO> getMap() {
        List<Domain> domains = domainRepo.findAll();
        Map<Long, Territory> territoryMap = territoryRepo.findAll()
            .stream().collect(Collectors.toMap(Territory::getDomainId, t -> t, (existing, replacement) -> existing));

        return domains.stream().map(d -> {
            Territory t = territoryMap.get(d.getId());
        if (t == null) {
            t = createDefault(d.getId());
        }
            TerritoryDTO dto = new TerritoryDTO();
            dto.setDomainId(d.getId());
            dto.setDomainName(d.getName());
            dto.setState(t.getState());
            dto.setAccuracy(t.getAccuracy());
            dto.setBossDefeated(t.getBossDefeated());
            dto.setBossUnlocked(t.getAccuracy() >= 0.8);
            dto.setQuestionsAnswered(t.getQuestionsAnswered());
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

