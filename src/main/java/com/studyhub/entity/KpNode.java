package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 知识图谱节点（考点）。层级来自芝士架构真题库的 kpId/parentKpId，
 * question_count / freq / essence 由导入脚本按题库实际数据统计写入。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "kp_nodes", indexes = @Index(name = "idx_kp_parent", columnList = "parent_id"))
public class KpNode {
    /** 直接使用来源站点的考点 ID，保证跨导入幂等 */
    @Id
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "parent_id")
    private Long parentId;

    /** true 表示纯层级父节点（本身不直接挂题） */
    @Column(name = "is_parent", nullable = false)
    private Boolean isParent = false;

    /** 高频 / 中频 / 低频（该考点下题目出现频率的众数） */
    @Column(nullable = false, length = 10)
    private String freq = "未标注";

    /** 考点精讲（取自真题库 essence，可空） */
    @Column(columnDefinition = "TEXT")
    private String essence;

    /** 关联题目数（含按考点名匹配的存量题） */
    @Column(name = "question_count", nullable = false)
    private Integer questionCount = 0;
}
