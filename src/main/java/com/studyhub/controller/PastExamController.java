package com.studyhub.controller;

import com.studyhub.entity.ExamPaper;
import com.studyhub.entity.KpNode;
import com.studyhub.entity.Question;
import com.studyhub.repository.ExamPaperRepository;
import com.studyhub.repository.KpNodeRepository;
import com.studyhub.repository.QuestionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** 历年真题：按试卷浏览（按试卷浏览与展开作答） */
@RestController
@RequestMapping("/api/past-exam")
public class PastExamController {

    private final ExamPaperRepository paperRepo;
    private final QuestionRepository questionRepo;
    private final KpNodeRepository kpRepo;

    public PastExamController(ExamPaperRepository paperRepo, QuestionRepository questionRepo,
                              KpNodeRepository kpRepo) {
        this.paperRepo = paperRepo;
        this.questionRepo = questionRepo;
        this.kpRepo = kpRepo;
    }

    /** 试卷列表，附各题型数量 */
    @GetMapping("/papers")
    public ResponseEntity<Map<String, Object>> papers() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (ExamPaper p : paperRepo.findAllByOrderByExamDateDesc()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("name", p.getName());
            row.put("subject", p.getSubject());
            row.put("examDate", p.getExamDate());
            int mcq = 0, cs = 0, es = 0;
            for (Question q : questionRepo.findByPaperIdOrderByExamSortAsc(p.getId())) {
                switch (q.getType() == null ? "" : q.getType()) {
                    case "CASE" -> cs++;
                    case "ESSAY" -> es++;
                    default -> mcq++;
                }
            }
            row.put("mcqCount", mcq);
            row.put("caseCount", cs);
            row.put("essayCount", es);
            out.add(row);
        }
        return ResponseEntity.ok(Map.of("papers", out));
    }

    /** 单份试卷的题目列表（题干全文，供展开作答） */
    @GetMapping("/papers/{id}/questions")
    public ResponseEntity<Map<String, Object>> paperQuestions(@PathVariable Long id) {
        ExamPaper paper = paperRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("试卷不存在: id=" + id));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Question q : questionRepo.findByPaperIdOrderByExamSortAsc(id)) {
            items.add(brief(q));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("paper", Map.of(
                "id", paper.getId(), "name", paper.getName(),
                "subject", paper.getSubject(), "examDate", paper.getExamDate() == null ? "" : paper.getExamDate()));
        out.put("questions", items);
        return ResponseEntity.ok(out);
    }

    /** 题目详情：题干 + 小问/选项 + 参考答案 + 解析 + 考点 */
    @GetMapping("/questions/{id}")
    public ResponseEntity<Map<String, Object>> questionDetail(@PathVariable Long id) {
        Question q = questionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("题目不存在: id=" + id));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", q.getId());
        out.put("type", q.getType());
        out.put("subject", q.getSubject());
        out.put("stem", q.getStem());
        out.put("imageUrl", q.getImageUrl());
        out.put("optionsJson", q.getOptionsJson());
        out.put("answer", q.getAnswer());
        out.put("analysis", q.getAnalysis());
        out.put("examYear", q.getExamYear());
        out.put("examSort", q.getExamSort());
        if (q.getPaperId() != null) {
            paperRepo.findById(q.getPaperId()).ifPresent(p -> out.put("paperName", p.getName()));
        }
        if (q.getKpNodeId() != null) {
            kpRepo.findById(q.getKpNodeId()).ifPresent(k -> out.put("kp", Map.of("id", k.getId(), "name", k.getName())));
        }
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> brief(Question q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("examSort", q.getExamSort());
        m.put("type", q.getType());
        m.put("subject", q.getSubject());
        m.put("stem", q.getStem());
        m.put("hasSubQuestions", q.getOptionsJson() != null && q.getOptionsJson().contains("question"));
        if (q.getKpNodeId() != null) {
            Optional<KpNode> k = kpRepo.findById(q.getKpNodeId());
            k.ifPresent(kn -> m.put("kpName", kn.getName()));
        }
        return m;
    }
}
