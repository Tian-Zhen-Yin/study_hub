package com.studyhub.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/** 知识图谱考点关联边：kind=co 同卷共现 / semantic LLM 语义关联（层级关系用 kp_nodes.parent_id 表达） */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "kp_edges", uniqueConstraints = @UniqueConstraint(columnNames = {"src_id", "dst_id", "kind"}),
        indexes = @Index(name = "idx_kp_edge_src", columnList = "src_id"))
public class KpEdge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 两端考点 id，约定 src_id < dst_id */
    @Column(name = "src_id", nullable = false)
    private Long srcId;

    @Column(name = "dst_id", nullable = false)
    private Long dstId;

    /** co / semantic */
    @Column(nullable = false, length = 10)
    private String kind;

    /** 共现卷数 / 语义关联度 1-3 */
    @Column(nullable = false)
    private Integer weight;

    @Column(columnDefinition = "TEXT")
    private String note;
}
