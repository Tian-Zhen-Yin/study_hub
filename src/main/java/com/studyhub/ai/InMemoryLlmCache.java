package com.studyhub.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@Component
@ConditionalOnProperty(name = "studyhub.llm.cache.enabled", havingValue = "true", matchIfMissing = true)
public class InMemoryLlmCache implements LlmCache {

    private final int maxSize;
    private final Duration ttl;
    private final ReentrantLock lock = new ReentrantLock();
    private final Map<String, Entry> store;

    private static final class Entry {
        final LlmResponse response;
        final Instant expiresAt;

        Entry(LlmResponse response, Instant expiresAt) {
            this.response = response;
            this.expiresAt = expiresAt;
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    public InMemoryLlmCache(
            @Value("${studyhub.llm.cache.max-size:500}") int maxSize,
            @Value("${studyhub.llm.cache.ttl-hours:168}") long ttlHours) {
        this.maxSize = maxSize;
        this.ttl = Duration.ofHours(ttlHours);
        this.store = new LinkedHashMap<>(16, 0.75f, true);
    }

    @Override
    public Optional<LlmResponse> get(String key) {
        lock.lock();
        try {
            Entry entry = store.get(key);
            if (entry == null) return Optional.empty();
            if (entry.isExpired()) {
                store.remove(key);
                return Optional.empty();
            }
            return Optional.of(LlmResponse.cached(entry.response.content(), entry.response.tokensUsed()));
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void put(String key, LlmResponse response) {
        if (response == null || response.cached()) return;
        lock.lock();
        try {
            if (store.size() >= maxSize && !store.containsKey(key)) {
                String eldest = store.keySet().iterator().next();
                store.remove(eldest);
            }
            store.put(key, new Entry(response, Instant.now().plus(ttl)));
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void invalidate(String key) {
        lock.lock();
        try {
            store.remove(key);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void clear() {
        lock.lock();
        try {
            store.clear();
        } finally {
            lock.unlock();
        }
    }

    public int size() {
        lock.lock();
        try {
            return store.size();
        } finally {
            lock.unlock();
        }
    }
}
