package com.studyhub.controller;

import com.studyhub.dto.DomainDTO;
import com.studyhub.service.DomainService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/domains")
public class DomainController {
    private final DomainService domainService;

    public DomainController(DomainService domainService) {
        this.domainService = domainService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDomains() {
        List<DomainDTO> domains = domainService.getAllDomains();
        return ResponseEntity.ok(Map.of("code", 200, "data", domains, "message", "ok"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateDomain(
            @PathVariable Long id, @RequestBody DomainDTO dto) {
        DomainDTO updated = domainService.updateDomain(id, dto);
        return ResponseEntity.ok(Map.of("code", 200, "data", updated, "message", "ok"));
    }
}
