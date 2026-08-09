package com.studyhub.repository;

import com.studyhub.entity.Diagnosis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DiagnosisRepository extends JpaRepository<Diagnosis, Long> {

    List<Diagnosis> findByDomainId(Long domainId);

    List<Diagnosis> findAllByOrderByDiagDateDesc();

    @Query("SELECT MAX(d.diagDate) FROM Diagnosis d WHERE d.triggerType IS NOT NULL")
    LocalDate findLatestAiDiagDate();
}
