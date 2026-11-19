package com.studyhub.repository;

import com.studyhub.entity.QuestionQuality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionQualityRepository extends JpaRepository<QuestionQuality, Long> {

    List<QuestionQuality> findByQuestionId(Long questionId);

    /**
     * 按考点聚合作答统计。
     * 返回：domain_id、考点名、作答数、正确数
     */
    @Query(value = "SELECT q.domain_id, qq.knowledge_point, COUNT(ar.id), " +
           "SUM(CASE WHEN ar.is_correct = 1 THEN 1 ELSE 0 END) " +
           "FROM answer_records ar " +
           "JOIN questions q ON ar.question_id = q.id " +
           "JOIN question_quality qq ON qq.question_id = q.id " +
           "WHERE q.source NOT IN ('OUTDATED', 'MOCK') " +
           "GROUP BY q.domain_id, qq.knowledge_point", nativeQuery = true)
    List<Object[]> aggregateByKp();

    /**
     * 各考点题量（有效题）。
     * 返回：domain_id、考点名、域名、题数
     */
    @Query(value = "SELECT q.domain_id, qq.knowledge_point, d.name, COUNT(*) " +
           "FROM question_quality qq " +
           "JOIN questions q ON q.id = qq.question_id " +
           "JOIN domains d ON q.domain_id = d.id " +
           "WHERE q.source NOT IN ('OUTDATED', 'MOCK') AND q.flag_type IS NULL " +
           "GROUP BY q.domain_id, qq.knowledge_point, d.name", nativeQuery = true)
    List<Object[]> countByKp();

    /**
     * 同域同考点的变式题 ID（举一反三）：质量分高的优先。
     * 标量查询返回 ID，实体由调用方 findAllById 获取（规避 Hibernate 6 原生实体映射问题）。
     */
    @Query(value = "SELECT qq.question_id FROM question_quality qq " +
           "JOIN questions q ON q.id = qq.question_id " +
           "WHERE qq.knowledge_point = (SELECT knowledge_point FROM question_quality WHERE question_id = :qid) " +
           "AND q.domain_id = (SELECT domain_id FROM questions WHERE id = :qid) " +
           "AND qq.question_id <> :qid AND q.source NOT IN ('OUTDATED', 'MOCK') AND q.flag_type IS NULL " +
           "ORDER BY qq.score DESC, RAND() LIMIT :count", nativeQuery = true)
    List<Long> findVariantQuestionIds(@Param("qid") Long qid, @Param("count") int count);

    /**
     * 弱势考点候选题池 ID：给定 "domainId|考点" 键列表。
     */
    @Query(value = "SELECT qq.question_id FROM question_quality qq " +
           "JOIN questions q ON q.id = qq.question_id " +
           "WHERE CONCAT(q.domain_id, '|', qq.knowledge_point) IN (:keys) " +
           "AND q.source NOT IN ('OUTDATED', 'MOCK') AND q.flag_type IS NULL", nativeQuery = true)
    List<Long> findIdsByKpKeys(@Param("keys") List<String> keys);
}
