package com.studyhub.service;

import com.studyhub.entity.Domain;
import com.studyhub.entity.Question;
import com.studyhub.repository.AnswerRecordRepository;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.QuestionQualityRepository;
import com.studyhub.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PriorityService {

    private final QuestionRepository questionRepo;
    private final AnswerRecordRepository answerRecordRepo;
    private final DomainRepository domainRepo;
    private final QuestionQualityRepository questionQualityRepo;

    private static final LocalDate EXAM_DATE = LocalDate.of(2026, 10, 24);
    private static final LocalDate PLAN_START = LocalDate.of(2026, 7, 28);

    /**
     * 统计各 domain 历年出题频率
     */
    public List<Map<String, Object>> getDomainFrequency() {
        List<Question> all = questionRepo.findAll().stream()
            .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource()))
            .filter(q -> q.getFlagType() == null)
            .collect(Collectors.toList());

        Map<Long, List<Question>> byDomain = all.stream()
            .filter(q -> q.getDomain() != null)
            .collect(Collectors.groupingBy(q -> q.getDomain().getId()));

        int total = all.size();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<Long, List<Question>> entry : byDomain.entrySet()) {
            Long domainId = entry.getKey();
            List<Question> questions = entry.getValue();
            Domain domain = questions.get(0).getDomain();

            Map<String, Long> yearly = questions.stream()
                .filter(q -> q.getExamYear() != null && !q.getExamYear().isEmpty())
                .collect(Collectors.groupingBy(Question::getExamYear, Collectors.counting()));

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("domainId", domainId);
            item.put("name", domain.getName());
            item.put("count", questions.size());
            item.put("frequency", total > 0 ? (double) questions.size() / total : 0);
            item.put("yearlyBreakdown", yearly);
            result.add(item);
        }

        result.sort((a, b) -> Double.compare((double) b.get("frequency"), (double) a.get("frequency")));
        return result;
    }

    /**
     * 获取实时复习优先级列表
     */
    public List<Map<String, Object>> getPriorityList() {
        List<Map<String, Object>> freqList = getDomainFrequency();
        Map<Long, Double> masteryMap = getMasteryByDomain();
        double urgency = calcUrgency();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> freq : freqList) {
            Long domainId = (Long) freq.get("domainId");
            double frequency = (double) freq.get("frequency");
            double mastery = masteryMap.getOrDefault(domainId, 0.5);
            double priority = frequency * (1 - mastery) * urgency;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("domainId", domainId);
            item.put("name", freq.get("name"));
            item.put("frequency", Math.round(frequency * 1000) / 10.0); // 百分比
            item.put("mastery", Math.round(mastery * 1000) / 10.0);
            item.put("priority", Math.round(priority * 1000) / 1000.0);
            item.put("questionCount", freq.get("count"));
            item.put("urgency", Math.round(urgency * 100) / 100.0);
            result.add(item);
        }

        result.sort((a, b) -> Double.compare((double) b.get("priority"), (double) a.get("priority")));

        // 标记推荐状态
        for (int i = 0; i < result.size(); i++) {
            Map<String, Object> item = result.get(i);
            if (i < 3) {
                item.put("recommend", "HIGH");
            } else if (i < 6) {
                item.put("recommend", "MEDIUM");
            } else {
                item.put("recommend", "LOW");
            }
        }

        return result;
    }

    /**
     * 按优先级推荐刷题 domain
     */
    public Long getRecommendedDomainId() {
        List<Map<String, Object>> list = getPriorityList();
        if (list.isEmpty()) return null;
        return (Long) list.get(0).get("domainId");
    }

    /**
     * 获取各 domain 掌握度（最近 20 题正确率）
     */
    private Map<Long, Double> getMasteryByDomain() {
        List<Object[]> rows = answerRecordRepo.aggregateByDomain();
        Map<Long, Double> map = new HashMap<>();
        for (Object[] row : rows) {
            Long domainId = (Long) row[0];
            Long total = (Long) row[1];
            Long correct = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            map.put(domainId, total > 0 ? (double) correct / total : 0.5);
        }
        return map;
    }

    /**
     * 计算时间紧迫度：1.0 ~ 1.5，越临近考试越高
     */
    private double calcUrgency() {
        long totalDays = ChronoUnit.DAYS.between(PLAN_START, EXAM_DATE);
        long remainDays = ChronoUnit.DAYS.between(LocalDate.now(), EXAM_DATE);
        if (remainDays <= 0) return 1.5;
        double progress = 1.0 - (double) remainDays / totalDays;
        return 1.0 + progress * 0.5;
    }

    /**
     * 考点级掌握度：按 question_quality 的考点聚合作答记录与题量。
     * 返回项：domainId/domainName/kp/questionCount/answered/correctRate/mastery，弱势在前。
     */
    public List<Map<String, Object>> getKpMastery() {
        Map<String, double[]> answeredByKp = new HashMap<>();   // key: domainId|kp -> [answered, correct]
        Map<String, Object[]> metaByKp = new HashMap<>();       // key -> [domainId, kp, domainName, count]

        for (Object[] row : questionQualityRepo.countByKp()) {
            Long domainId = ((Number) row[0]).longValue();
            String kp = (String) row[1];
            String domainName = (String) row[2];
            long count = ((Number) row[3]).longValue();
            String key = domainId + "|" + kp;
            metaByKp.put(key, new Object[]{domainId, kp, domainName, count});
        }

        for (Object[] row : questionQualityRepo.aggregateByKp()) {
            Long domainId = ((Number) row[0]).longValue();
            String kp = (String) row[1];
            long answered = ((Number) row[2]).longValue();
            long correct = row[3] != null ? ((Number) row[3]).longValue() : 0L;
            String key = domainId + "|" + kp;
            if (metaByKp.containsKey(key)) {
                double[] agg = answeredByKp.computeIfAbsent(key, k -> new double[2]);
                agg[0] += answered;
                agg[1] += correct;
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Object[]> e : metaByKp.entrySet()) {
            Object[] meta = e.getValue();
            double[] agg = answeredByKp.get(e.getKey());
            long answered = agg == null ? 0 : (long) agg[0];
            long correct = agg == null ? 0 : (long) agg[1];
            double correctRate = answered > 0 ? (double) correct / answered : -1; // -1=未作答
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("domainId", ((Number) meta[0]).longValue());
            item.put("domainName", meta[2]);
            item.put("kp", meta[1]);
            item.put("questionCount", ((Number) meta[3]).longValue());
            item.put("answered", answered);
            item.put("correctRate", correctRate < 0 ? null : Math.round(correctRate * 1000) / 10.0);
            // 掌握度：未作答视为 0（最需要练），作答越多越可信
            double mastery = answered == 0 ? 0 : correctRate;
            double weakness = (1 - mastery) * Math.min(1, (answered + 1) / 5.0);
            item.put("mastery", Math.round(mastery * 1000) / 10.0);
            item.put("weakness", Math.round(weakness * 1000) / 1000.0);
            result.add(item);
        }

        result.sort((a, b) -> Double.compare((double) b.get("weakness"), (double) a.get("weakness")));
        return result;
    }

    /**
     * 弱势考点 key 列表（domainId|kp），供智能推荐出题。
     * 条件：掌握度 < 0.7 且作答数 >= 2；不足时退回未作答且题量最大的考点。
     */
    public List<String> getWeakKpKeys(int limit) {
        List<Map<String, Object>> mastery = getKpMastery();
        List<String> weak = new ArrayList<>();
        List<String> untried = new ArrayList<>();
        for (Map<String, Object> m : mastery) {
            String key = m.get("domainId") + "|" + m.get("kp");
            long answered = ((Number) m.get("answered")).longValue();
            double masteryVal = ((Number) m.get("mastery")).doubleValue();
            if (answered >= 2 && masteryVal < 0.7) {
                weak.add(key);
            } else if (answered == 0) {
                untried.add(key);
            }
            if (weak.size() >= limit) break;
        }
        if (weak.size() < limit) {
            untried.stream().limit(limit - weak.size()).forEach(weak::add);
        }
        return weak;
    }
}
