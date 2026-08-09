package com.studyhub.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("InMemoryLlmCache 缓存测试")
class InMemoryLlmCacheTest {

    @Test
    @DisplayName("存入后可命中")
    void shouldHitAfterPut() {
        InMemoryLlmCache cache = new InMemoryLlmCache(10, 1);
        cache.put("key1", LlmResponse.fresh("content", 100));

        Optional<LlmResponse> hit = cache.get("key1");
        assertTrue(hit.isPresent());
        assertTrue(hit.get().cached());
        assertEquals("content", hit.get().content());
        assertEquals(100, hit.get().tokensUsed());
    }

    @Test
    @DisplayName("未存入的key不命中")
    void shouldMissWhenAbsent() {
        InMemoryLlmCache cache = new InMemoryLlmCache(10, 1);
        Optional<LlmResponse> hit = cache.get("absent");
        assertTrue(hit.isEmpty());
    }

    @Test
    @DisplayName("超过maxSize时LRU淘汰最旧条目")
    void shouldEvictLRUWhenFull() {
        InMemoryLlmCache cache = new InMemoryLlmCache(2, 24);
        cache.put("k1", LlmResponse.fresh("c1", 10));
        cache.put("k2", LlmResponse.fresh("c2", 20));
        cache.get("k1");
        cache.put("k3", LlmResponse.fresh("c3", 30));

        assertTrue(cache.get("k2").isEmpty(), "k2应被LRU淘汰");
        assertTrue(cache.get("k1").isPresent(), "k1刚被访问应保留");
        assertTrue(cache.get("k3").isPresent(), "k3是新插入的");
    }

    @Test
    @DisplayName("invalidate可移除指定key")
    void shouldInvalidateByKey() {
        InMemoryLlmCache cache = new InMemoryLlmCache(10, 1);
        cache.put("key", LlmResponse.fresh("c", 10));
        cache.invalidate("key");
        assertTrue(cache.get("key").isEmpty());
    }

    @Test
    @DisplayName("clear清空所有缓存")
    void shouldClearAll() {
        InMemoryLlmCache cache = new InMemoryLlmCache(10, 1);
        cache.put("k1", LlmResponse.fresh("c1", 10));
        cache.put("k2", LlmResponse.fresh("c2", 20));
        cache.clear();
        assertEquals(0, cache.size());
    }

    @Test
    @DisplayName("cached的response不会被重复存入")
    void shouldNotStoreCachedResponse() {
        InMemoryLlmCache cache = new InMemoryLlmCache(10, 1);
        cache.put("k1", LlmResponse.cached("c", 10));
        assertTrue(cache.get("k1").isEmpty());
    }
}
