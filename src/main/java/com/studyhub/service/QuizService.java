
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
    private final PriorityService priorityService;
    private final QuestionQualityRepository questionQualityRepo;

    private static final int[] INTERVALS = {1, 1, 3, 7, 14, 30};

    public List<Question> buildPracticeSet(QuizSetRequest req) {
        // 智能推荐模式：优先按弱势考点出题（考点级掌握度），无标签/无作答数据时退回域级推荐
        if ("smart".equals(req.getMode()) && req.getDomainId() == null) {
            List<Question> weakKpSet = buildWeakKpSet(req.getCount());
            if (!weakKpSet.isEmpty()) return weakKpSet;
            Long recommended = priorityService.getRecommendedDomainId();
            if (recommended != null) {
                req.setDomainId(recommended);
            }
        }
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
            case "case":
                // 案例专项：只出案例大题，随机排序（题量少，一般全量返回）
                List<Question> caseSet = new ArrayList<>(pool);
                Collections.shuffle(caseSet);
                return caseSet.stream().limit(req.getCount()).collect(Collectors.toList());
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
            case "smart":
                List<Question> shuffled = new ArrayList<>(pool);
                Collections.shuffle(shuffled);
                return shuffled.stream().limit(req.getCount()).collect(Collectors.toList());
            default:
                return continueFromLatest(pool, attempts);
        }
    }

    /**
     * 弱势考点出题：取掌握度最低的考点，优先未作答/最近答错的题。
     */
    private List<Question> buildWeakKpSet(int count) {
        List<String> weakKeys = priorityService.getWeakKpKeys(8);
        if (weakKeys.isEmpty()) return Collections.emptyList();
        List<Question> pool = findQuestionsByIds(questionQualityRepo.findIdsByKpKeys(weakKeys));
        if (pool.isEmpty()) return Collections.emptyList();

        Map<Long, AnswerRecord> latest = latestAttemptByQuestion(answerRecordRepo.findAll());
        List<Question> wrongOrUnanswered = new ArrayList<>();
        List<Question> others = new ArrayList<>();
        for (Question q : pool) {
            AnswerRecord last = latest.get(q.getId());
            if (last == null || !last.getIsCorrect()) {
                wrongOrUnanswered.add(q);
            } else {
                others.add(q);
            }
        }
        Collections.shuffle(wrongOrUnanswered);
        Collections.shuffle(others);
        List<Question> result = new ArrayList<>(wrongOrUnanswered);
        result.addAll(others);
        return result.stream().limit(count).collect(Collectors.toList());
    }

    private List<Question> fetchPool(QuizSetRequest req) {
        List<Question> pool;
        if (req.getSource() != null && !req.getSource().isEmpty()) {
            // 指定题源（如系分真题补充集），忽略领域/年份等其他维度
            pool = questionRepo.findBySource(req.getSource());
        } else if (req.getDomainId() != null) {
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
            .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource())
                && !"ARCH_EXCL".equals(q.getSource()))
            .filter(q -> q.getFlagType() == null) // 已打问题标记的题不再抽取
            .filter(q -> matchesTypeAndTopic(q, req))
            .collect(Collectors.toList());
    }

    /** 题型与案例专项方向过滤：questionType 匹配 question_type，caseTopic 匹配题干【案例题型·XX】前缀 */
    private boolean matchesTypeAndTopic(Question q, QuizSetRequest req) {
        if (req.getQuestionType() != null && !req.getQuestionType().isEmpty()
                && !req.getQuestionType().equals(q.getType())) {
            return false;
        }
        if (req.getCaseTopic() != null && !req.getCaseTopic().isEmpty()) {
            String prefix = "【案例题型·" + req.getCaseTopic() + "】";
            return q.getStem() != null && q.getStem().startsWith(prefix);
        }
        return true;
    }

    /**
     * 案例专项方向汇总：解析题干【案例题型·XX】前缀，按方向统计题量（降序），供前端专项面板渲染。
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> caseSummary() {
        Map<String, Long> byTopic = new LinkedHashMap<>();
        long untagged = 0;
        for (Question q : questionRepo.findActiveCaseQuestions()) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("^【案例题型·(.+?)】").matcher(q.getStem() != null ? q.getStem() : "");
            if (m.find()) {
                byTopic.merge(m.group(1), 1L, Long::sum);
            } else {
                untagged++;
            }
        }
        List<Map<String, Object>> result = new ArrayList<>();
        byTopic.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .forEach(e -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("topic", e.getKey());
                item.put("count", e.getValue());
                result.add(item);
            });
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("topic", null);
        all.put("count", byTopic.values().stream().mapToLong(Long::longValue).sum() + untagged);
        result.add(0, all);
        return result;
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

        // 答错时附带考点与同考点变式题数量，前端据此展示"举一反三"
        AnswerResponse.AnswerMeta.AnswerMetaBuilder metaBuilder = AnswerResponse.AnswerMeta.builder();
        boolean hasMeta = false;
        List<QuestionQuality> tags = questionQualityRepo.findByQuestionId(questionId);
        if (!correct && !tags.isEmpty()) {
            String kp = tags.get(0).getKnowledgePoint();
            int variantCount = questionQualityRepo.findVariantQuestionIds(questionId, 10).size();
            metaBuilder.knowledgePoint(kp).variantCount((long) variantCount);
            hasMeta = true;
        }

        AnswerResponse.AnswerResponseBuilder builder = AnswerResponse.builder()
            .correct(correct)
            .answer(question.getAnswer())
            .analysis(question.getAnalysis())
            .answerRecordId(record.getId())
            .memory(AnswerResponse.MemoryInfo.builder()
                .streak(card.getStreak())
                .state(card.getState())
                .nextReviewAt(card.getNextReviewAt() != null ? card.getNextReviewAt().toString() : null)
                .build())
            .game(gameDelta);
        if (hasMeta) builder.meta(metaBuilder.build());
        return builder.build();
    }

    /**
     * 同考点变式题（举一反三），供前端在答错后按需加载。
     */
    @Transactional(readOnly = true)
    public List<Question> findVariants(Long questionId, int count) {
        List<Long> ids = questionQualityRepo.findVariantQuestionIds(questionId, Math.min(Math.max(count, 1), 10));
        return findQuestionsByIds(ids);
    }

    /** 按 ID 顺序装配 Question（findAllById 不保证顺序） */
    private List<Question> findQuestionsByIds(List<Long> ids) {
        if (ids.isEmpty()) return Collections.emptyList();
        Map<Long, Question> byId = questionRepo.findAllById(ids).stream()
            .collect(Collectors.toMap(Question::getId, q -> q));
        return ids.stream().map(byId::get).filter(Objects::nonNull).collect(Collectors.toList());
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
