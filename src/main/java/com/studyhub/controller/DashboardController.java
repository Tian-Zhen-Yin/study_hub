package com.studyhub.controller;

import com.studyhub.dto.DashboardDTO;
import com.studyhub.repository.AnswerRecordRepository;
import com.studyhub.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final AnswerRecordRepository answerRecordRepo;

    @Value("${app.exam-date:}")
    private String examDate;

    @Value("${app.week-start-date:}")
    private String weekStartDate;

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("examDate", examDate == null ? "" : examDate.trim());
        cfg.put("weekStartDate", weekStartDate == null ? "" : weekStartDate.trim());
        return Map.of("code", 200, "data", cfg, "message", "ok");
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboard() {
        DashboardDTO data = dashboardService.getDashboard();
        return Map.of("code", 200, "data", data, "message", "ok");
    }

    /**
     * 返回最近 days 天（默认 7）的每日答题数和正确数，用于"学习趋势"图。
     * 缺失日期补 0，保证前端图表横轴连续。
     */
    @GetMapping("/dashboard/trend")
    public Map<String, Object> getTrend() {
        int days = 7;
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(days - 1L);

        // 从 DB 聚合：日期 -> {answered, correct}（兼容 MySQL java.sql.Date 与 H2 LocalDate）
        Map<LocalDate, long[]> raw = new HashMap<>();
        for (Object[] row : answerRecordRepo.dailyStatsSince(start.atStartOfDay())) {
            LocalDate d = toLocalDate(row[0]);
            if (d == null) continue;
            long answered = ((Number) row[1]).longValue();
            long correct = ((Number) row[2]).longValue();
            raw.put(d, new long[]{answered, correct});
        }

        List<Map<String, Object>> series = new ArrayList<>();
        long totalAnswered = 0, totalCorrect = 0;
        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);
            long[] v = raw.getOrDefault(d, new long[]{0, 0});
            long answered = v[0];
            long correct = v[1];
            totalAnswered += answered;
            totalCorrect += correct;
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", d.toString());
            point.put("weekday", new String[]{"周日","周一","周二","周三","周四","周五","周六"}[d.getDayOfWeek().getValue() % 7]);
            point.put("answered", answered);
            point.put("correct", correct);
            point.put("accuracy", answered > 0 ? Math.round(correct * 1000.0 / answered) / 10.0 : 0.0);
            series.add(point);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("days", days);
        data.put("totalAnswered", totalAnswered);
        data.put("totalCorrect", totalCorrect);
        data.put("overallAccuracy", totalAnswered > 0 ? Math.round(totalCorrect * 1000.0 / totalAnswered) / 10.0 : 0.0);
        data.put("series", series);

        return Map.of("code", 200, "data", data, "message", "ok");
    }

    private LocalDate toLocalDate(Object val) {
        if (val == null) return null;
        if (val instanceof LocalDate ld) return ld;
        if (val instanceof java.sql.Date sd) return sd.toLocalDate();
        if (val instanceof java.sql.Timestamp ts) return ts.toLocalDateTime().toLocalDate();
        return LocalDate.parse(val.toString().substring(0, 10));
    }
}