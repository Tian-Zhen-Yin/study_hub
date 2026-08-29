package com.studyhub.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import jakarta.annotation.PostConstruct;
import java.util.Optional;

@Slf4j
public abstract class AbstractOpenAiLlmClient implements LlmClient {

    protected final ObjectMapper objectMapper;
    protected final LlmCache cache;
    protected RestClient restClient;

    protected AbstractOpenAiLlmClient(Optional<LlmCache> cacheOptional, ObjectMapper objectMapper) {
        this.cache = cacheOptional.orElse(null);
        this.objectMapper = objectMapper;
    }

    protected abstract String providerName();
    protected abstract String baseUrl();
    protected abstract String apiKey();
    protected abstract String model();
    protected abstract int timeoutSeconds();

    @PostConstruct
    void initClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) java.time.Duration.ofSeconds(timeoutSeconds()).toMillis());
        factory.setReadTimeout((int) java.time.Duration.ofSeconds(timeoutSeconds()).toMillis());
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl())
            .requestFactory(factory)
            .defaultHeader("Authorization", "Bearer " + apiKey())
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .build();
        log.info("{} initialized: model={}, timeout={}s, cache={}",
            providerName(), model(), timeoutSeconds(), this.cache != null ? "enabled" : "disabled");
    }

    @Override
    public LlmResponse chat(LlmRequest request) {
        String cacheKey = buildCacheKey(request);
        if (cache != null) {
            Optional<LlmResponse> hit = cache.get(cacheKey);
            if (hit.isPresent()) {
                log.debug("{} cache hit: {}", providerName(), cacheKey);
                return hit.get();
            }
        }

        LlmResponse response = doChat(request);
        if (cache != null) {
            cache.put(cacheKey, response);
        }
        return response;
    }

    private LlmResponse doChat(LlmRequest request) {
        if (apiKey() == null || apiKey().isBlank()) {
            throw new LlmUnavailableException("AUTH_FAILED",
                providerName() + " API Key 未配置,无法调用 LLM");
        }

        ObjectNode body = buildRequestBody(request);
        long start = System.currentTimeMillis();

        try {
            String responseBody = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

            long elapsed = System.currentTimeMillis() - start;
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            int tokens = root.path("usage").path("total_tokens").asInt(0);
            log.info("{} LLM 调用成功 耗时={}ms tokens={}", providerName(), elapsed, tokens);
            return LlmResponse.fresh(content, tokens);
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            log.warn("{} LLM 限流 (429), 退避后重试一次", providerName());
            sleep(2000);
            return retryOnce(request);
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            throw new LlmUnavailableException("AUTH_FAILED",
                providerName() + " API 鉴权失败 (401)", e);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errBody = e.getResponseBodyAsString();
            log.warn("{} API HTTP错误 status={} body={}", providerName(), e.getStatusCode(), errBody);
            if (e.getStatusCode().value() == 429) {
                throw new LlmUnavailableException("RATE_LIMIT",
                    providerName() + " API 限流 (429): " + errBody, e);
            }
            throw new LlmUnavailableException("HTTP_ERROR",
                providerName() + " API HTTP " + e.getStatusCode() + ": " + errBody, e);
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            String errBody = e.getResponseBodyAsString();
            log.warn("{} API 服务器错误 status={} body={}", providerName(), e.getStatusCode(), errBody);
            throw new LlmUnavailableException("SERVER_ERROR",
                providerName() + " API 服务器错误 " + e.getStatusCode() + ": " + errBody, e);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            if (e.getCause() instanceof java.net.SocketTimeoutException) {
                throw new LlmUnavailableException("TIMEOUT",
                    providerName() + " API 超时 (" + timeoutSeconds() + "s)", e);
            }
            throw new LlmUnavailableException("NETWORK_ERROR",
                providerName() + " 网络异常: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new LlmUnavailableException("UNKNOWN",
                providerName() + " LLM 调用异常: " + e.getMessage(), e);
        }
    }

    private LlmResponse retryOnce(LlmRequest request) {
        ObjectNode body = buildRequestBody(request);
        try {
            String responseBody = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            int tokens = root.path("usage").path("total_tokens").asInt(0);
            return LlmResponse.fresh(content, tokens);
        } catch (Exception e) {
            if (e instanceof LlmUnavailableException lue) {
                throw new LlmUnavailableException("RATE_LIMIT",
                    providerName() + " 限流重试仍失败: " + lue.getMessage(), lue);
            }
            throw new LlmUnavailableException("RETRY_FAILED",
                providerName() + " 重试异常: " + e.getMessage(), e);
        }
    }

    private ObjectNode buildRequestBody(LlmRequest request) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model());

        ArrayNode messages = body.putArray("messages");
        if (request.systemPrompt() != null && !request.systemPrompt().isBlank()) {
            ObjectNode sysMsg = messages.addObject();
            sysMsg.put("role", "system");
            sysMsg.put("content", request.systemPrompt());
        }
        ObjectNode userMsg = messages.addObject();
        userMsg.put("role", "user");
        userMsg.put("content", request.userPrompt());

        if (request.temperature() != null) {
            body.put("temperature", request.temperature());
        }
        if (request.maxTokens() != null) {
            body.put("max_tokens", request.maxTokens());
        }
        if (request.jsonMode()) {
            ObjectNode responseFormat = body.putObject("response_format");
            responseFormat.put("type", "json_object");
        }
        return body;
    }

    private String buildCacheKey(LlmRequest request) {
        String raw = (request.systemPrompt() == null ? "" : request.systemPrompt())
            + "|" + request.userPrompt()
            + "|" + request.temperature()
            + "|" + request.maxTokens()
            + "|" + request.jsonMode();
        return "llm:" + providerName() + ":" + Integer.toHexString(raw.hashCode()) + ":" + model();
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
