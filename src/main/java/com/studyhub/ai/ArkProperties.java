package com.studyhub.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "studyhub.ark")
public record ArkProperties(
    String apiKey,
    String baseUrl,
    String model,
    int timeoutSeconds
) {
    public ArkProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://ark.cn-beijing.volces.com/api/v3";
        }
        if (model == null || model.isBlank()) {
            model = "doubao-pro-32k";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 30;
        }
    }
}
