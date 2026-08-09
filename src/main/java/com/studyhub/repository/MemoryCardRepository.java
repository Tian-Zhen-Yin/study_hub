package com.studyhub.repository;

import com.studyhub.entity.MemoryCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MemoryCardRepository extends JpaRepository<MemoryCard, Long> {
    Optional<MemoryCard> findByQuestionId(Long questionId);

    @Query("SELECT m FROM MemoryCard m WHERE m.nextReviewAt IS NOT NULL AND m.nextReviewAt <= :now ORDER BY m.nextReviewAt ASC")
    List<MemoryCard> findDueCards(LocalDateTime now);
}
