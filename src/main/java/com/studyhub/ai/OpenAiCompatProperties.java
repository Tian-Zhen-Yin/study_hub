package com.studyhub.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 通用 OpenAI 兼容协议默认参数（适用于本地 Ollama、OpenRouter、硅基流动、通义千问、OpenAI 等）。
 */
@ConfigurationProperties(prefix = "studyhub.openai-compat")
public record OpenAiCompatProperties(
    String apiKey,
    String baseUrl,
    String model,
    int timeoutSeconds
) {
    public OpenAiCompatProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:11434/v1";
        }
        if (model == null || model.isBlank()) {
            model = "qwen2.5:7b";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 60;
        }
    }
}
