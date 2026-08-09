package com.studyhub.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;

public class ConfigurableAnthropicLlmClient extends AbstractAnthropicLlmClient {

    private final String providerName;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;

    public ConfigurableAnthropicLlmClient(String providerName, String baseUrl, String apiKey,
                                           String model, int timeoutSeconds,
                                           Optional<LlmCache> cacheOptional, ObjectMapper objectMapper) {
        super(cacheOptional, objectMapper);
        this.providerName = providerName;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
    }

    @Override
    protected String providerName() { return providerName; }

    @Override
    protected String baseUrl() { return baseUrl; }

    @Override
    protected String apiKey() { return apiKey; }

    @Override
    protected String model() { return model; }

    @Override
    protected int timeoutSeconds() { return timeoutSeconds; }
}
