package com.studyhub.ai;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;

/**
 * 由参数构造的 OpenAI 兼容 LLM 客户端,覆盖 ark/zhipu/deepseek 等遵循
 * OpenAI Chat Completions 协议的提供方。由 {@link LlmProviderRegistry} 按需构造,
 * 不作为 Spring Bean 管理(构造后需手动调用 {@link #initClient()} 完成 RestClient 初始化)。
 */
public class ConfigurableOpenAiLlmClient extends AbstractOpenAiLlmClient {

    private final String providerName;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;

    public ConfigurableOpenAiLlmClient(String providerName, String baseUrl, String apiKey,
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
