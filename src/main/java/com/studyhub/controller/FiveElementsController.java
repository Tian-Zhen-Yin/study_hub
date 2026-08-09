package com.studyhub.controller;

import com.studyhub.entity.UserProfile;
import com.studyhub.service.FiveElementsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FiveElementsController {

    private final FiveElementsService fiveElementsService;

    @GetMapping("/profile/five-elements")
    public ResponseEntity<Map<String, Object>> getFiveElementsProfile() {
        UserProfile profile = fiveElementsService.getOrCreate();
        return ResponseEntity.ok(fiveElementsService.getProfileAsMap(profile));
    }

    @PostMapping("/profile/five-elements/decay")
    public ResponseEntity<Map<String, Object>> triggerDecay() {
        return ResponseEntity.ok(Map.of("message", "Decay triggered"));
    }
}
