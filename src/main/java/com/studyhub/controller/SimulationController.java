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
}
