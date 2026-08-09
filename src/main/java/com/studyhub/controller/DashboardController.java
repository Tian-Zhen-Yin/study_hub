package com.studyhub.controller;

import com.studyhub.dto.DashboardDTO;
import com.studyhub.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboard() {
        DashboardDTO data = dashboardService.getDashboard();
        return Map.of("code", 200, "data", data, "message", "ok");
    }
}