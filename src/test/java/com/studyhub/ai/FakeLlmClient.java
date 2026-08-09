package com.studyhub.ai;

import java.util.LinkedList;
import java.util.Queue;

public class FakeLlmClient implements LlmClient {

    private final Queue<LlmResponse> responses = new LinkedList<>();
    private final Queue<RuntimeException> exceptions = new LinkedList<>();
    private int callCount = 0;

    public FakeLlmClient enqueueResponse(String content, int tokens) {
        responses.add(LlmResponse.fresh(content, tokens));
        return this;
    }

    public FakeLlmClient enqueueTimeout() {
        exceptions.add(new LlmUnavailableException("TIMEOUT", "模拟超时"));
        return this;
    }

    public FakeLlmClient enqueueAuthError() {
        exceptions.add(new LlmUnavailableException("AUTH_FAILED", "模拟鉴权失败"));
        return this;
    }

    @Override
    public LlmResponse chat(LlmRequest request) {
        callCount++;
        if (!exceptions.isEmpty()) {
            throw exceptions.poll();
        }
        return responses.poll();
    }

    public int getCallCount() {
        return callCount;
    }

    public void reset() {
        responses.clear();
        exceptions.clear();
        callCount = 0;
    }
}
