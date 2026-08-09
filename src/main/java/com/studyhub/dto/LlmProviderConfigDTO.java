package com.studyhub.dto;

import com.studyhub.ai.ProviderType;
import com.studyhub.entity.LlmProviderConfig;

import java.time.LocalDateTime;

/**
 * 大模型提供方配置对外视图。apiKey 一律脱敏返回,真实 Key 不出后端。
 */
public record LlmProviderConfigDTO(
    Long id,
    ProviderType provider,
    String providerLabel,
    String displayName,
    String apiKeyMasked,
    boolean hasApiKey,
    String baseUrl,
    String model,
    Integer timeoutSeconds,
    boolean enabled,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static LlmProviderConfigDTO of(LlmProviderConfig c) {
        String key = c.getApiKey();
        boolean has = key != null && !key.isBlank();
        String masked = has ? mask(key) : null;
        return new LlmProviderConfigDTO(
            c.getId(),
            c.getProvider(),
            c.getProvider().getLabel(),
            c.getDisplayName(),
            masked,
            has,
            c.getBaseUrl(),
            c.getModel(),
            c.getTimeoutSeconds(),
            Boolean.TRUE.equals(c.getEnabled()),
            Boolean.TRUE.equals(c.getActive()),
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }

    private static String mask(String key) {
        if (key.length() <= 8) return "••••" + key.substring(Math.max(0, key.length() - 2));
        return "••••" + key.substring(key.length() - 4);
    }
}
