package com.studyhub.service;

import com.studyhub.dto.QuestionDTO;
import com.studyhub.entity.*;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SimulationService {

    private final QuestionRepository questionRepo;
    private final AnswerRecordRepository answerRecordRepo;
    private final SimulationRepository simulationRepo;
    private final QuestionService questionService;
    private final DomainRepository domainRepo;

    private static final int KNOWLEDGE_Q_COUNT = 75;
    private static final int KNOWLEDGE_PASS = 45;
    private static final int CASE_Q_COUNT = 5;
    private static final int CASE_PASS = 45;
    private static final int ESSAY_PASS = 45;

    /**
     * 综合知识抽题配额，依据 data/senior-arch-review/SYLLABUS.md（官方 2022 审定版大纲，
     * 即 2025 年现行考纲）的考情统计校准：
     *   软件架构设计 25-37%(最重)、软件工程 12-28%(含设计模式/项目管理/法规)、
     *   信息安全 4-9%、数据库 5-7%、操作系统 2.7-6.7%。
     * 2025 考纲取消专业英语（题库已剔除）；应用数学(§12)暂无题源，配额无法覆盖。
     * 法规与标准化(§11)题混在软件工程域，按导入文件单独成桶；合计 71 题，余量从全池补齐。
     */
    private static final Map<String, Integer> KNOWLEDGE_QUOTA = new LinkedHashMap<>() {{
        put("架构设计", 20);      // 26.7%，落在 25-37% 区间
        put("软件工程", 11);      // 与设计模式/法规合计 28%，卡软件工程族上限
        put("设计模式", 7);
        put("计算机系统基础", 6); // 含嵌入式/性能/多媒体
        put("数据库技术", 5);     // 6.7%，区间 5-7% 上沿
        put("计算机网络", 5);
        put("系统安全", 5);       // 6.7%，区间 4-9%
        put("操作系统", 4);       // 5.3%，区间 2.7-6.7%
        put("项目管理", 3);
        put("应用数学", 3);       // 考纲§12，2026-09 新增题源（source=GENERATED）
        put("未来信息综合技术", 3); // 考纲§10，2026-09 新增题源（source=GENERATED）
    }};
    private static final String IP_SOURCE_FILE = "06-ip-and-standards.md";
    private static final int IP_QUOTA = 3;

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> startSimulation() {
        List<Question> knowledgeQs = sampleKnowledgeQuestions(KNOWLEDGE_Q_COUNT);
        List<Question> caseQs = questionRepo.findActiveCaseQuestions().stream()
            .limit(CASE_Q_COUNT)
            .collect(Collectors.toList());
        List<Question> essayQs = questionRepo.findActiveEssayQuestions().stream()
            .limit(1)
            .collect(Collectors.toList());

        // 开考即建卷：三科分数为 null（未交卷），按科交卷后逐科回填
        Simulation sim = new Simulation();
        sim.setSimDate(LocalDate.now());
        sim.setConvergence(false);
        sim.setStrategy("{}");
        simulationRepo.save(sim);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("simulationId", sim.getId());
        result.put("sections", buildSections(knowledgeQs, caseQs, essayQs));
        return result;
    }

    /**
     * 综合知识按真实考试配额逐域抽取；某域题量不足时由全池补齐，最后打乱顺序。
     */
    private List<Question> sampleKnowledgeQuestions(int total) {
        List<Question> picked = new ArrayList<>();
        Set<Long> pickedIds = new HashSet<>();

        for (Map.Entry<String, Integer> e : KNOWLEDGE_QUOTA.entrySet()) {
            Domain d = domainRepo.findByName(e.getKey()).orElse(null);
            if (d == null) continue;
            for (Question q : questionRepo.findRandomMcqByDomain(d.getId(), e.getValue())) {
                if (pickedIds.add(q.getId())) picked.add(q);
            }
        }
        for (Question q : questionRepo.findRandomMcqBySourceFile(IP_SOURCE_FILE, IP_QUOTA)) {
            if (pickedIds.add(q.getId())) picked.add(q);
        }

        int shortfall = total - picked.size();
        if (shortfall > 0) {
            List<Question> fill = pickedIds.isEmpty()
                ? questionRepo.findRandomMcqAcrossAll(shortfall)
                : questionRepo.findRandomMcqExcluding(new ArrayList<>(pickedIds), shortfall);
            for (Question q : fill) {
                if (pickedIds.add(q.getId())) picked.add(q);
            }
        }
        // 极端兜底：池子过小时放开排除条件凑满
        for (Question q : questionRepo.findRandomMcqAcrossAll(total)) {
            if (picked.size() >= total) break;
            if (pickedIds.add(q.getId())) picked.add(q);
        }
        Collections.shuffle(picked);
        return picked;
    }

    private List<Map<String, Object>> buildSections(List<Question> kQs, List<Question> cQs, List<Question> eQs) {
        List<Map<String, Object>> sections = new ArrayList<>();

        sections.add(buildSection("knowledge", "综合知识", kQs, 120, KNOWLEDGE_PASS,
            "单选题", "每题1分，共75分"));

        if (!cQs.isEmpty()) {
            sections.add(buildSection("case", "案例分析", cQs, 90, CASE_PASS,
                "案例分析主观题", "每题15分，对照参考答案自评，共75分"));
        }

        if (!eQs.isEmpty()) {
            sections.add(buildSection("essay", "论文", eQs, 120, ESSAY_PASS,
                "论述题", "自评打分，满分75分"));
        }

        return sections;
    }

    private Map<String, Object> buildSection(String key, String name, List<Question> questions,
                                             int duration, int passThreshold, String qType, String scoring) {
        List<QuestionDTO> dtos = questions.stream()
            .map(q -> {
                QuestionDTO dto = questionService.toDTOPublic(q);
                // 仅综合知识隐藏答案；案例/论文需参考答案供考中自评
                if (key.equals("knowledge")) {
                    dto.setAnswer(null);
                    dto.setAnalysis(null);
                }
                return dto;
            })
            .collect(Collectors.toList());

        Map<String, Object> section = new LinkedHashMap<>();
        section.put("key", key);
        section.put("name", name);
        section.put("questions", dtos);
        section.put("totalQuestions", dtos.size());
        section.put("durationMinutes", duration);
        section.put("passThreshold", passThreshold);
        section.put("questionType", qType);
        section.put("scoringRule", scoring);
        return section;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> submitSimulation(Map<String, Object> body) {
        List<Map<String, Object>> knowledgeAnswers = (List<Map<String, Object>>) body.getOrDefault("knowledge", Collections.emptyList());
        List<Map<String, Object>> caseAnswers = (List<Map<String, Object>>) body.getOrDefault("case", Collections.emptyList());
        List<Map<String, Object>> essayAnswers = (List<Map<String, Object>>) body.getOrDefault("essay", Collections.emptyList());

        int kScore = gradeObjective(knowledgeAnswers);
        int cScore = gradeObjective(caseAnswers) * 15;

        int eScore = 0;
        List<Map<String, Object>> essayFeedback = new ArrayList<>();
        if (!essayAnswers.isEmpty()) {
            for (Map<String, Object> ea : essayAnswers) {
                Long qId = ((Number) ea.get("questionId")).longValue();
                String userEssay = (String) ea.get("userAnswer");
                Integer selfScore = ea.get("selfScore") != null ? ((Number) ea.get("selfScore")).intValue() : null;
                Question q = questionRepo.findById(qId).orElse(null);
                if (q != null) {
                    eScore += selfScore != null ? selfScore : 0;
                    Map<String, Object> fb = new LinkedHashMap<>();
                    fb.put("questionId", qId);
                    fb.put("stem", q.getStem());
                    fb.put("userEssay", userEssay);
                    fb.put("selfScore", selfScore);
                    fb.put("scoringCriteria", q.getAnswer());
                    essayFeedback.add(fb);
                }
            }
            eScore = Math.min(eScore, ESSAY_PASS * 75 / 45);
        }

        boolean kPass = kScore >= KNOWLEDGE_PASS;
        boolean cPass = cScore >= CASE_PASS;
        boolean ePass = eScore >= ESSAY_PASS;
        boolean allPass = kPass && cPass && (essayAnswers.isEmpty() || ePass);

        Simulation sim = new Simulation();
        sim.setSimDate(LocalDate.now());
        sim.setKnowledgeScore(kScore);
        sim.setCaseScore(cScore);
        sim.setEssayScore(eScore);
        sim.setConvergence(allPass);
        sim.setStrategy("{}");
        sim.setInsights(generateInsights(kScore, KNOWLEDGE_Q_COUNT, cScore, CASE_Q_COUNT, eScore, essayAnswers.size()));
        simulationRepo.save(sim);

        saveAnswerRecords(knowledgeAnswers, sim, "knowledge");
        saveAnswerRecords(caseAnswers, sim, "case");
        saveAnswerRecords(essayAnswers, sim, "essay");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("simulationId", sim.getId());
        result.put("simDate", sim.getSimDate().toString());

        Map<String, Object> scores = new LinkedHashMap<>();
        scores.put("knowledge", buildScoreDetail("综合知识", kScore, 75, KNOWLEDGE_PASS, kPass));
        scores.put("case", buildScoreDetail("案例分析", cScore, 75, CASE_PASS, cPass));
        scores.put("essay", buildScoreDetail("论文", eScore, 75, ESSAY_PASS, ePass));
        result.put("scores", scores);

        result.put("totalScore", kScore + cScore + eScore);
        result.put("passed", allPass);

        if (!essayFeedback.isEmpty()) {
            result.put("essayFeedback", essayFeedback);
        }

        result.put("insights", sim.getInsights());
        return result;
    }

    /**
     * 按科交卷：评一科、回填一科分数、落一科作答记录。
     * 三科都交卷后返回 completed=true 并附带总评。
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> submitSection(Long simId, String section, List<Map<String, Object>> answers) {
        Simulation sim = simulationRepo.findById(simId)
            .orElseThrow(() -> new IllegalArgumentException("模拟考不存在: id=" + simId));
        if (answers == null) answers = Collections.emptyList();

        boolean already;
        switch (section) {
            case "knowledge": already = sim.getKnowledgeScore() != null; break;
            case "case":      already = sim.getCaseScore() != null; break;
            case "essay":     already = sim.getEssayScore() != null; break;
            default: throw new IllegalArgumentException("未知科目: " + section);
        }
        if (already) throw new IllegalStateException("该科目已交卷,不能重复提交");

        int score;
        List<Map<String, Object>> feedback;
        switch (section) {
            case "knowledge" -> {
                score = gradeObjective(answers);
                feedback = objectiveFeedback(answers);
                sim.setKnowledgeScore(score);
            }
            case "case" -> {
                // 案例题为小问式主观题（options_json 存小问数组、answer 存参考答案），
                // 无法按字母客观判分：对照参考答案自评三档，每题 满分15/部分9/未掌握3，满分75
                int sum = 0;
                feedback = new ArrayList<>();
                for (Map<String, Object> ca : answers) {
                    Long qId = ((Number) ca.get("questionId")).longValue();
                    String grade = ca.get("selfGrade") != null ? ca.get("selfGrade").toString().trim() : "";
                    int qScore = switch (grade) {
                        case "SELF_PASS" -> 15;
                        case "SELF_PARTIAL" -> 9;
                        case "SELF_FAIL" -> 3;
                        default -> 0;
                    };
                    sum += qScore;
                    Question q = questionRepo.findById(qId).orElse(null);
                    if (q == null) continue;
                    Map<String, Object> fb = new LinkedHashMap<>();
                    fb.put("questionId", qId);
                    fb.put("stem", q.getStem());
                    fb.put("subQuestions", q.getOptionsJson());
                    fb.put("userAnswer", ca.get("userAnswer"));
                    fb.put("referenceAnswer", q.getAnswer());
                    fb.put("analysis", q.getAnalysis());
                    fb.put("selfGrade", grade);
                    fb.put("score", qScore);
                    feedback.add(fb);
                }
                score = Math.min(sum, 75);
                sim.setCaseScore(score);
            }
            default -> { // essay
                int sum = 0;
                feedback = new ArrayList<>();
                for (Map<String, Object> ea : answers) {
                    Long qId = ((Number) ea.get("questionId")).longValue();
                    Integer selfScore = ea.get("selfScore") != null ? ((Number) ea.get("selfScore")).intValue() : 0;
                    sum += selfScore != null ? selfScore : 0;
                    Question q = questionRepo.findById(qId).orElse(null);
                    if (q == null) continue;
                    Map<String, Object> fb = new LinkedHashMap<>();
                    fb.put("questionId", qId);
                    fb.put("stem", q.getStem());
                    fb.put("userEssay", (String) ea.get("userAnswer"));
                    fb.put("selfScore", selfScore);
                    fb.put("scoringCriteria", q.getAnswer());
                    feedback.add(fb);
                }
                score = Math.min(sum, 75);
                sim.setEssayScore(score);
            }
        }
        saveAnswerRecords(answers, sim, section);
        simulationRepo.save(sim);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("simulationId", simId);
        result.put("section", section);
        result.put("feedback", feedback);
        result.put("scoreDetail", buildSectionScoreDetail(section, sim, answers.size()));
        result.put("completed", false);

        // 三科都交卷 → 总评
        if (sim.getKnowledgeScore() != null && sim.getCaseScore() != null && sim.getEssayScore() != null) {
            boolean kPass = sim.getKnowledgeScore() >= KNOWLEDGE_PASS;
            boolean cPass = sim.getCaseScore() >= CASE_PASS;
            boolean ePass = sim.getEssayScore() >= ESSAY_PASS;
            boolean allPass = kPass && cPass && ePass;
            sim.setConvergence(allPass);
            sim.setInsights(generateInsights(sim.getKnowledgeScore(), KNOWLEDGE_Q_COUNT,
                sim.getCaseScore(), CASE_Q_COUNT, sim.getEssayScore(), 1));
            simulationRepo.save(sim);

            result.put("completed", true);
            result.put("simDate", sim.getSimDate().toString());
            Map<String, Object> scores = new LinkedHashMap<>();
            scores.put("knowledge", buildScoreDetail("综合知识", sim.getKnowledgeScore(), 75, KNOWLEDGE_PASS, kPass));
            scores.put("case", buildScoreDetail("案例分析", sim.getCaseScore(), 75, CASE_PASS, cPass));
            scores.put("essay", buildScoreDetail("论文", sim.getEssayScore(), 75, ESSAY_PASS, ePass));
            result.put("scores", scores);
            result.put("totalScore", sim.getKnowledgeScore() + sim.getCaseScore() + sim.getEssayScore());
            result.put("passed", allPass);
            result.put("insights", sim.getInsights());
        }
        return result;
    }

    /** 客观题逐题判定（综合知识/案例分析共用），供交卷后错题分析 */
    private List<Map<String, Object>> objectiveFeedback(List<Map<String, Object>> answers) {
        List<Map<String, Object>> feedback = new ArrayList<>();
        for (Map<String, Object> ans : answers) {
            Long qId = ((Number) ans.get("questionId")).longValue();
            String userAns = ans.get("userAnswer") != null ? ((String) ans.get("userAnswer")).trim().toUpperCase() : "";
            Question q = questionRepo.findById(qId).orElse(null);
            if (q == null) continue;
            String correctAns = q.getAnswer() != null ? q.getAnswer().trim().toUpperCase() : "";
            Map<String, Object> fb = new LinkedHashMap<>();
            fb.put("questionId", qId);
            fb.put("stem", q.getStem());
            fb.put("optionsJson", q.getOptionsJson());
            fb.put("examYear", q.getExamYear());
            fb.put("userAnswer", userAns);
            fb.put("correctAnswer", correctAns);
            fb.put("correct", !userAns.isEmpty() && userAns.equals(correctAns));
            fb.put("analysis", q.getAnalysis());
            feedback.add(fb);
        }
        return feedback;
    }

    private Map<String, Object> buildSectionScoreDetail(String section, Simulation sim, int answeredCount) {
        int score, full, threshold;
        String name;
        int totalQ;
        switch (section) {
            case "knowledge" -> { score = sim.getKnowledgeScore(); full = 75; threshold = KNOWLEDGE_PASS; name = "综合知识"; totalQ = KNOWLEDGE_Q_COUNT; }
            case "case" -> { score = sim.getCaseScore(); full = 75; threshold = CASE_PASS; name = "案例分析"; totalQ = CASE_Q_COUNT; }
            default -> { score = sim.getEssayScore(); full = 75; threshold = ESSAY_PASS; name = "论文"; totalQ = 1; }
        }
        Map<String, Object> d = buildScoreDetail(name, score, full, threshold, score >= threshold);
        d.put("answeredCount", answeredCount);
        d.put("totalQuestions", totalQ);
        return d;
    }

    private Map<String, Object> buildScoreDetail(String name, int score, int full, int threshold, boolean pass) {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("name", name);
        d.put("score", score);
        d.put("fullScore", full);
        d.put("passThreshold", threshold);
        d.put("passed", pass);
        d.put("accuracy", full > 0 ? Math.round((double) score / full * 1000.0) / 1000.0 : 0);
        return d;
    }

    private int gradeObjective(List<Map<String, Object>> answers) {
        int correct = 0;
        for (Map<String, Object> ans : answers) {
            Long qId = ((Number) ans.get("questionId")).longValue();
            String userAns = (String) ans.get("userAnswer");
            if (userAns == null) userAns = "";
            Question q = questionRepo.findById(qId).orElse(null);
            if (q == null) continue;
            String normalized = userAns.trim().toUpperCase();
            String correctAns = q.getAnswer() != null ? q.getAnswer().trim().toUpperCase() : "";
            if (normalized.equals(correctAns)) correct++;
        }
        return correct;
    }

    private void saveAnswerRecords(List<Map<String, Object>> answers, Simulation sim, String section) {
        boolean subjective = "case".equals(section);
        for (Map<String, Object> ans : answers) {
            Long qId = ((Number) ans.get("questionId")).longValue();
            Question q = questionRepo.findById(qId).orElse(null);
            if (q == null) continue;

            // user_answer 列 varchar(20)：客观题存字母，案例主观题存自评档位码（长文本不落库）
            String normalized;
            boolean isCorrect;
            if (subjective) {
                normalized = ans.get("selfGrade") != null ? ans.get("selfGrade").toString().trim() : "";
                isCorrect = "SELF_PASS".equals(normalized);
            } else {
                String userAns = (String) ans.get("userAnswer");
                if (userAns == null) userAns = "";
                normalized = userAns.trim().toUpperCase();
                String correctAns = q.getAnswer() != null ? q.getAnswer().trim().toUpperCase() : "";
                isCorrect = normalized.equals(correctAns);
            }

            AnswerRecord record = new AnswerRecord();
            record.setQuestion(q);
            record.setSimulation(sim);
            record.setUserAnswer(normalized);
            record.setIsCorrect(isCorrect);
            record.setCreatedAt(LocalDateTime.now());
            answerRecordRepo.save(record);
        }
    }

    private String generateInsights(int kScore, int kTotal, int cScore, int cTotal, int eScore, int eTotal) {
        StringBuilder sb = new StringBuilder();
        sb.append("综合知识 ").append(kScore).append("/75");
        sb.append("，案例分析 ").append(cScore).append("/75");
        if (eTotal > 0) sb.append("，论文 ").append(eScore).append("/75");
        sb.append("。");
        if (kScore >= KNOWLEDGE_PASS && cScore >= CASE_PASS && (eTotal == 0 || eScore >= ESSAY_PASS)) {
            sb.append("三科均达标，整体实力扎实！");
        } else {
            List<String> weak = new ArrayList<>();
            if (kScore < KNOWLEDGE_PASS) weak.add("综合知识");
            if (cScore < CASE_PASS) weak.add("案例分析");
            if (eTotal > 0 && eScore < ESSAY_PASS) weak.add("论文");
            sb.append("薄弱科目：").append(String.join("、", weak)).append("，需重点突破。");
        }
        return sb.toString();
    }

    public List<Map<String, Object>> getAllSimulations() {
        // 只展示三科交齐的卷子；未交完的进行中卷不进历史
        return simulationRepo.findAllByOrderBySimDateDesc().stream()
            .filter(s -> s.getKnowledgeScore() != null && s.getCaseScore() != null && s.getEssayScore() != null)
            .map(this::toMap)
            .collect(Collectors.toList());
    }

    private Map<String, Object> toMap(Simulation sim) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", sim.getId());
        map.put("simDate", sim.getSimDate() != null ? sim.getSimDate().toString() : null);
        map.put("knowledgeScore", sim.getKnowledgeScore());
        map.put("caseScore", sim.getCaseScore());
        map.put("essayScore", sim.getEssayScore());
        map.put("convergence", sim.getConvergence());
        map.put("insights", sim.getInsights());
        return map;
    }
}
