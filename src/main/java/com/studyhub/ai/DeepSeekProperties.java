package com.studyhub.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * DeepSeek 官方 API 默认参数(用于首次启动时播种默认配置行)。
 * DeepSeek 兼容 OpenAI Chat Completions 协议。
 */
@ConfigurationProperties(prefix = "studyhub.deepseek")
public record DeepSeekProperties(
    String apiKey,
    String baseUrl,
    String model,
    int timeoutSeconds
) {
    public DeepSeekProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.deepseek.com/v1";
        }
        if (model == null || model.isBlank()) {
            model = "deepseek-chat";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 30;
        }
    }
}
