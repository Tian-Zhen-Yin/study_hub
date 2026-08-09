package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "game_state")
public class GameState {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id = 1L;

    @Column(nullable = false)
    private Integer exp = 0;

    @Column(nullable = false)
    private Integer gold = 0;

    @Column(name = "level", nullable = false)
    private Integer level = 1;

    @Column(nullable = false, length = 30)
    private String title = "\u5b66\u5f92";

    @Column(name = "current_combo")
    private Integer currentCombo = 0;

    @Column(name = "max_combo")
    private Integer maxCombo = 0;

    @Column(name = "daily_challenges_used")
    private Integer dailyChallengesUsed = 0;

    @Column(name = "daily_challenge_date")
    private LocalDate dailyChallengeDate;

    @Column(name = "login_streak")
    private Integer loginStreak = 0;

    @Column(name = "last_login_date")
    private LocalDate lastLoginDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
