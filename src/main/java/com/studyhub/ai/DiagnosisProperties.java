package com.studyhub.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "studyhub.diagnosis")
public record DiagnosisProperties(
    boolean autoGenerate,
    String cron,
    int minRecords
) {
    public DiagnosisProperties {
        if (cron == null || cron.isBlank()) {
            cron = "0 0 22 ? * SUN";
        }
        if (minRecords <= 0) {
            minRecords = 20;
        }
    }
}
