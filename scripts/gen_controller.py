import os

code = r'''package com.studyhub.controller;

import com.studyhub.dto.ImportResultDTO;
import com.studyhub.dto.QuestionDTO;
import com.studyhub.service.QuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.studyhub.repository.QuestionRepository;
import com.studyhub.repository.DomainRepository;
import com.studyhub.entity.Question;
import com.studyhub.entity.Domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {
    private final QuestionService questionService;
    private final QuestionRepository questionRepository;
    private final DomainRepository domainRepository;

    public QuestionController(QuestionService questionService,
                              QuestionRepository questionRepository,
                              DomainRepository domainRepository) {
        this.questionRepository = questionRepository;
        this.questionService = questionService;
        this.domainRepository = domainRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getQuestions(
            @RequestParam(required = false) Long domainId,
            @RequestParam(required = false, defaultValue = "10") Integer count,
            @RequestParam(required = false) String source) {
        List<QuestionDTO> questions = questionService.getQuestions(domainId, count, source);
        return ResponseEntity.ok(Map.of(
            "code", 200, "data", questions, "message", "ok"
        ));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> countByDomain(@RequestParam Long domainId) {
        long count = questionService.countByDomain(domainId);
        return ResponseEntity.ok(Map.of(
            "code", 200, "data", Map.of("domainId", domainId, "count", count), "message", "ok"
        ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createQuestion(@RequestBody Map<String, Object> body) {
        Question q = new Question();
        q.setSource((String) body.getOrDefault("source", "MANUAL"));
        q.setSubject((String) body.getOrDefault("subject", "综合知识"));
        Long domainId = body.get("domainId") != null ? ((Number) body.get("domainId")).longValue() : null;
        if (domainId != null) {
            Domain domain = domainRepository.findById(domainId).orElse(null);
            q.setDomain(domain);
        }
        q.setStem((String) body.get("stem"));
        q.setOptionsJson((String) body.get("optionsJson"));
        q.setAnswer((String) body.get("answer"));
        q.setAnalysis((String) body.getOrDefault("analysis", ""));
        q = questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "data", Map.of("id", q.getId()), "message", "created"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("code", 200, "message", "deleted"));
    }

    @PostMapping("/import/markdown")
    public ResponseEntity<Map<String, Object>> importMarkdown(@RequestBody Map<String, String> body) {
        ImportResultDTO result = questionService.importMarkdown(body.get("path"));
        return ResponseEntity.ok(Map.of(
            "code", 200, "data", result, "message", "import complete"
        ));
    }

    @PostMapping("/import/pdf")
    public ResponseEntity<Map<String, Object>> importPdf(@RequestBody Map<String, String> body) {
        ImportResultDTO result = questionService.importPdf(body.get("path"));
        return ResponseEntity.ok(Map.of(
            "code", 200, "data", result, "message", "import complete"
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Question q = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        if (body.containsKey("optionsJson")) q.setOptionsJson(body.get("optionsJson"));
        if (body.containsKey("answer")) q.setAnswer(body.get("answer"));
        q.setAnalysis(body.getOrDefault("analysis", q.getAnalysis()));
        questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "message", "ok"));
    }

}
'''

path = r"E:\AiProject\study_hub\src\main\java\com\studyhub\controller\QuestionController.java"
with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("Controller rewritten OK")