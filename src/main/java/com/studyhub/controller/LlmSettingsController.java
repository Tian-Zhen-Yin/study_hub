package com.studyhub.controller;

import com.studyhub.ai.LlmClient;
import com.studyhub.ai.LlmProviderRegistry;
import com.studyhub.ai.LlmRequest;
import com.studyhub.ai.LlmResponse;
import com.studyhub.ai.LlmUnavailableException;
import com.studyhub.ai.ProviderType;
import com.studyhub.dto.LlmConfigRequest;
import com.studyhub.dto.LlmProviderConfigDTO;
import com.studyhub.entity.LlmProviderConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/llm/settings")
@RequiredArgsConstructor
public class LlmSettingsController {

    private final LlmProviderRegistry registry;

    /** 各提供方推荐的模型预设,供前端快捷选择 */
    private static final Map<ProviderType, List<String>> MODEL_PRESETS = Map.of(
        ProviderType.ARK, List.of("doubao-seed-2-0-mini-260428", "doubao-pro-32k", "doubao-pro-4k", "doubao-lite-32k"),
        ProviderType.ZHIPU, List.of("glm-5.2", "glm-4-plus", "glm-4", "glm-4-flash", "glm-4-long"),
        ProviderType.DEEPSEEK, List.of("deepseek-chat", "deepseek-reasoner", "deepseek-coder"),
        ProviderType.MOCK, List.of()
    );

    @GetMapping
    public ResponseEntity<Map<String, Object>> list() {
        List<LlmProviderConfigDTO> configs = registry.listConfigs().stream()
            .map(LlmProviderConfigDTO::of)
            .collect(Collectors.toList());
        Long activeId = registry.getActiveConfig() == null ? null : registry.getActiveConfig().getId();
        List<Map<String, Object>> providers = Arrays.stream(ProviderType.values())
            .map(p -> Map.<String, Object>of(
                "value", p.name(),
                "label", p.getLabel(),
                "openAiCompatible", p.isOpenAiCompatible()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
            "code", 200,
            "data", Map.of(
                "configs", configs,
                "activeId", activeId,
                "providers", providers,
                "modelPresets", MODEL_PRESETS),
            "message", "ok"));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody LlmConfigRequest req) {
        LlmProviderConfig input = toEntity(req);
        LlmProviderConfig saved = registry.createConfig(input);
        return ResponseEntity.ok(Map.of("code", 200, "data", LlmProviderConfigDTO.of(saved), "message", "ok"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody LlmConfigRequest req) {
        LlmProviderConfig input = toEntity(req);
        LlmProviderConfig saved = registry.updateConfig(id, input);
        return ResponseEntity.ok(Map.of("code", 200, "data", LlmProviderConfigDTO.of(saved), "message", "ok"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            registry.deleteConfig(id);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return ResponseEntity.ok(Map.of("code", 200, "data", true, "message", "ok"));
    }

    @PutMapping("/active/{id}")
    public ResponseEntity<Map<String, Object>> setActive(@PathVariable Long id) {
        try {
            LlmProviderConfig saved = registry.setActive(id);
            return ResponseEntity.ok(Map.of("code", 200, "data", LlmProviderConfigDTO.of(saved), "message", "ok"));
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /** 连通性测试:用目标配置发起一次极小请求,验证 Key/模型/网络是否可用 */
    @PostMapping("/{id}/test")
    public ResponseEntity<Map<String, Object>> test(@PathVariable Long id) {
        LlmProviderConfig cfg = registry.getConfig(id);
        if (cfg.getProvider() == ProviderType.MOCK) {
            return ResponseEntity.ok(Map.of("code", 200, "data", Map.of(
                "success", true,
                "message", "Mock 模式,无需连通真实 API"), "message", "ok"));
        }
        if (!Boolean.TRUE.equals(cfg.getEnabled())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该配置已禁用,请先启用再测试");
        }
        LlmClient client = registry.buildTransientClient(cfg);
        LlmRequest probe = new LlmRequest(
            "你是一个连通性测试助手,只回复简短内容。",
            "请回复:pong", 0.0, 16, false);
        try {
            LlmResponse resp = client.chat(probe);
            return ResponseEntity.ok(Map.of("code", 200, "data", Map.of(
                "success", true,
                "message", "连通成功",
                "content", resp.content(),
                "tokens", resp.tokensUsed()), "message", "ok"));
        } catch (LlmUnavailableException e) {
            log.warn("连通测试失败 id={} reason={}: {}", id, e.getReasonCode(), e.getMessage());
            return ResponseEntity.ok(Map.of("code", 200, "data", Map.of(
                "success", false,
                "message", "连通失败 [" + e.getReasonCode() + "]: " + e.getMessage()), "message", "ok"));
        }
    }

    private LlmProviderConfig toEntity(LlmConfigRequest req) {
        if (req == null || req.provider() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "provider 不能为空");
        }
        return LlmProviderConfig.builder()
            .provider(req.provider())
            .displayName(req.displayName())
            .apiKey(req.apiKey())
            .baseUrl(req.baseUrl())
            .model(req.model())
            .timeoutSeconds(req.timeoutSeconds())
            .enabled(req.enabled() == null ? Boolean.TRUE : req.enabled())
            .active(false)
            .build();
    }
}
