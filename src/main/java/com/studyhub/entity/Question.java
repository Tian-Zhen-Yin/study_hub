package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "questions", indexes = {
    @Index(name = "idx_domain_id", columnList = "domain_id"),
    @Index(name = "idx_source", columnList = "source")
})
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(nullable = false, length = 20)
    private String subject;

    /** 题型：MCQ 单选（默认）/ CASE 案例分析 / ESSAY 论文。存量数据自动视为 MCQ */
    @Column(name = "question_type", nullable = false, length = 10)
    private String type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Domain domain;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String stem;

    @Column(name = "options_json", columnDefinition = "TEXT")
    private String optionsJson;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Column(name = "exam_year", length = 10)
    private String examYear;

    @Column(name = "source_file", length = 200)
    private String sourceFile;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** 问题标记类型：INCOMPLETE_STEM/MISSING_IMAGE/BROKEN_OPTIONS/WRONG_ANSWER/MISSING_ANALYSIS/OTHER，null 表示未标记 */
    @Column(name = "flag_type", length = 20)
    private String flagType;

    @Column(name = "flag_note", columnDefinition = "TEXT")
    private String flagNote;

    @Column(name = "flagged_at")
    private java.time.LocalDateTime flaggedAt;

    /** 历年真题试卷（exam_papers.id），练习题/自制题为 NULL */
    @Column(name = "paper_id")
    private Long paperId;

    /** 题号（试卷内序号） */
    @Column(name = "exam_sort")
    private Integer examSort;

    /** 外部来源唯一键（如 cheko:case:5），用于爬虫导入幂等 */
    @Column(name = "external_key", length = 100)
    private String externalKey;

    /** 知识图谱考点（kp_nodes.id） */
    @Column(name = "kp_node_id")
    private Long kpNodeId;
}
