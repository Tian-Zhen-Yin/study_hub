package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "diagnoses")
public class Diagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "diag_date", nullable = false)
    private LocalDate diagDate;

    @Column(nullable = false, length = 20)
    private String subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Domain domain;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer total;

    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "trigger_type", length = 10)
    private String triggerType;

    @Column(name = "report_json", columnDefinition = "MEDIUMTEXT")
    private String reportJson;

    @Column(name = "weak_domain_ranking", length = 1000)
    private String weakDomainRanking;

    @Column(name = "error_distribution", length = 500)
    private String errorDistribution;

    @Column(name = "llm_tokens_used")
    private Integer llmTokensUsed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
