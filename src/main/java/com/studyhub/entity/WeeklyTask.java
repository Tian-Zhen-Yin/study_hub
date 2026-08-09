package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "weekly_tasks", indexes = {
    @Index(name = "idx_weeklytask_week", columnList = "week_num"),
    @Index(name = "idx_weeklytask_source", columnList = "source")
})
public class WeeklyTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "week_num", nullable = false)
    private Integer weekNum;

    @Column(nullable = false, length = 200)
    private String text;

    @Column(nullable = false)
    private Boolean done = false;

    @Column(length = 10)
    private String day;

    @Column(name = "domain_id")
    private Long domainId;

    @Column(length = 200)
    private String focus;

    @Column(length = 10)
    private String source = "MANUAL";

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;
}
