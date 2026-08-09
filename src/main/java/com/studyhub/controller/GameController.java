package com.studyhub.controller;

import com.studyhub.dto.*;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import com.studyhub.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final GameStateRepository gameStateRepo;
    private final AchievementRepository achievementRepo;
    private final QuestionRepository questionRepo;
    private final TerritoryService territoryService;

    @GetMapping("/state")
    public ResponseEntity<GameStateDTO> getState() {
        GameState gs = gameService.getOrCreate();
        GameStateDTO dto = new GameStateDTO();
        dto.setExp(gs.getExp());
        dto.setGold(gs.getGold());
        dto.setLevel(gs.getLevel());
        dto.setTitle(gs.getTitle());
        dto.setCurrentCombo(gs.getCurrentCombo());
        dto.setMaxCombo(gs.getMaxCombo());
        dto.setDailyChallengesUsed(gs.getDailyChallengesUsed());
        dto.setLoginStreak(gs.getLoginStreak());
        int[] levels = {0, 100, 500, 1000, 2500, 5000, 10000};
        if (gs.getLevel() < levels.length) dto.setNextExp(levels[gs.getLevel()]);
        else dto.setNextExp(gs.getExp());
        dto.setAchievements(achievementRepo.findAll().stream()
            .map(Achievement::getAchievementKey).collect(Collectors.toList()));
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/daily-challenge")
    public ResponseEntity<?> startChallenge() {
        GameState gs = gameService.getOrCreate();
        if (gs.getDailyChallengesUsed() >= 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "today limit reached"));
        }
        List<Question> questions = questionRepo.findAll().stream()
            .limit(20).collect(Collectors.toList());
        Map<String, Object> resp = new HashMap<>();
        resp.put("questions", questions);
        resp.put("timeLimit", 600);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/daily-challenge/result")
    public ResponseEntity<?> submitChallenge(@RequestBody ChallengeResultRequest req) {
        int correct = 0;
        for (ChallengeResultRequest.AnswerItem a : req.getAnswers()) {
            Question q = questionRepo.findById(a.getQuestionId()).orElse(null);
            if (q != null && q.getAnswer() != null
                && q.getAnswer().trim().equalsIgnoreCase(a.getUserAnswer().trim())) {
                correct++;
            }
        }
        AnswerResponse.GameDelta delta = gameService.onChallengeResult(correct, req.getAnswers().size());
        int gold = gameService.calculateGold(correct, req.getAnswers().size());
        Map<String, Object> resp = new HashMap<>();
        resp.put("correct", correct);
        resp.put("total", req.getAnswers().size());
        resp.put("gold", gold);
        resp.put("gameDelta", delta);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/boss/{domainId}")
    public ResponseEntity<?> startBoss(@PathVariable Long domainId) {
        GameState gs = gameService.getOrCreate();
        if (gs.getGold() < 30) {
            return ResponseEntity.badRequest().body(Map.of("error", "not enough gold"));
        }
        if (!territoryService.tryBossBattle(domainId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "boss not unlocked"));
        }
        List<Question> questions = questionRepo.findByDomainId(domainId).stream()
            .limit(10).collect(Collectors.toList());
        Map<String, Object> resp = new HashMap<>();
        resp.put("questions", questions);
        resp.put("timeLimit", 300);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/boss/{domainId}/result")
    public ResponseEntity<?> submitBoss(@PathVariable Long domainId,
                                         @RequestBody ChallengeResultRequest req) {
        boolean allCorrect = req.getAnswers().stream().allMatch(a -> {
            Question q = questionRepo.findById(a.getQuestionId()).orElse(null);
            return q != null && q.getAnswer() != null
                && q.getAnswer().trim().equalsIgnoreCase(a.getUserAnswer().trim());
        });
        Map<String, Object> result = new HashMap<>();
        GameState gs = gameService.getOrCreate();
        if (allCorrect) {
            territoryService.defeatBoss(domainId);
            AnswerResponse.GameDelta delta = gameService.onBossVictory(gs);
            result.put("victory", true);
            result.put("gameDelta", delta);
        } else {
            gs.setGold(gs.getGold() - 30);
            gameStateRepo.save(gs);
            result.put("victory", false);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/achievements")
    public ResponseEntity<List<Achievement>> getAchievements() {
        return ResponseEntity.ok(achievementRepo.findAll());
    }
}
