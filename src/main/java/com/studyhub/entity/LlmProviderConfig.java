package com.studyhub.entity;

import com.studyhub.ai.ProviderType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 大模型提供方配置。
 * 每行表示一组可切换的 LLM 接入参数（provider + apiKey + model 等），
 * 同一 provider 可存在多行（多 Key 管理）。全局仅一行 active=true。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "llm_provider_config")
public class LlmProviderConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 16)
    private ProviderType provider;

    @Column(name = "display_name", nullable = false, length = 80)
    private String displayName;

    /** API Key,明文存储(本地学习应用);mock 提供方可留空 */
    @Column(name = "api_key", length = 256)
    private String apiKey;

    @Column(name = "base_url", length = 256)
    private String baseUrl;

    @Column(name = "model", length = 128)
    private String model;

    @Column(name = "timeout_seconds")
    private Integer timeoutSeconds;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    /** 全局唯一为 true 的行,表示当前生效的提供方 */
    @Column(name = "is_active", nullable = false)
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (enabled == null) enabled = true;
        if (active == null) active = false;
        if (timeoutSeconds == null || timeoutSeconds <= 0) timeoutSeconds = 30;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
