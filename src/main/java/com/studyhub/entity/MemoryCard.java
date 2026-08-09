package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "memory_cards")
public class MemoryCard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id")
    private Long questionId;

    @Column(columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(nullable = false)
    private Integer intervalDays = 1;

    @Column(nullable = false)
    private Double easeFactor = 2.5;

    @Column(nullable = false)
    private Integer streak = 0;

    @Column(nullable = false, length = 10)
    private String state = "new";

    @Column(name = "next_review_at")
    private LocalDateTime nextReviewAt;

    @Column(name = "wrong_count")
    private Integer wrongCount = 0;

    @Column(name = "correct_count")
    private Integer correctCount = 0;

    @Column(name = "last_answer_at")
    private LocalDateTime lastAnswerAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
