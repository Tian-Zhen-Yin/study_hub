package com.studyhub.repository;

import com.studyhub.entity.LlmProviderConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LlmProviderConfigRepository extends JpaRepository<LlmProviderConfig, Long> {

    List<LlmProviderConfig> findAllByOrderByActiveDescIdAsc();

    Optional<LlmProviderConfig> findByActiveTrue();

    @Modifying
    @Query("UPDATE LlmProviderConfig c SET c.active = false WHERE c.active = true")
    int clearActiveFlag();

    boolean existsByProvider(com.studyhub.ai.ProviderType provider);
}
