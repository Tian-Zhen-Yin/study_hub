package com.studyhub.repository;

import com.studyhub.entity.AnswerRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnswerRecordRepository extends JpaRepository<AnswerRecord, Long> {

    List<AnswerRecord> findByQuestionIdOrderByCreatedAtDesc(Long questionId);

    long countByIsCorrect(Boolean isCorrect);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT a.question.domain.id, COUNT(a), SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) " +
           "FROM AnswerRecord a GROUP BY a.question.domain.id")
    List<Object[]> aggregateByDomain();

    @Query("SELECT a.question.domain.id, COUNT(a), SUM(CASE WHEN a.isCorrect = true THEN 1 ELSE 0 END) " +
           "FROM AnswerRecord a WHERE a.createdAt > :since GROUP BY a.question.domain.id")
    List<Object[]> aggregateByDomainSince(@Param("since") LocalDateTime since);
}
