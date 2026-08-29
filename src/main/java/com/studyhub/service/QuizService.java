
package com.studyhub.service;

import com.studyhub.dto.AnswerRequest;
import com.studyhub.dto.AnswerResponse;
import com.studyhub.dto.QuizSetRequest;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuestionRepository questionRepo;
    private final AnswerRecordRepository answerRecordRepo;
    private final MemoryCardRepository memoryCardRepo;
    private final BookmarkRepository bookmarkRepo;
    private final FiveElementsService fiveElementsService;

    private static final int[] INTERVALS = {1, 1, 3, 7, 14, 30};

    public List<Question> buildPracticeSet(QuizSetRequest req) {
        List<Question> pool = fetchPool(req);
        List<AnswerRecord> attempts = answerRecordRepo.findAll();
        Map<Long, AnswerRecord> latest = latestAttemptByQuestion(attempts);

        switch (req.getMode()) {
            case "continue":
            case "sequence":
                return continueFromLatest(pool, attempts);
            case "review":
            case "daily":
                return buildReviewSet(pool, req.getCount());
            case "special":
            case "exam":
                return pool;
            case "wrong":
            case "intensive":
                List<Question> wrong = pool.stream()
                    .filter(q -> latest.containsKey(q.getId()) && !latest.get(q.getId()).getIsCorrect())
                    .limit(req.getCount())
                    .collect(Collectors.toList());
                if (wrong.size() < 5) {
                    wrong = new ArrayList<>(pool);
                    Collections.shuffle(wrong);
                    wrong = wrong.stream().limit(req.getCount()).collect(Collectors.toList());
                }
                return wrong;
            case "favorite":
            case "endless":
                Set<Long> bmIds = bookmarkRepo.findAll().stream()
                    .map(Bookmark::getQuestionId).collect(Collectors.toSet());
                List<Question> fav = pool.stream()
                    .filter(q -> bmIds.contains(q.getId()))
                    .limit(req.getCount())
                    .collect(Collectors.toList());
                if (fav.size() < 5) {
                    fav = new ArrayList<>(pool);
                    Collections.shuffle(fav);
                    fav = fav.stream().limit(req.getCount()).collect(Collectors.toList());
                }
                return fav;
            case "browse":
            case "practice":
            case "random":
            case "timed":
                List<Question> shuffled = new ArrayList<>(pool);
                Collections.shuffle(shuffled);
                return shuffled.stream().limit(req.getCount()).collect(Collectors.toList());
            default:
                return continueFromLatest(pool, attempts);
        }
    }

    private List<Question> fetchPool(QuizSetRequest req) {
        List<Question> pool;
        if (req.getDomainId() != null) {
            pool = questionRepo.findByDomainId(req.getDomainId());
        } else if (req.getExamYear() != null && !req.getExamYear().isEmpty()) {
            pool = questionRepo.findByExamYear(req.getExamYear());
        } else if (req.getKeyword() != null && !req.getKeyword().isEmpty()) {
            String kw = req.getKeyword().toLowerCase();
            pool = questionRepo.findAll().stream()
                .filter(q -> q.getStem() != null && q.getStem().toLowerCase().contains(kw))
                .collect(Collectors.toList());
        } else {
            pool = questionRepo.findAll();
        }
        return pool.stream()
            .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource()))
            .filter(q -> q.getFlagType() == null) // 已打问题标记的题不再抽取
            .collect(Collectors.toList());
    }

    private List<Question> continueFromLatest(List<Question> questions, List<AnswerRecord> attempts) {
        if (questions.isEmpty()) return questions;
        List<Question> sorted = questions.stream()
            .sorted(Comparator
                .comparing((Question q) -> q.getExamYear() != null ? q.getExamYear() : "")
                .thenComparing(Question::getId))
            .collect(Collectors.toList());

        if (attempts.isEmpty()) return sorted;

        AnswerRecord last = attempts.stream()
            .max(Comparator.comparing(a ->
                a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN))
            .orElse(null);
        if (last == null || last.getQuestion() == null) return sorted;

        int idx = -1;
        for (int i = 0; i < sorted.size(); i++) {
            if (sorted.get(i).getId().equals(last.getQuestion().getId())) { idx = i; break; }
        }
        if (idx < 0) return sorted;

        int nextIdx = (idx + 1) % sorted.size();
        List<Question> result = new ArrayList<>();
        result.addAll(sorted.subList(nextIdx, sorted.size()));
        result.addAll(sorted.subList(0, nextIdx));
        return result;
    }

    private List<Question> buildReviewSet(List<Question> pool, int count) {
        LocalDateTime now = LocalDateTime.now();
        List<MemoryCard> dueCards = memoryCardRepo.findDueCards(now);
        Set<Long> dueIds = dueCards.stream().map(MemoryCard::getQuestionId).collect(Collectors.toSet());

        List<Question> due = pool.stream()
            .filter(q -> dueIds.contains(q.getId()))
            .collect(Collectors.toList());

        if (due.size() >= count) return due.subList(0, count);

        Map<Long, AnswerRecord> latest = latestAttemptByQuestion(answerRecordRepo.findAll());
        List<Question> unanswered = pool.stream()
            .filter(q -> !latest.containsKey(q.getId()))
            .limit(count - due.size())
            .collect(Collectors.toList());

        due.addAll(unanswered);
        return due;
    }

    @Transactional
    public AnswerResponse gradeAnswer(Long questionId, String userAnswer, GameService gameService) {
        Question question = questionRepo.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        String normalized = userAnswer.trim().toUpperCase();
        String correctAnswer = question.getAnswer() != null ? question.getAnswer().trim().toUpperCase() : "";
        String type = question.getType() != null ? question.getType() : "MCQ";
        boolean correct;
        if ("CASE".equals(type) || "ESSAY".equals(type)) {
            // 主观题：自评三档 SELF_PASS/SELF_PARTIAL/SELF_FAIL（AI 批改下一批接入）
            correct = "SELF_PASS".equals(normalized);
        } else {
            correct = normalized.equals(correctAnswer);
        }

        AnswerRecord record = new AnswerRecord();
        record.setQuestion(question);
        record.setUserAnswer(normalized);
        record.setIsCorrect(correct);
        record.setCreatedAt(LocalDateTime.now());
        answerRecordRepo.save(record);

        MemoryCard card = memoryCardRepo.findByQuestionId(questionId)
            .orElseGet(() -> {
                MemoryCard mc = new MemoryCard();
                mc.setQuestionId(questionId);
                mc.setCorrectCount(0);
                mc.setWrongCount(0);
                mc.setStreak(0);
                return mc;
            });

        if (correct) {
            card.setCorrectCount(card.getCorrectCount() + 1);
            card.setStreak(Math.min(card.getStreak() + 1, 5));
        } else {
            card.setWrongCount(card.getWrongCount() + 1);
            card.setStreak(0);
        }
        card.setState(card.getStreak() >= 4 ? "mastered" : "learning");
        card.setNextReviewAt(LocalDateTime.now().plusDays(INTERVALS[card.getStreak()]));
        card.setLastAnswerAt(LocalDateTime.now());
        memoryCardRepo.save(card);

        AnswerResponse.GameDelta gameDelta = gameService.onAnswer(correct);

        fiveElementsService.updateOnAnswer(correct, questionId);

        return AnswerResponse.builder()
            .correct(correct)
            .answer(question.getAnswer())
            .analysis(question.getAnalysis())
            .answerRecordId(record.getId())
            .memory(AnswerResponse.MemoryInfo.builder()
                .streak(card.getStreak())
                .state(card.getState())
                .nextReviewAt(card.getNextReviewAt() != null ? card.getNextReviewAt().toString() : null)
                .build())
            .game(gameDelta)
            .build();
    }

    private Map<Long, AnswerRecord> latestAttemptByQuestion(List<AnswerRecord> attempts) {
        Map<Long, AnswerRecord> map = new HashMap<>();
        for (AnswerRecord a : attempts) {
            if (a.getQuestion() == null) continue;
            AnswerRecord prev = map.get(a.getQuestion().getId());
            if (prev == null || a.getCreatedAt().isAfter(prev.getCreatedAt())) {
                map.put(a.getQuestion().getId(), a);
            }
        }
        return map;
    }
}
