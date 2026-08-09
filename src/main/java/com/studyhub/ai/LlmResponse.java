package com.studyhub.ai;

public record LlmResponse(
    String content,
    int tokensUsed,
    boolean cached
) {
    public static LlmResponse cached(String content, int tokensUsed) {
        return new LlmResponse(content, tokensUsed, true);
    }

    public static LlmResponse fresh(String content, int tokensUsed) {
        return new LlmResponse(content, tokensUsed, false);
    }
}
