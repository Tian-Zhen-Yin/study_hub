package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/** 历年真题试卷（如「2023年5月系统架构设计师真题」），题目通过 questions.paper_id 关联 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "exam_papers", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class ExamPaper {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    /** 考试科目：架构设计师 / 系统分析师 */
    @Column(nullable = false, length = 20)
    private String subject;

    /** 考试年月，如 2023-05 */
    @Column(name = "exam_date", length = 10)
    private String examDate;

    @Column(nullable = false, length = 20)
    private String source;
}
