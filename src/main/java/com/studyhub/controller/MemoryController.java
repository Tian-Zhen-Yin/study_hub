package com.studyhub.controller;

import com.studyhub.service.MemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @GetMapping("/cards")
    public ResponseEntity<?> getCards() {
        return ResponseEntity.ok(memoryService.getAllCards());
    }

    @GetMapping("/due")
    public ResponseEntity<?> getDue(@RequestParam(defaultValue = "20") int count) {
        return ResponseEntity.ok(memoryService.getDueCards(count));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(memoryService.getStats());
    }

    @PostMapping("/cards")
    public ResponseEntity<?> createCard(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(memoryService.createCard(body.get("question"), body.get("answer")));
    }

    @PostMapping("/cards/{id}/review")
    public ResponseEntity<?> reviewCard(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        int quality = ((Number) body.get("quality")).intValue();
        return ResponseEntity.ok(memoryService.reviewCard(id, quality));
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<?> deleteCard(@PathVariable Long id) {
        memoryService.deleteCard(id);
        return ResponseEntity.ok(Map.of("code", 200, "message", "deleted"));
    }
}