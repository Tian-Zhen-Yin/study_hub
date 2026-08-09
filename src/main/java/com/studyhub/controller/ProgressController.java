package com.studyhub.controller;

import com.studyhub.dto.ProgressSummary;
import com.studyhub.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> exportProgress() {
        return ResponseEntity.ok(progressService.exportProgress());
    }

    @PostMapping("/import/preview")
    public ResponseEntity<ProgressSummary> previewImport(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(progressService.previewImport(payload));
    }

    @PostMapping("/import/apply")
    public ResponseEntity<Map<String, String>> applyImport(@RequestBody Map<String, Object> payload) {
        progressService.applyImport(payload);
        return ResponseEntity.ok(Map.of("success", "true"));
    }

    @GetMapping("/diagnosis")
    public ResponseEntity<Map<String, Object>> getDiagnosis() {
        return ResponseEntity.ok(progressService.generateDiagnosis());
    }
}
