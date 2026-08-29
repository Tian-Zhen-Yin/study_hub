package com.studyhub.service;

import com.studyhub.ai.*;
import com.studyhub.entity.StudyMaterial;
import com.studyhub.entity.WeeklyTask;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.StudyMaterialRepository;
import com.studyhub.repository.WeeklyTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudyMaterialService {

    private final LlmClient llm;
    private final PromptRegistry prompts;
    private final WeeklyTaskRepository taskRepo;
    private final StudyMaterialRepository materialRepo;
    private final DomainRepository domainRepo;

    @Transactional
    public Map<String, Object> generateMaterial(Long taskId) {
        WeeklyTask task = taskRepo.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));

        materialRepo.findByWeeklyTaskId(taskId).ifPresent(m -> {
            materialRepo.delete(m);
            materialRepo.flush();
            log.info("[Material] 删除旧资料 taskId={}", taskId);
        });

        String focus = task.getFocus();
        if (focus == null || focus.isBlank()) {
            focus = task.getText();
        }

        String domainName = "未知领域";
        if (task.getDomainId() != null) {
            domainName = domainRepo.findById(task.getDomainId())
                .map(d -> d.getName())
                .orElse("知识域#" + task.getDomainId());
        }

        Map<String, Object> vars = new HashMap<>();
        vars.put("focus", focus);
        vars.put("domainName", domainName);

        String system = "你是软考系统架构设计师考试的教学专家。请生成结构化的 Markdown 学习资料，包含 Mermaid 图表。";
        String user = prompts.render("material-generation", vars);

        LlmRequest request = new LlmRequest(system, user, 0.5, 8000);
        LlmResponse resp = llm.chat(request);

        String rawContent = resp.content();
        if (rawContent != null) {
            rawContent = rawContent.replaceAll("^```(?:markdown|md)?\\s*\\n", "")
                                   .replaceAll("\\n```\\s*$", "")
                                   .trim();
        }

        StudyMaterial material = new StudyMaterial();
        material.setWeeklyTaskId(taskId);
        material.setFocus(focus);
        material.setDomainName(domainName);
        material.setContent(rawContent);
        material.setTokensUsed(resp.tokensUsed());
        material.setCreatedAt(LocalDateTime.now());
        materialRepo.save(material);

        log.info("[Material] 生成学习资料 taskId={} focus={} tokens={}",
            taskId, focus, resp.tokensUsed());

        return toMap(material);
    }

    public Map<String, Object> getMaterial(Long taskId) {
        return materialRepo.findByWeeklyTaskId(taskId)
            .map(this::toMap)
            .orElse(null);
    }

    private Map<String, Object> toMap(StudyMaterial m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("weeklyTaskId", m.getWeeklyTaskId());
        map.put("focus", m.getFocus());
        map.put("domainName", m.getDomainName());
        map.put("content", m.getContent());
        map.put("tokensUsed", m.getTokensUsed());
        map.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        return map;
    }
}
