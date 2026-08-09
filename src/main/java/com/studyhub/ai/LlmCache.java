package com.studyhub.ai;

import java.util.Optional;

public interface LlmCache {
    Optional<LlmResponse> get(String key);
    void put(String key, LlmResponse response);
    void invalidate(String key);
    void clear();
}
