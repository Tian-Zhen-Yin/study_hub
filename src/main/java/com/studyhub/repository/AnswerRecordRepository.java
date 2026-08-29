package com.studyhub.repository;

import com.studyhub.entity.AnswerRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnswerRecordRepository extends JpaRepository<AnswerRecord, Long> {

    List<AnswerRecord> findByQuestionIdOrderByCreatedAtDesc(Long questionId);

    long countByIsCorrect(Boolean isCorrect);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT a.question.domain.id, COUNT(a), SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) " +
           "FROM AnswerRecord a WHERE a.question.source <> 'OUTDATED' AND a.question.source <> 'MOCK' " +
           "GROUP BY a.question.domain.id")
    List<Object[]> aggregateByDomain();

    @Query("SELECT a.question.domain.id, COUNT(DISTINCT a.question.id) " +
           "FROM AnswerRecord a WHERE a.question.source <> 'OUTDATED' AND a.question.source <> 'MOCK' " +
           "GROUP BY a.question.domain.id")
    List<Object[]> distinctQuestionsByDomain();

    @Query("SELECT a.question.domain.id, COUNT(a), SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) " +
           "FROM AnswerRecord a WHERE a.createdAt > :since " +
           "AND a.question.source <> 'OUTDATED' AND a.question.source <> 'MOCK' " +
           "GROUP BY a.question.domain.id")
    List<Object[]> aggregateByDomainSince(@Param("since") LocalDateTime since);

    /**
     * 按天统计答题数和正确数（用于学习趋势图），仅统计非 OUTDATED/MOCK 题目。
     * 返回字段：日期(java.time.LocalDate)、答题数、正确数
     */
    @Query("SELECT FUNCTION('DATE', a.createdAt), COUNT(a), SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) " +
           "FROM AnswerRecord a WHERE a.createdAt >= :since " +
           "AND a.question.source <> 'OUTDATED' AND a.question.source <> 'MOCK' " +
           "GROUP BY FUNCTION('DATE', a.createdAt) ORDER BY FUNCTION('DATE', a.createdAt)")
    List<Object[]> dailyStatsSince(@Param("since") LocalDateTime since);
}
