package com.studyhub.repository;

import com.studyhub.entity.ErrorTag;
import com.studyhub.entity.ErrorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ErrorTagRepository extends JpaRepository<ErrorTag, Long> {

    Optional<ErrorTag> findByAnswerRecordId(Long answerRecordId);

    List<ErrorTag> findByQuestionId(Long questionId);

    @Query("SELECT e.errorType, COUNT(e) FROM ErrorTag e WHERE e.domainId = :domainId " +
           "AND e.createdAt > :since GROUP BY e.errorType")
    List<Object[]> countByDomainAndType(@Param("domainId") Long domainId,
                                        @Param("since") LocalDateTime since);

    @Query("SELECT e.domainId, e.errorType, COUNT(e) FROM ErrorTag e " +
           "WHERE e.createdAt > :since GROUP BY e.domainId, e.errorType")
    List<Object[]> aggregateErrorDistribution(@Param("since") LocalDateTime since);

    @Query("SELECT e.errorType FROM ErrorTag e WHERE e.domainId = :domainId " +
           "AND e.confidence >= :minConfidence ORDER BY e.createdAt DESC LIMIT :limit")
    List<ErrorType> findRecentTagsByDomain(@Param("domainId") Long domainId,
                                           @Param("minConfidence") double minConfidence,
                                           @Param("limit") int limit);

    long countByCreatedAtAfter(LocalDateTime since);
}
