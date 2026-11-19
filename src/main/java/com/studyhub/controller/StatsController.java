package com.studyhub.controller;

import com.studyhub.service.PriorityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final PriorityService priorityService;

    @GetMapping("/domain-frequency")
    public List<Map<String, Object>> getDomainFrequency() {
        return priorityService.getDomainFrequency();
    }

    @GetMapping("/priority")
    public List<Map<String, Object>> getPriorityList() {
        return priorityService.getPriorityList();
    }

    @GetMapping("/recommended-domain")
    public Map<String, Object> getRecommendedDomain() {
        Long domainId = priorityService.getRecommendedDomainId();
        return Map.of("domainId", domainId != null ? domainId : -1);
    }

    @GetMapping("/kp-mastery")
    public List<Map<String, Object>> getKpMastery() {
        return priorityService.getKpMastery();
    }
}
