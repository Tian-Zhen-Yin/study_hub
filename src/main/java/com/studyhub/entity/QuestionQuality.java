package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 题目质量标签（由 LLM 批量标注，见 scripts/llm-tag/）。
 * 与 questions 一对一，question_id 即主键。
 */
@Data
@Entity
@Table(name = "question_quality")
public class QuestionQuality {

    @Id
    @Column(name = "question_id")
    private Long questionId;

    /** 考点名称（学科标准术语，≤10 汉字） */
    @Column(name = "knowledge_point", nullable = false, length = 60)
    private String knowledgePoint;

    /** CONCEPT/SCENARIO/CALC/RECALL/CASE/ESSAY */
    @Column(name = "q_type", nullable = false, length = 12)
    private String qType;

    /** 质量分 1~5：5=题干清晰+干扰项有效+可举一反三 */
    @Column(nullable = false)
    private Integer score;

    @Column(length = 120)
    private String note;

    @Column(length = 40)
    private String model;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
