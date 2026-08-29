package com.studyhub.repository;

import com.studyhub.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByDomainId(Long domainId);

    List<Question> findBySource(String source);

    List<Question> findByExamYear(String examYear);

    List<Question> findBySubject(String subject);

    @Query(value = "SELECT * FROM questions WHERE domain_id = :domainId AND source != 'OUTDATED' AND source != 'MOCK' AND flag_type IS NULL ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomByDomain(@Param("domainId") Long domainId, @Param("count") int count);

    @Query("SELECT COUNT(q) FROM Question q WHERE q.domain.id = :domainId AND q.source != 'OUTDATED' AND q.source != 'MOCK' AND q.flagType IS NULL")
    long countByDomainId(@Param("domainId") Long domainId);

    @Query(value = "SELECT * FROM questions WHERE source != 'OUTDATED' AND source != 'MOCK' AND flag_type IS NULL ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Question> findRandomAcrossAll(@Param("count") int count);

    @Query("SELECT COUNT(q) FROM Question q WHERE q.source != 'OUTDATED' AND q.source != 'MOCK' AND q.flagType IS NULL")
    long countAllActive();

    List<Question> findByFlagTypeIsNotNull();
}
