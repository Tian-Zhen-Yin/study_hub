package com.studyhub.repository;

import com.studyhub.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Optional<Bookmark> findByQuestionId(Long questionId);

    @Transactional
    void deleteByQuestionId(Long questionId);
}
