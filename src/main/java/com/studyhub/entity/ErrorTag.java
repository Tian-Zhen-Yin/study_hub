package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "error_tags", indexes = {
    @Index(name = "idx_errortag_record", columnList = "answer_record_id"),
    @Index(name = "idx_errortag_domain_type", columnList = "domain_id,error_type"),
    @Index(name = "idx_errortag_question", columnList = "question_id")
})
public class ErrorTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answer_record_id", nullable = false)
    private AnswerRecord answerRecord;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "domain_id", nullable = false)
    private Long domainId;

    @Enumerated(EnumType.STRING)
    @Column(name = "error_type", nullable = false, length = 20)
    private ErrorType errorType;

    @Column(name = "confidence", nullable = false)
    private Double confidence;

    @Column(name = "ai_explanation", columnDefinition = "TEXT")
    private String aiExplanation;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
