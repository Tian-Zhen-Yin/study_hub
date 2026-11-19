package com.studyhub.controller;

import com.studyhub.service.SimulationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulations")
@RequiredArgsConstructor
public class SimulationController {

    private final SimulationService simulationService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listSimulations() {
        return ResponseEntity.ok(simulationService.getAllSimulations());
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSimulation() {
        return ResponseEntity.ok(simulationService.startSimulation());
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitSimulation(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(simulationService.submitSimulation(body));
    }

    /** 按科交卷：body = {section: "knowledge"|"case"|"essay", answers: [...]} */
    @PostMapping("/{id}/submit-section")
    public ResponseEntity<Map<String, Object>> submitSection(@PathVariable Long id,
                                                             @RequestBody Map<String, Object> body) {
        String section = (String) body.get("section");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> answers = (List<Map<String, Object>>) body.getOrDefault("answers", java.util.Collections.emptyList());
        return ResponseEntity.ok(simulationService.submitSection(id, section, answers));
    }
}
