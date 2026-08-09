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

    private static final int KNOWLEDGE_Q_COUNT = 75;
    private static final int KNOWLEDGE_PASS = 45;
    private static final int CASE_Q_COUNT = 5;
    private static final int CASE_PASS = 45;
    private static final int ESSAY_PASS = 45;

    @SuppressWarnings("unchecked")
    public Map<String, Object> startSimulation() {
        List<Question> knowledgeQs = questionRepo.findRandomAcrossAll(
            (int) Math.min(KNOWLEDGE_Q_COUNT, questionRepo.countAllActive()));
        List<Question> caseQs = questionRepo.findBySubject("案例分析");
        List<Question> essayQs = questionRepo.findBySubject("论文");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sections", buildSections(knowledgeQs, caseQs, essayQs));
        return result;
    }

    private List<Map<String, Object>> buildSections(List<Question> kQs, List<Question> cQs, List<Question> eQs) {
        List<Map<String, Object>> sections = new ArrayList<>();

        sections.add(buildSection("knowledge", "综合知识", kQs, 120, KNOWLEDGE_PASS,
            "单选题", "每题1分，共75分"));

        if (!cQs.isEmpty()) {
            sections.add(buildSection("case", "案例分析", cQs, 90, CASE_PASS,
                "情景单选题", "每题15分，共75分"));
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
                if (!key.equals("essay")) {
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
        for (Map<String, Object> ans : answers) {
            Long qId = ((Number) ans.get("questionId")).longValue();
            String userAns = (String) ans.get("userAnswer");
            if (userAns == null) userAns = "";
            Question q = questionRepo.findById(qId).orElse(null);
            if (q == null) continue;

            String normalized = userAns.trim().toUpperCase();
            String correctAns = q.getAnswer() != null ? q.getAnswer().trim().toUpperCase() : "";
            boolean isCorrect = normalized.equals(correctAns);

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
        return simulationRepo.findAllByOrderBySimDateDesc().stream()
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
