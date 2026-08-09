package com.studyhub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.ai.DiagnosisProperties;
import com.studyhub.ai.DiagnosisReportParser;
import com.studyhub.ai.LlmClient;
import com.studyhub.ai.LlmRequest;
import com.studyhub.ai.LlmResponse;
import com.studyhub.ai.LlmUnavailableException;
import com.studyhub.ai.PromptRegistry;
import com.studyhub.dto.DiagnosisReport;
import com.studyhub.entity.Diagnosis;
import com.studyhub.entity.Domain;
import com.studyhub.entity.ErrorType;
import com.studyhub.entity.GameState;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagnosisService {

    private final LlmClient llm;
    private final PromptRegistry prompts;
    private final DiagnosisReportParser reportParser;
    private final ObjectMapper objectMapper;

    private final AnswerRecordRepository answerRecordRepo;
    private final ErrorTagRepository tagRepo;
    private final DomainRepository domainRepo;
    private final GameStateRepository gameStateRepo;
    private final MemoryCardRepository memoryCardRepo;
    private final DiagnosisRepository diagRepo;

    private final DiagnosisProperties props;

    @Transactional
    public DiagnosisReport generate() {
        return doGenerate("manual");
    }

    @Scheduled(cron = "${studyhub.diagnosis.cron:0 0 22 ? * SUN}")
    @Async
    @Transactional
    public void weeklyAutoGenerate() {
        if (!props.autoGenerate()) return;
        if (!hasEnoughData()) {
            log.info("每周自动诊断: 数据不足,跳过");
            return;
        }
        DiagnosisReport report = doGenerate("auto");
        saveReport(report);
        log.info("每周自动诊断完成, 薄弱域: {}", report.getWeakDomainRanking());
    }

    @EventListener(ApplicationReadyEvent.class)
    public void compensateIfMissed() {
        if (!props.autoGenerate()) return;
        if (!hasEnoughData()) return;
        LocalDate last = diagRepo.findLatestAiDiagDate();
        if (isThisWeek(last)) return;
        DayOfWeek today = LocalDate.now().getDayOfWeek();
        if (today.getValue() >= DayOfWeek.SUNDAY.getValue()) {
            log.info("lazy 补偿: 本周尚未生成诊断, 启动时补生成");
            DiagnosisReport report = doGenerate("auto");
            saveReport(report);
        }
    }

    public Optional<DiagnosisReport> getLatest() {
        return diagRepo.findAllByOrderByDiagDateDesc().stream()
            .filter(d -> d.getTriggerType() != null)
            .findFirst()
            .map(this::toReport);
    }

    public List<DiagnosisReport> getHistory() {
        return diagRepo.findAllByOrderByDiagDateDesc().stream()
            .filter(d -> d.getTriggerType() != null)
            .map(this::toReport)
            .collect(Collectors.toList());
    }

    public boolean hasEnoughData() {
        long total = answerRecordRepo.count();
        return total >= props.minRecords();
    }

    private DiagnosisReport doGenerate(String trigger) {
        if (!hasEnoughData()) {
            return null;
        }

        Map<Long, Domain> domainMap = domainRepo.findAll().stream()
            .collect(Collectors.toMap(Domain::getId, d -> d));

        List<Object[]> domainAgg = answerRecordRepo.aggregateByDomain();
        List<DiagnosisReport.WeakDomain> weakDomains = computeWeakDomains(domainAgg, domainMap);

        DiagnosisReport.LearnerProfile profile = buildProfile(domainAgg);
        Map<String, Double> errorDist = computeErrorDistribution();
        String memoryStats = computeMemoryStats();

        Map<String, Object> vars = new HashMap<>();
        vars.put("learnerProfile", toJson(profile));
        vars.put("domainStats", toJson(weakDomains));
        vars.put("errorDistribution", toJson(errorDist));
        vars.put("memoryStats", memoryStats);
        vars.put("gameState", toJson(buildGameSummary()));

        String system = "你是软考系统架构设计师考试的学习诊断专家。请严格以 JSON 格式返回诊断报告。";
        String user = prompts.render("diagnosis-report", vars);

        LlmResponse resp;
        try {
            LlmRequest request = new LlmRequest(system, user, 0.3, 2000).withJsonMode();
            resp = llm.chat(request);
        } catch (LlmUnavailableException e) {
            log.warn("诊断 LLM 降级 reason={}", e.getReasonCode());
            DiagnosisReport fallback = reportParser.parse("{}", profile, weakDomains, 0);
            fallback.setTriggerType(trigger);
            fallback.setDiagDate(LocalDate.now());
            return fallback;
        }

        DiagnosisReport report = reportParser.parse(resp.content(), profile, weakDomains, resp.tokensUsed());
        report.setTriggerType(trigger);
        report.setDiagDate(LocalDate.now());

        if ("manual".equals(trigger)) {
            saveReport(report);
        }
        return report;
    }

    @Transactional
    public void saveReport(DiagnosisReport report) {
        try {
            Diagnosis entity = new Diagnosis();
            entity.setDiagDate(report.getDiagDate() != null ? report.getDiagDate() : LocalDate.now());
            entity.setSubject("综合知识");
            entity.setScore(0);
            entity.setTotal(0);
            entity.setTriggerType(report.getTriggerType());
            entity.setReportJson(objectMapper.writeValueAsString(report));
            entity.setWeakDomainRanking(objectMapper.writeValueAsString(report.getWeakDomainRanking()));
            entity.setErrorDistribution(objectMapper.writeValueAsString(report.getErrorDistribution()));
            entity.setLlmTokensUsed(report.getTokensUsed());
            entity.setCreatedAt(LocalDateTime.now());
            diagRepo.save(entity);
        } catch (Exception e) {
            log.error("保存诊断报告失败", e);
        }
    }

    private List<DiagnosisReport.WeakDomain> computeWeakDomains(List<Object[]> agg, Map<Long, Domain> domainMap) {
        List<DiagnosisReport.WeakDomain> list = new ArrayList<>();
        for (Object[] row : agg) {
            Long domainId = (Long) row[0];
            long total = (Long) row[1];
            long correct = (Long) row[2];
            double accuracy = total > 0 ? (double) correct / total : 0;
            if (accuracy >= 0.7) continue;
            Domain domain = domainMap.get(domainId);
            list.add(DiagnosisReport.WeakDomain.builder()
                .domainId(domainId)
                .domainName(domain != null ? domain.getName() : "未知")
                .accuracy(accuracy)
                .errorCount((int) (total - correct))
                .build());
        }
        list.sort(Comparator.comparingDouble(DiagnosisReport.WeakDomain::getAccuracy));
        return list;
    }

    private DiagnosisReport.LearnerProfile buildProfile(List<Object[]> agg) {
        long totalAnswered = 0;
        long totalCorrect = 0;
        for (Object[] row : agg) {
            totalAnswered += (Long) row[1];
            totalCorrect += (Long) row[2];
        }
        double accuracy = totalAnswered > 0 ? (double) totalCorrect / totalAnswered : 0;

        GameState gs = gameStateRepo.findTopByOrderByIdAsc().orElse(null);
        int level = gs != null ? gs.getLevel() : 1;
        String title = gs != null ? gs.getTitle() : "学徒";
        int loginStreak = gs != null && gs.getLoginStreak() != null ? gs.getLoginStreak() : 0;

        String summary = String.format("%s,累计%d题,正确率%.0f%%,连续学习%d天",
            title, totalAnswered, accuracy * 100, loginStreak);

        return DiagnosisReport.LearnerProfile.builder()
            .level(level)
            .title(title)
            .totalAnswered((int) totalAnswered)
            .overallAccuracy(accuracy)
            .loginStreak(loginStreak)
            .summary(summary)
            .strengths(new ArrayList<>())
            .weaknesses(new ArrayList<>())
            .build();
    }

    private Map<String, Double> computeErrorDistribution() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<Object[]> raw = tagRepo.aggregateErrorDistribution(since);
        Map<String, Long> counts = new LinkedHashMap<>();
        long total = 0;
        for (Object[] row : raw) {
            ErrorType type = (ErrorType) row[1];
            long count = (Long) row[2];
            counts.merge(type.name(), count, Long::sum);
            total += count;
        }
        Map<String, Double> dist = new LinkedHashMap<>();
        for (Map.Entry<String, Long> e : counts.entrySet()) {
            dist.put(e.getKey(), total > 0 ? (double) e.getValue() / total : 0);
        }
        return dist;
    }

    private String computeMemoryStats() {
        long total = memoryCardRepo.count();
        long due = memoryCardRepo.findDueCards(LocalDateTime.now()).size();
        return String.format("总记忆卡:%d,到期复习:%d", total, due);
    }

    private Map<String, Object> buildGameSummary() {
        GameState gs = gameStateRepo.findTopByOrderByIdAsc().orElse(null);
        Map<String, Object> map = new LinkedHashMap<>();
        if (gs != null) {
            map.put("level", gs.getLevel());
            map.put("title", gs.getTitle());
            map.put("exp", gs.getExp());
            map.put("loginStreak", gs.getLoginStreak());
            map.put("maxCombo", gs.getMaxCombo());
        }
        return map;
    }

    private boolean isThisWeek(LocalDate date) {
        if (date == null) return false;
        LocalDate now = LocalDate.now();
        LocalDate weekStart = now.minusDays(now.getDayOfWeek().getValue() - 1);
        return !date.isBefore(weekStart);
    }

    private DiagnosisReport toReport(Diagnosis entity) {
        try {
            DiagnosisReport report = objectMapper.readValue(entity.getReportJson(), DiagnosisReport.class);
            report.setId(entity.getId());
            report.setDiagDate(entity.getDiagDate());
            report.setTriggerType(entity.getTriggerType());
            return report;
        } catch (Exception e) {
            log.error("解析诊断报告失败 id={}", entity.getId(), e);
            return null;
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
