package com.studyhub.controller;

import com.studyhub.dto.TerritoryDTO;
import com.studyhub.service.TerritoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TerritoryController {

    private final TerritoryService territoryService;

    @GetMapping("/territories")
    public ResponseEntity<List<TerritoryDTO>> getMap() {
        return ResponseEntity.ok(territoryService.getMap());
    }
}
