package com.studyhub.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "studyhub.zhipu")
public record ZhipuProperties(
    String apiKey,
    String baseUrl,
    String model,
    int timeoutSeconds
) {
    public ZhipuProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://open.bigmodel.cn/api/paas/v4";
        }
        if (model == null || model.isBlank()) {
            model = "glm-4-flash";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 30;
        }
    }
}
