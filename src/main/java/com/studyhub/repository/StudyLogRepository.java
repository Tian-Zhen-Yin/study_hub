package com.studyhub.repository;

import com.studyhub.entity.StudyLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {
    List<StudyLog> findByStudyDateBetween(LocalDate start, LocalDate end);
    List<StudyLog> findByStudyDateOrderByStudyDateDesc(LocalDate date);
}