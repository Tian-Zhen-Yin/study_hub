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
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    private Long id = 1L;

    @Column(name = "metal_precision", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double metalPrecision = 0.500;

    @Column(name = "wood_growth", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double woodGrowth = 0.500;

    @Column(name = "water_fluency", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double waterFluency = 0.500;

    @Column(name = "fire_enthusiasm", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double fireEnthusiasm = 0.500;

    @Column(name = "earth_stability", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double earthStability = 0.500;

    @Column(name = "balance_score", nullable = false, columnDefinition = "DECIMAL(4,3)")
    private Double balanceScore = 0.000;

    @Column(name = "crisis_dimension", length = 20)
    private String crisisDimension;

    @Column(name = "total_rounds", nullable = false)
    private Integer totalRounds = 0;

    @Column(name = "total_correct", nullable = false)
    private Integer totalCorrect = 0;

    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak = 0;

    @Column(name = "last_answer_at")
    private LocalDateTime lastAnswerAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
