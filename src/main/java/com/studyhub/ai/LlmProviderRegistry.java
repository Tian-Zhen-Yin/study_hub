package com.studyhub.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.entity.LlmProviderConfig;
import com.studyhub.repository.LlmProviderConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 大模型提供方注册表:负责配置的 CRUD、活动提供方切换、客户端实例缓存与默认配置播种。
 * 所有运行时切换都在内存中完成,无需重启。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LlmProviderRegistry {

    private final LlmProviderConfigRepository repo;
    private final ObjectMapper objectMapper;
    private final Optional<LlmCache> cacheOptional;
    private final ArkProperties arkProperties;
    private final ZhipuProperties zhipuProperties;
    private final DeepSeekProperties deepSeekProperties;
    private final OpenAiCompatProperties openAiCompatProperties;

    @Value("${studyhub.llm.provider:mock}")
    private String startupProvider;

    /** configId -> 已初始化的 LlmClient,避免每次调用重建 RestClient */
    private final Map<Long, LlmClient> clientCache = new ConcurrentHashMap<>();

    /** Mock 客户端单例(无状态,可复用) */
    private volatile MockLlmClient mockClient;

    @PostConstruct
    void init() {
        seedDefaultsIfEmpty();
        ensureActiveExists();
        LlmProviderConfig active = repo.findByActiveTrue().orElse(null);
        if (active != null) {
            log.info("[LlmRegistry] 当前生效提供方: id={} provider={} model={}",
                active.getId(), active.getProvider(), active.getModel());
        }
    }

    /* ============ 查询 ============ */

    @Transactional(readOnly = true)
    public List<LlmProviderConfig> listConfigs() {
        return repo.findAllByOrderByActiveDescIdAsc();
    }

    @Transactional(readOnly = true)
    public LlmProviderConfig getConfig(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("配置不存在: id=" + id));
    }

    @Transactional(readOnly = true)
    public LlmProviderConfig getActiveConfig() {
        return repo.findByActiveTrue().orElse(null);
    }

    /* ============ 增删改 ============ */

    @Transactional
    public LlmProviderConfig createConfig(LlmProviderConfig input) {
        normalizeDefaults(input);
        LlmProviderConfig saved = repo.save(input);
        log.info("[LlmRegistry] 新增配置 id={} provider={} name={}",
            saved.getId(), saved.getProvider(), saved.getDisplayName());
        return saved;
    }

    @Transactional
    public LlmProviderConfig updateConfig(Long id, LlmProviderConfig input) {
        LlmProviderConfig existing = getConfig(id);
        existing.setProvider(input.getProvider());
        existing.setDisplayName(input.getDisplayName());
        // apiKey 为空视为不修改(前端列表会对 Key 做脱敏)
        if (input.getApiKey() != null && !input.getApiKey().isBlank()) {
            existing.setApiKey(input.getApiKey().trim());
        }
        if (input.getBaseUrl() != null) existing.setBaseUrl(input.getBaseUrl().trim());
        if (input.getModel() != null) existing.setModel(input.getModel().trim());
        if (input.getTimeoutSeconds() != null && input.getTimeoutSeconds() > 0) {
            existing.setTimeoutSeconds(input.getTimeoutSeconds());
        }
        if (input.getEnabled() != null) existing.setEnabled(input.getEnabled());
        normalizeDefaults(existing);
        LlmProviderConfig saved = repo.save(existing);
        invalidate(saved.getId());
        log.info("[LlmRegistry] 更新配置 id={} provider={} model={}",
            saved.getId(), saved.getProvider(), saved.getModel());
        return saved;
    }

    @Transactional
    public void deleteConfig(Long id) {
        LlmProviderConfig cfg = getConfig(id);
        if (Boolean.TRUE.equals(cfg.getActive())) {
            throw new IllegalStateException("不能删除当前生效的提供方,请先切换到其它配置");
        }
        repo.deleteById(id);
        invalidate(id);
        log.info("[LlmRegistry] 删除配置 id={}", id);
    }

    @Transactional
    public LlmProviderConfig setActive(Long id) {
        LlmProviderConfig target = getConfig(id);
        if (Boolean.FALSE.equals(target.getEnabled())) {
            throw new IllegalStateException("该配置已禁用,无法切换为生效");
        }
        repo.clearActiveFlag();
        target.setActive(true);
        LlmProviderConfig saved = repo.save(target);
        // 切换生效方时,清空整个客户端缓存(旧活动方不再需要)
        clientCache.clear();
        log.info("[LlmRegistry] 切换生效提供方 -> id={} provider={} model={}",
            saved.getId(), saved.getProvider(), saved.getModel());
        return saved;
    }

    /* ============ 客户端获取 ============ */

    /**
     * 返回当前生效提供方的 LlmClient。无生效配置时回退到 Mock,避免调用方 NPE。
     */
    public LlmClient activeClient() {
        LlmProviderConfig active = repo.findByActiveTrue().orElse(null);
        if (active == null) {
            log.warn("[LlmRegistry] 无生效提供方,回退到 Mock");
            return mockClient();
        }
        if (!Boolean.TRUE.equals(active.getEnabled())) {
            log.warn("[LlmRegistry] 生效提供方已禁用,回退到 Mock: id={}", active.getId());
            return mockClient();
        }
        return clientFor(active);
    }

    /**
     * 构建指定配置的临时客户端(不入缓存,已完成初始化),用于连通性测试。
     */
    public LlmClient buildTransientClient(LlmProviderConfig cfg) {
        LlmClient client = buildClient(cfg);
        if (client instanceof ConfigurableOpenAiLlmClient c) {
            c.initClient();
        } else if (client instanceof ConfigurableAnthropicLlmClient c) {
            c.initClient();
        }
        return client;
    }

    private LlmClient clientFor(LlmProviderConfig cfg) {
        if (cfg.getProvider() == ProviderType.MOCK) {
            return mockClient();
        }
        return clientCache.computeIfAbsent(cfg.getId(), k -> {
            LlmClient client = buildClient(cfg);
            if (client instanceof ConfigurableOpenAiLlmClient c) {
                c.initClient();
            } else if (client instanceof ConfigurableAnthropicLlmClient c) {
                c.initClient();
            }
            return client;
        });
    }

    private LlmClient buildClient(LlmProviderConfig cfg) {
        if (cfg.getProvider() == ProviderType.MOCK) {
            return mockClient();
        }
        if (isAnthropicProtocol(cfg)) {
            String name = cfg.getProvider().getLabel();
            return new ConfigurableAnthropicLlmClient(
                name,
                cfg.getBaseUrl(),
                cfg.getApiKey(),
                cfg.getModel(),
                cfg.getTimeoutSeconds() == null ? 30 : cfg.getTimeoutSeconds(),
                cacheOptional,
                objectMapper
            );
        }
        String name = cfg.getProvider().getLabel();
        return new ConfigurableOpenAiLlmClient(
            name,
            cfg.getBaseUrl(),
            cfg.getApiKey(),
            cfg.getModel(),
            cfg.getTimeoutSeconds() == null ? 30 : cfg.getTimeoutSeconds(),
            cacheOptional,
            objectMapper
        );
    }

    private MockLlmClient mockClient() {
        if (mockClient == null) {
            mockClient = new MockLlmClient();
        }
        return mockClient;
    }

    private void invalidate(Long id) {
        clientCache.remove(id);
    }

    private boolean isAnthropicProtocol(LlmProviderConfig cfg) {
        if (cfg.getBaseUrl() == null) return false;
        String url = cfg.getBaseUrl().toLowerCase();
        return url.contains("/anthropic");
    }

    /* ============ 默认播种 ============ */

    private void seedDefaultsIfEmpty() {
        if (repo.count() > 0) return;
        log.info("[LlmRegistry] 首次启动,播种默认提供方配置");
        LocalDateTime now = LocalDateTime.now();
        ProviderType startup = parseStartupProvider();

        repo.save(buildSeed(ProviderType.ARK, "火山引擎 Doubao",
            arkProperties.apiKey(), arkProperties.baseUrl(), arkProperties.model(),
            arkProperties.timeoutSeconds(), startup == ProviderType.ARK, now));
        repo.save(buildSeed(ProviderType.ZHIPU, "智谱 GLM",
            zhipuProperties.apiKey(), zhipuProperties.baseUrl(), zhipuProperties.model(),
            zhipuProperties.timeoutSeconds(), startup == ProviderType.ZHIPU, now));
        repo.save(buildSeed(ProviderType.DEEPSEEK, "DeepSeek",
            deepSeekProperties.apiKey(), deepSeekProperties.baseUrl(), deepSeekProperties.model(),
            deepSeekProperties.timeoutSeconds(), startup == ProviderType.DEEPSEEK, now));
        repo.save(buildSeed(ProviderType.OPENAI_COMPAT, "本地 Ollama / OpenAI 兼容",
            openAiCompatProperties.apiKey(), openAiCompatProperties.baseUrl(), openAiCompatProperties.model(),
            openAiCompatProperties.timeoutSeconds(), startup == ProviderType.OPENAI_COMPAT, now));
        repo.save(buildSeed(ProviderType.MOCK, "Mock 本地验证",
            null, null, null, 30, startup == ProviderType.MOCK, now));
    }

    private void ensureActiveExists() {
        if (repo.findByActiveTrue().isPresent()) return;
        // 启动配置无对应行或未匹配,默认激活第一行(优先非 mock)
        List<LlmProviderConfig> all = repo.findAllByOrderByActiveDescIdAsc();
        LlmProviderConfig pick = all.stream()
            .filter(c -> c.getProvider() != ProviderType.MOCK)
            .filter(c -> Boolean.TRUE.equals(c.getEnabled()))
            .findFirst()
            .orElse(all.stream().findFirst().orElse(null));
        if (pick == null) return;
        repo.clearActiveFlag();
        pick.setActive(true);
        repo.save(pick);
        log.info("[LlmRegistry] 未指定活动提供方,默认激活 id={} provider={}",
            pick.getId(), pick.getProvider());
    }

    private LlmProviderConfig buildSeed(ProviderType provider, String displayName,
                                        String apiKey, String baseUrl, String model,
                                        int timeout, boolean active, LocalDateTime now) {
        return LlmProviderConfig.builder()
            .provider(provider)
            .displayName(displayName)
            .apiKey(apiKey)
            .baseUrl(baseUrl)
            .model(model)
            .timeoutSeconds(timeout)
            .enabled(true)
            .active(active)
            .createdAt(now)
            .updatedAt(now)
            .build();
    }

    private ProviderType parseStartupProvider() {
        if (startupProvider == null) return ProviderType.MOCK;
        return switch (startupProvider.trim().toLowerCase()) {
            case "ark" -> ProviderType.ARK;
            case "zhipu" -> ProviderType.ZHIPU;
            case "deepseek" -> ProviderType.DEEPSEEK;
            case "openai_compat", "openai", "ollama" -> ProviderType.OPENAI_COMPAT;
            case "mock" -> ProviderType.MOCK;
            default -> ProviderType.MOCK;
        };
    }

    private void normalizeDefaults(LlmProviderConfig c) {
        if (c.getProvider() == null) {
            throw new IllegalArgumentException("provider 不能为空");
        }
        if (c.getDisplayName() == null || c.getDisplayName().isBlank()) {
            c.setDisplayName(c.getProvider().getLabel());
        }
        if (c.getEnabled() == null) c.setEnabled(true);
        if (c.getActive() == null) c.setActive(false);
        if (c.getTimeoutSeconds() == null || c.getTimeoutSeconds() <= 0) {
            c.setTimeoutSeconds(30);
        }
        if (c.getProvider().isOpenAiCompatible()) {
            if (c.getBaseUrl() == null || c.getBaseUrl().isBlank()) {
                c.setBaseUrl(defaultBaseUrl(c.getProvider()));
            }
            if (c.getModel() == null || c.getModel().isBlank()) {
                c.setModel(defaultModel(c.getProvider()));
            }
        } else {
            // mock 不需要 baseUrl/model
            c.setBaseUrl(null);
            c.setModel(null);
            c.setApiKey(null);
        }
        if (c.getApiKey() != null) c.setApiKey(c.getApiKey().trim());
    }

    private String defaultBaseUrl(ProviderType p) {
        return switch (p) {
            case ARK -> arkProperties.baseUrl();
            case ZHIPU -> zhipuProperties.baseUrl();
            case DEEPSEEK -> deepSeekProperties.baseUrl();
            case OPENAI_COMPAT -> openAiCompatProperties.baseUrl();
            case MOCK -> null;
        };
    }

    private String defaultModel(ProviderType p) {
        return switch (p) {
            case ARK -> arkProperties.model();
            case ZHIPU -> zhipuProperties.model();
            case DEEPSEEK -> deepSeekProperties.model();
            case OPENAI_COMPAT -> openAiCompatProperties.model();
            case MOCK -> null;
        };
    }
}
