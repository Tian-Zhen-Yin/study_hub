package com.studyhub.repository;

import com.studyhub.entity.WeeklyTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WeeklyTaskRepository extends JpaRepository<WeeklyTask, Long> {
    List<WeeklyTask> findByWeekNum(Integer weekNum);

    List<WeeklyTask> findByWeekNumAndSource(Integer weekNum, String source);

    @Modifying
    @Query("DELETE FROM WeeklyTask w WHERE w.weekNum = :weekNum AND w.source = 'AI'")
    void deleteAiTasksByWeekNum(Integer weekNum);
}
