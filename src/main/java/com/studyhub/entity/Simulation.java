package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "simulations")
public class Simulation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sim_date", nullable = false)
    private LocalDate simDate;

    @Column(name = "knowledge_score", nullable = false)
    private Integer knowledgeScore;

    @Column(name = "case_score", nullable = false)
    private Integer caseScore;

    @Column(name = "essay_score", nullable = false)
    private Integer essayScore;

    @Column(columnDefinition = "TEXT")
    private String strategy; // 答题策略 JSON

    @Column(columnDefinition = "TEXT")
    private String insights; // 复盘分析

    @Column(nullable = false)
    private Boolean convergence = false;
}