package com.studyhub.service;

import com.studyhub.dto.DashboardDTO;
import com.studyhub.entity.Domain;
import com.studyhub.entity.Simulation;
import com.studyhub.entity.StudyLog;
import com.studyhub.entity.WeeklyTask;
import com.studyhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DomainRepository domainRepository;
    private final StudyLogRepository studyLogRepository;
    private final SimulationRepository simulationRepository;
    private final WeeklyTaskRepository weeklyTaskRepository;

    @Value("${app.week-start-date:}")
    private String weekStartDate;

    @Transactional(readOnly = true)
    public DashboardDTO getDashboard() {
        return DashboardDTO.builder()
                .stats(buildStats())
                .todayTasks(buildTodayTasks())
                .radarData(buildRadarData())
                .recentSimulations(buildRecentSimulations())
                .streak(calcStreak())
                .converged(checkConvergence())
                .build();
    }

    private DashboardDTO.Stats buildStats() {
        List<StudyLog> allLogs = studyLogRepository.findAll();
        double totalHours = allLogs.stream().mapToDouble(sl -> sl.getHours().doubleValue()).sum();

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        double weeklyHours = studyLogRepository.findByStudyDateBetween(weekStart, today)
                .stream().mapToDouble(sl -> sl.getHours().doubleValue()).sum();

        long totalTasks = weeklyTaskRepository.count();
        long doneTasks = weeklyTaskRepository.findAll().stream().filter(WeeklyTask::getDone).count();
        double taskRate = totalTasks > 0 ? Math.round(doneTasks * 1000.0 / totalTasks) / 10.0 : 0;

        return DashboardDTO.Stats.builder()
                .totalHours(Math.round(totalHours * 10.0) / 10.0)
                .weeklyHours(Math.round(weeklyHours * 10.0) / 10.0)
                .taskCompletionRate(taskRate)
                .streak(calcStreak())
                .build();
    }

    private List<DashboardDTO.TodayTask> buildTodayTasks() {
        int weekIdx = getCurrentWeekIdx();
        List<WeeklyTask> tasks = weeklyTaskRepository.findByWeekNum(weekIdx);

        String todayDay = new String[]{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}[
                LocalDate.now().getDayOfWeek().getValue() % 7];

        List<WeeklyTask> relevant = tasks.stream()
                .filter(t -> t.getDay() == null || t.getDay().equals(todayDay))
                .collect(Collectors.toList());

        if (relevant.isEmpty() && !tasks.isEmpty()) {
            relevant = tasks.subList(0, Math.min(3, tasks.size()));
        }

        return relevant.stream()
                .map(t -> DashboardDTO.TodayTask.builder()
                        .id(t.getId())
                        .text(t.getText())
                        .done(t.getDone())
                        .weekNum(t.getWeekNum())
                        .build())
                .collect(Collectors.toList());
    }

    private List<DashboardDTO.RadarItem> buildRadarData() {
        return domainRepository.findAll().stream()
                .map(d -> DashboardDTO.RadarItem.builder()
                        .id(d.getId())
                        .name(d.getName())
                        .pct(d.getPct())
                        .state(d.getState())
                        .priority(d.getPriority())
                        .build())
                .collect(Collectors.toList());
    }

    private List<DashboardDTO.RecentSimulation> buildRecentSimulations() {
        return simulationRepository.findTop3ByOrderBySimDateDesc().stream()
                .map(s -> DashboardDTO.RecentSimulation.builder()
                        .id(s.getId())
                        .simDate(s.getSimDate().toString())
                        .knowledgeScore(s.getKnowledgeScore())
                        .caseScore(s.getCaseScore())
                        .essayScore(s.getEssayScore())
                        .convergence(s.getConvergence())
                        .build())
                .collect(Collectors.toList());
    }

    private int calcStreak() {
        List<StudyLog> logs = studyLogRepository.findAll();
        Set<LocalDate> dates = logs.stream()
                .map(StudyLog::getStudyDate)
                .collect(Collectors.toCollection(TreeSet::new));

        List<LocalDate> sorted = new ArrayList<>(dates);
        sorted.sort(Comparator.reverseOrder());

        int streak = 0;
        LocalDate today = LocalDate.now();
        for (int i = 0; i < sorted.size(); i++) {
            LocalDate expected = today.minusDays(i);
            if (sorted.get(i).equals(expected)) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    private boolean checkConvergence() {
        List<Simulation> recent = simulationRepository.findTop3ByOrderBySimDateDesc();
        if (recent.size() < 3) return false;
        return recent.stream().allMatch(s ->
                s.getKnowledgeScore() >= 50 &&
                s.getCaseScore() >= 50 &&
                s.getEssayScore() >= 50);
    }

    private int getCurrentWeekIdx() {
        // 基于配置的 week-start-date 计算当前周序号；未配置时默认第 1 周
        if (weekStartDate == null || weekStartDate.isBlank()) {
            return 1;
        }
        try {
            LocalDate planStart = LocalDate.parse(weekStartDate.trim());
            long days = ChronoUnit.DAYS.between(planStart, LocalDate.now());
            int week = (int) (days / 7) + 1;
            return Math.max(1, Math.min(13, week));
        } catch (Exception e) {
            return 1;
        }
    }
}