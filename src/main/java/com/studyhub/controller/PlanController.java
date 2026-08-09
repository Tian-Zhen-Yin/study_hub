package com.studyhub.controller;

import com.studyhub.dto.PlanResponse;
import com.studyhub.service.PlanService;
import com.studyhub.service.StudyMaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/plan")
@RequiredArgsConstructor
public class PlanController {

    private final PlanService planService;
    private final StudyMaterialService materialService;

    @PostMapping("/generate")
    public ResponseEntity<PlanResponse> generate() {
        return ResponseEntity.ok(planService.generate());
    }

    @GetMapping("/current")
    public ResponseEntity<PlanResponse> getCurrent() {
        return ResponseEntity.ok(planService.getCurrentPlan());
    }

    @PatchMapping("/task/{id}/toggle")
    public ResponseEntity<PlanResponse.TaskView> toggleTask(@PathVariable Long id) {
        return ResponseEntity.ok(planService.toggleTask(id));
    }

    @PostMapping("/material/{taskId}")
    public ResponseEntity<Map<String, Object>> generateMaterial(@PathVariable Long taskId) {
        return ResponseEntity.ok(materialService.generateMaterial(taskId));
    }

    @GetMapping("/material/{taskId}")
    public ResponseEntity<Map<String, Object>> getMaterial(@PathVariable Long taskId) {
        Map<String, Object> material = materialService.getMaterial(taskId);
        if (material == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(material);
    }
}
