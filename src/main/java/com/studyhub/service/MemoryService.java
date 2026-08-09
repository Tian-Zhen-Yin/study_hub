package com.studyhub.service;

import com.studyhub.entity.MemoryCard;
import com.studyhub.entity.Question;
import com.studyhub.repository.MemoryCardRepository;
import com.studyhub.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemoryService {

    private final MemoryCardRepository memoryCardRepo;
    private final QuestionRepository questionRepo;

    public List<Map<String, Object>> getAllCards() {
        return memoryCardRepo.findAll().stream()
            .map(this::enrichCard)
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getDueCards(int count) {
        LocalDateTime now = LocalDateTime.now();
        List<MemoryCard> due = memoryCardRepo.findAll().stream()
            .filter(c -> c.getNextReviewAt() == null || c.getNextReviewAt().isBefore(now))
            .limit(count).collect(Collectors.toList());
        if (due.isEmpty()) {
            due = memoryCardRepo.findAll().stream().limit(count).collect(Collectors.toList());
        }
        return due.stream().map(this::enrichCard).collect(Collectors.toList());
    }

    private Map<String, Object> enrichCard(MemoryCard card) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", card.getId());
        map.put("questionId", card.getQuestionId());
        map.put("question", card.getQuestion());
        map.put("answer", card.getAnswer());
        map.put("intervalDays", card.getIntervalDays());
        map.put("easeFactor", card.getEaseFactor());
        map.put("streak", card.getStreak());
        map.put("state", card.getState());
        map.put("nextReviewAt", card.getNextReviewAt());
        map.put("wrongCount", card.getWrongCount());
        map.put("correctCount", card.getCorrectCount());
        map.put("lastAnswerAt", card.getLastAnswerAt());
        map.put("createdAt", card.getCreatedAt());
        map.put("updatedAt", card.getUpdatedAt());

        if (card.getQuestionId() != null && card.getQuestionId() > 0) {
            questionRepo.findById(card.getQuestionId()).ifPresent(q -> {
                map.put("questionStem", q.getStem());
                map.put("questionOptions", q.getOptionsJson());
                map.put("questionAnswer", q.getAnswer());
                map.put("questionAnalysis", q.getAnalysis());
                if (q.getDomain() != null) {
                    map.put("domainName", q.getDomain().getName());
                }
            });
        }
        return map;
    }

    @Transactional
    public MemoryCard createCard(String question, String answer) {
        MemoryCard card = new MemoryCard();
        card.setQuestion(question);
        card.setAnswer(answer);
        card.setQuestionId(0L);
        card.setState("new");
        card.setStreak(0);
        card.setWrongCount(0);
        card.setCorrectCount(0);
        card.setIntervalDays(1);
        card.setEaseFactor(2.5);
        card.setNextReviewAt(LocalDateTime.now());
        return memoryCardRepo.save(card);
    }

    @Transactional
    public MemoryCard reviewCard(Long id, int quality) {
        MemoryCard card = memoryCardRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Card not found: " + id));

        // SM-2 Algorithm
        double ef = card.getEaseFactor();
        int interval = card.getIntervalDays();
        int streak = card.getStreak();

        if (quality >= 2) {
            // Correct
            card.setCorrectCount(card.getCorrectCount() + 1);
            streak++;
            if (streak == 1) interval = 1;
            else if (streak == 2) interval = 3;
            else interval = (int) Math.round(interval * ef);
            ef = ef + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
            if (ef < 1.3) ef = 1.3;
            card.setState(streak >= 5 ? "mastered" : "learning");
        } else {
            // Wrong/Forgot
            card.setWrongCount(card.getWrongCount() + 1);
            streak = 0;
            interval = 1;
            ef = Math.max(1.3, ef - 0.2);
            card.setState("learning");
        }

        card.setStreak(streak);
        card.setIntervalDays(interval);
        card.setEaseFactor(ef);
        card.setNextReviewAt(LocalDateTime.now().plusDays(interval));
        card.setLastAnswerAt(LocalDateTime.now());
        return memoryCardRepo.save(card);
    }

    @Transactional
    public void deleteCard(Long id) {
        memoryCardRepo.deleteById(id);
    }

    public Map<String, Object> getStats() {
        List<MemoryCard> all = memoryCardRepo.findAll();
        LocalDateTime now = LocalDateTime.now();
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", all.size());
        stats.put("new", all.stream().filter(c -> "new".equals(c.getState())).count());
        stats.put("learning", all.stream().filter(c -> "learning".equals(c.getState())).count());
        stats.put("mastered", all.stream().filter(c -> "mastered".equals(c.getState())).count());
        stats.put("due", all.stream().filter(c -> c.getNextReviewAt() != null && c.getNextReviewAt().isBefore(now)).count());
        return stats;
    }
}