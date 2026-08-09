package com.studyhub.dto;

import com.studyhub.ai.ProviderType;

/**
 * 创建/更新大模型提供方配置的请求体。
 * apiKey 在更新时为空表示不修改原 Key。
 */
public record LlmConfigRequest(
    ProviderType provider,
    String displayName,
    String apiKey,
    String baseUrl,
    String model,
    Integer timeoutSeconds,
    Boolean enabled
) {
}
