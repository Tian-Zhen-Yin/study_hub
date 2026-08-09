package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "territories")
public class Territory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "domain_id", nullable = false, unique = true)
    private Long domainId;

    @Column(nullable = false, length = 20)
    private String state = "fog";

    @Column(nullable = false)
    private Double accuracy = 0.0;

    @Column(name = "boss_defeated")
    private Boolean bossDefeated = false;

    @Column(name = "questions_answered")
    private Integer questionsAnswered = 0;
}
