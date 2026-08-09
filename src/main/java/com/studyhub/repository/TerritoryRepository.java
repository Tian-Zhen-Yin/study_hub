package com.studyhub.repository;

import com.studyhub.entity.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TerritoryRepository extends JpaRepository<Territory, Long> {
    Optional<Territory> findByDomainId(Long domainId);
}
