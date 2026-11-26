package com.studyhub.ai;

/**
 * 支持的 LLM 提供方类型。
 * ark/zhipu/deepseek 均兼容 OpenAI Chat Completions 协议，mock 用于无 Key 本地验证。
 */
public enum ProviderType {
    ARK("火山引擎 Ark"),
    ZHIPU("智谱 GLM"),
    DEEPSEEK("DeepSeek"),
    OPENAI_COMPAT("OpenAI 兼容 / Ollama"),
    MOCK("Mock(不调用真实模型)");

    private final String label;

    ProviderType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /**
     * 是否走 OpenAI 兼容协议（需要 baseUrl / apiKey / model）。
     */
    public boolean isOpenAiCompatible() {
        return this != MOCK;
    }
}
