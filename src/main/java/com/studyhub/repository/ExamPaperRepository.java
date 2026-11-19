package com.studyhub.repository;

import com.studyhub.entity.ExamPaper;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamPaperRepository extends JpaRepository<ExamPaper, Long> {
    Optional<ExamPaper> findByName(String name);

    List<ExamPaper> findBySubjectOrderByExamDateDesc(String subject);

    List<ExamPaper> findAllByOrderByExamDateDesc();
}
