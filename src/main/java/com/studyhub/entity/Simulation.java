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

    /** 三科分数：null 表示该科尚未交卷（按科交卷模式） */
    private Integer knowledgeScore;

    private Integer caseScore;

    private Integer essayScore;

    @Column(columnDefinition = "TEXT")
    private String strategy; // 答题策略 JSON

    @Column(columnDefinition = "TEXT")
    private String insights; // 复盘分析

    @Column(nullable = false)
    private Boolean convergence = false;
}