package com.studyhub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.ai.LlmClient;
import com.studyhub.ai.LlmRequest;
import com.studyhub.ai.LlmResponse;
import com.studyhub.ai.LlmUnavailableException;
import com.studyhub.ai.PromptRegistry;
import com.studyhub.dto.DiagnosisReport;
import com.studyhub.dto.PlanResponse;
import com.studyhub.dto.WeeklyPlanItem;
import com.studyhub.entity.WeeklyTask;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.StudyMaterialRepository;
import com.studyhub.repository.WeeklyTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanService {

    private final LlmClient llm;
    private final PromptRegistry prompts;
    private final ObjectMapper objectMapper;
    private final DiagnosisService diagnosisService;
    private final WeeklyTaskRepository taskRepo;
    private final DomainRepository domainRepo;
    private final StudyMaterialRepository materialRepo;

    private static final LocalDate WEEK_START_DATE = LocalDate.of(2026, 7, 28);

    @Transactional
    public PlanResponse generate() {
        DiagnosisReport diagnosis = diagnosisService.getLatest()
            .orElse(null);
        if (diagnosis == null) {
            return PlanResponse.builder()
                .degraded(true)
                .message("尚未生成诊断报告，请先在数据页生成深度诊断")
                .build();
        }

        int weekNum = currentWeekNum();
        String diagnosisJson = toJson(diagnosis);
        Map<String, Object> vars = new HashMap<>();
        vars.put("diagnosisReport", diagnosisJson);

        String system = "你是软考系统架构设计师考试的学习规划专家。请严格以 JSON 数组格式返回周学习计划。";
        String user = prompts.render("plan-generation", vars);

        List<WeeklyPlanItem> planItems;
        int tokensUsed;
        try {
            LlmRequest request = new LlmRequest(system, user, 0.4, 1500).withJsonMode();
            LlmResponse resp = llm.chat(request);
            planItems = parsePlanItems(resp.content(), diagnosis);
            tokensUsed = resp.tokensUsed();
            log.info("[Plan] 生成周计划 weekNum={} items={} tokens={}",
                weekNum, planItems.size(), tokensUsed);
        } catch (LlmUnavailableException e) {
            log.warn("规划 LLM 降级 reason={}", e.getReasonCode());
            return PlanResponse.builder()
                .degraded(true)
                .weekNum(weekNum)
                .message("AI 规划暂不可用: " + e.getMessage())
                .build();
        } catch (Exception e) {
            log.warn("规划异常", e);
            return PlanResponse.builder()
                .degraded(true)
                .weekNum(weekNum)
                .message("规划生成异常: " + e.getMessage())
                .build();
        }

        List<WeeklyTask> oldTasks = taskRepo.findByWeekNumAndSource(weekNum, "AI");
        for (WeeklyTask oldTask : oldTasks) {
            materialRepo.findByWeeklyTaskId(oldTask.getId()).ifPresent(materialRepo::delete);
        }
        taskRepo.deleteAiTasksByWeekNum(weekNum);

        List<WeeklyTask> savedTasks = new ArrayList<>();
        for (WeeklyPlanItem item : planItems) {
            for (String taskText : item.getTasks()) {
                WeeklyTask task = new WeeklyTask();
                task.setWeekNum(weekNum);
                task.setText(taskText);
                task.setDone(false);
                task.setDay(null);
                task.setDomainId(item.getDomainId());
                task.setFocus(item.getFocus());
                task.setSource("AI");
                int perTask = item.getTasks().isEmpty() ? item.getEstimatedMinutes()
                    : item.getEstimatedMinutes() / item.getTasks().size();
                task.setEstimatedMinutes(perTask);
                savedTasks.add(taskRepo.save(task));
            }
        }

        int totalMinutes = planItems.stream().mapToInt(WeeklyPlanItem::getEstimatedMinutes).sum();
        return PlanResponse.builder()
            .weekNum(weekNum)
            .planItems(planItems)
            .tasks(savedTasks.stream().map(this::toTaskView).collect(Collectors.toList()))
            .totalEstimatedMinutes(totalMinutes)
            .tokensUsed(tokensUsed)
            .degraded(false)
            .build();
    }

    public PlanResponse getCurrentPlan() {
        int weekNum = currentWeekNum();
        List<WeeklyTask> tasks = taskRepo.findByWeekNum(weekNum);
        if (tasks.isEmpty()) {
            return PlanResponse.builder()
                .weekNum(weekNum)
                .degraded(true)
                .message("本周暂无学习计划，点击上方按钮生成")
                .build();
        }
        int totalMinutes = tasks.stream()
            .filter(t -> t.getEstimatedMinutes() != null)
            .mapToInt(WeeklyTask::getEstimatedMinutes).sum();
        return PlanResponse.builder()
            .weekNum(weekNum)
            .tasks(tasks.stream().map(this::toTaskView).collect(Collectors.toList()))
            .totalEstimatedMinutes(totalMinutes)
            .degraded(false)
            .build();
    }

    @Transactional
    public PlanResponse.TaskView toggleTask(Long taskId) {
        WeeklyTask task = taskRepo.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        task.setDone(!task.getDone());
        taskRepo.save(task);
        return toTaskView(task);
    }

    private List<WeeklyPlanItem> parsePlanItems(String raw, DiagnosisReport diagnosis) {
        if (raw == null || raw.isBlank()) {
            throw new LlmUnavailableException("PARSE_FAILED", "规划 LLM 返回空内容");
        }
        String json = raw.trim();
        int start = json.indexOf('[');
        int end = json.lastIndexOf(']');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        try {
            List<WeeklyPlanItem> items = objectMapper.readValue(json, new TypeReference<>() {});
            Map<Long, String> domainNames = domainRepo.findAll().stream()
                .collect(Collectors.toMap(d -> d.getId(), d -> d.getName(), (a, b) -> a));
            Map<Long, DiagnosisReport.WeakDomain> weakMap = new HashMap<>();
            if (diagnosis.getWeakDomains() != null) {
                for (DiagnosisReport.WeakDomain wd : diagnosis.getWeakDomains()) {
                    weakMap.put(wd.getDomainId(), wd);
                }
            }
            for (WeeklyPlanItem item : items) {
                if (item.getDomainName() == null || item.getDomainName().isBlank()) {
                    item.setDomainName(domainNames.getOrDefault(item.getDomainId(), "未知"));
                }
                if (item.getTasks() == null) item.setTasks(new ArrayList<>());
                DiagnosisReport.WeakDomain wd = weakMap.get(item.getDomainId());
                if (wd != null) {
                    item.setAccuracy(wd.getAccuracy());
                    item.setErrorCount(wd.getErrorCount());
                }
            }
            return items;
        } catch (Exception e) {
            log.warn("规划 JSON 解析失败: {}", e.getMessage());
            throw new LlmUnavailableException("PARSE_FAILED", "无法解析规划 LLM 响应: " + e.getMessage(), e);
        }
    }

    private int currentWeekNum() {
        long weeks = ChronoUnit.WEEKS.between(WEEK_START_DATE, LocalDate.now());
        return (int) weeks + 1;
    }

    private PlanResponse.TaskView toTaskView(WeeklyTask task) {
        return PlanResponse.TaskView.builder()
            .id(task.getId())
            .text(task.getText())
            .done(task.getDone())
            .day(task.getDay())
            .domainId(task.getDomainId())
            .focus(task.getFocus())
            .estimatedMinutes(task.getEstimatedMinutes())
            .source(task.getSource())
            .build();
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
