package com.studyhub.ai;

public record LlmRequest(
    String systemPrompt,
    String userPrompt,
    Double temperature,
    Integer maxTokens,
    boolean jsonMode
) {
    public LlmRequest(String systemPrompt, String userPrompt, Double temperature, Integer maxTokens) {
        this(systemPrompt, userPrompt, temperature, maxTokens, false);
    }

    public LlmRequest withJsonMode() {
        return new LlmRequest(systemPrompt, userPrompt, temperature, maxTokens, true);
    }
}
