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
@Table(name = "study_materials", indexes = {
    @Index(name = "idx_material_task", columnList = "weekly_task_id")
})
public class StudyMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "weekly_task_id", nullable = false, unique = true)
    private Long weeklyTaskId;

    @Column(nullable = false, length = 200)
    private String focus;

    @Column(name = "domain_name", length = 100)
    private String domainName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
