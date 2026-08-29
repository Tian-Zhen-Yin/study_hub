package com.studyhub.controller;

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
        String type = (String) body.getOrDefault("type", "MCQ");
        if (!java.util.Set.of("MCQ", "CASE", "ESSAY").contains(type)) type = "MCQ";
        q.setType(type);
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
        if (body.containsKey("imageUrl")) q.setImageUrl(body.get("imageUrl"));
        questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "message", "ok"));
    }

    /** 允许的标记类型：题干不全/缺图/选项不全/答案错误/解析缺失/其他 */
    private static final java.util.Set<String> FLAG_TYPES = java.util.Set.of(
        "INCOMPLETE_STEM", "MISSING_IMAGE", "BROKEN_OPTIONS", "WRONG_ANSWER", "MISSING_ANALYSIS", "OTHER");

    /** 给题目打问题标记，打标后该题不再进入抽题范围 */
    @PostMapping("/{id}/flag")
    public ResponseEntity<Map<String, Object>> flagQuestion(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Question q = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        String type = body.getOrDefault("type", "OTHER");
        if (!FLAG_TYPES.contains(type)) type = "OTHER";
        q.setFlagType(type);
        q.setFlagNote(body.getOrDefault("note", ""));
        q.setFlaggedAt(java.time.LocalDateTime.now());
        questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "message", "flagged"));
    }

    /** 取消标记，题目恢复进入抽题范围 */
    @DeleteMapping("/{id}/flag")
    public ResponseEntity<Map<String, Object>> unflagQuestion(@PathVariable Long id) {
        Question q = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        q.setFlagType(null);
        q.setFlagNote(null);
        q.setFlaggedAt(null);
        questionRepository.save(q);
        return ResponseEntity.ok(Map.of("code", 200, "message", "unflagged"));
    }

    /** 已标记题目列表，供管理/恢复 */
    @GetMapping("/flagged")
    public ResponseEntity<Map<String, Object>> flaggedQuestions() {
        List<Map<String, Object>> data = questionRepository.findByFlagTypeIsNotNull().stream()
            .map(q -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", q.getId());
                m.put("stem", q.getStem() != null && q.getStem().length() > 80
                    ? q.getStem().substring(0, 80) + "…" : q.getStem());
                m.put("domainName", q.getDomain() != null ? q.getDomain().getName() : null);
                m.put("flagType", q.getFlagType());
                m.put("flagNote", q.getFlagNote());
                m.put("flaggedAt", q.getFlaggedAt() != null ? q.getFlaggedAt().toString() : null);
                return m;
            })
            .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(Map.of("code", 200, "data", data, "message", "ok"));
    }

}
