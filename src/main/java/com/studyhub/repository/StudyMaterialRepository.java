package com.studyhub.repository;

import com.studyhub.entity.StudyMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudyMaterialRepository extends JpaRepository<StudyMaterial, Long> {
    Optional<StudyMaterial> findByWeeklyTaskId(Long weeklyTaskId);
}
