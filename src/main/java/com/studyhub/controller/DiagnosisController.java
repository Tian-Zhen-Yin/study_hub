package com.studyhub.controller;

import com.studyhub.dto.DiagnosisReport;
import com.studyhub.service.DiagnosisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/diagnosis")
@RequiredArgsConstructor
public class DiagnosisController {

    private final DiagnosisService diagnosisService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate() {
        if (!diagnosisService.hasEnoughData()) {
            return ResponseEntity.ok(Map.of(
                "degraded", true,
                "message", "数据量不足，再答一些题后可生成深度诊断"
            ));
        }
        DiagnosisReport report = diagnosisService.generate();
        if (report == null) {
            return ResponseEntity.ok(Map.of(
                "degraded", true,
                "message", "数据量不足，无法生成诊断报告"
            ));
        }
        return ResponseEntity.ok(report);
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest() {
        Optional<DiagnosisReport> latest = diagnosisService.getLatest();
        if (latest.isPresent()) {
            return ResponseEntity.ok(latest.get());
        }
        return ResponseEntity.ok(Map.of(
            "degraded", true,
            "message", "尚未生成过诊断报告"
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<List<DiagnosisReport>> getHistory() {
        return ResponseEntity.ok(diagnosisService.getHistory());
    }
}
