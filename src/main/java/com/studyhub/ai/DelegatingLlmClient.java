package com.studyhub.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * 委托型 LlmClient:作为唯一被服务层注入的 {@link LlmClient} Bean,
 * 将每次调用转发给 {@link LlmProviderRegistry} 当前生效的提供方客户端。
 * 这样运行时切换提供方无需改动任何 Service。
 */
@Slf4j
@Component
@Primary
@RequiredArgsConstructor
public class DelegatingLlmClient implements LlmClient {

    private final LlmProviderRegistry registry;

    @Override
    public LlmResponse chat(LlmRequest request) {
        return registry.activeClient().chat(request);
    }
}
