package com.studyhub.controller;

import com.studyhub.entity.KpEdge;
import com.studyhub.entity.KpNode;
import com.studyhub.entity.Question;
import com.studyhub.repository.ExamPaperRepository;
import com.studyhub.repository.KpEdgeRepository;
import com.studyhub.repository.KpNodeRepository;
import com.studyhub.repository.QuestionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** 知识图谱：考点树 + 关联边 + 考点详情 */
@RestController
@RequestMapping("/api/kp")
public class KpController {

    private final KpNodeRepository kpRepo;
    private final KpEdgeRepository edgeRepo;
    private final QuestionRepository questionRepo;
    private final ExamPaperRepository paperRepo;

    public KpController(KpNodeRepository kpRepo, KpEdgeRepository edgeRepo, QuestionRepository questionRepo,
                        ExamPaperRepository paperRepo) {
        this.kpRepo = kpRepo;
        this.edgeRepo = edgeRepo;
        this.questionRepo = questionRepo;
        this.paperRepo = paperRepo;
    }

    /** 全量节点（父层级 + 叶子考点），含各考试科目题数（架构师/系统分析师） */
    @GetMapping("/tree")
    public ResponseEntity<Map<String, Object>> tree() {
        // 考点×科目题数: id -> [架构师, 分析师]
        Map<Long, long[]> subjCount = new HashMap<>();
        for (Object[] row : questionRepo.countByKpAndSubject()) {
            Long kpId = ((Number) row[0]).longValue();
            String subj = (String) row[1];
            long c = ((Number) row[2]).longValue();
            long[] arr = subjCount.computeIfAbsent(kpId, k -> new long[2]);
            if (subj != null && subj.contains("分析师")) arr[1] += c;
            else arr[0] += c;
        }
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (KpNode k : kpRepo.findAll()) {
            Map<String, Object> m = brief(k);
            long[] arr = subjCount.getOrDefault(k.getId(), new long[2]);
            m.put("archCount", arr[0]);
            m.put("analystCount", arr[1]);
            nodes.add(m);
        }
        return ResponseEntity.ok(Map.of("nodes", nodes));
    }

    /** 考点关联边：kind=co 同卷共现 / semantic 语义关联 */
    @GetMapping("/edges")
    public ResponseEntity<Map<String, Object>> edges() {
        List<Map<String, Object>> edges = new ArrayList<>();
        for (KpEdge e : edgeRepo.findAll()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("src", e.getSrcId());
            m.put("dst", e.getDstId());
            m.put("kind", e.getKind());
            m.put("weight", e.getWeight());
            if (e.getNote() != null && !e.getNote().isEmpty()) m.put("note", e.getNote());
            edges.add(m);
        }
        return ResponseEntity.ok(Map.of("edges", edges));
    }

    /** 考点详情：精讲 + 出题年份分布 + 子考点 + 关联题目（含试卷名） */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        KpNode k = kpRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("考点不存在: id=" + id));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", k.getId());
        out.put("name", k.getName());
        out.put("parentId", k.getParentId());
        out.put("freq", k.getFreq());
        out.put("questionCount", k.getQuestionCount());
        out.put("essence", k.getEssence());

        // 子考点（父节点专属）
        List<Map<String, Object>> children = new ArrayList<>();
        for (KpNode c : kpRepo.findByParentId(id)) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("id", c.getId());
            cm.put("name", c.getName());
            cm.put("questionCount", c.getQuestionCount());
            cm.put("freq", c.getFreq());
            children.add(cm);
        }
        children.sort(Comparator.comparingInt((Map<String, Object> m) -> (Integer) m.get("questionCount")).reversed());
        out.put("children", children);

        // 关联题目 + 出题年份（按考试场次去重）
        List<Map<String, Object>> questions = new ArrayList<>();
        TreeSet<String> years = new TreeSet<>(Comparator.reverseOrder());
        for (Question q : questionRepo.findByKpNodeIdOrderByExamYearDesc(id)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", q.getId());
            m.put("type", q.getType());
            m.put("subject", q.getSubject());
            m.put("examYear", q.getExamYear());
            m.put("stem", q.getStem());
            if (q.getPaperId() != null) {
                paperRepo.findById(q.getPaperId()).ifPresent(p -> {
                    m.put("paperName", p.getName());
                    if (p.getExamDate() != null) years.add(p.getExamDate());
                });
            }
            questions.add(m);
        }
        out.put("years", new ArrayList<>(years));
        out.put("questions", questions);

        // 语义关联考点（易混淆/常对比，来自 LLM 语义边）
        List<Map<String, Object>> related = new ArrayList<>();
        for (KpEdge e : edgeRepo.findSemanticNeighbors(id)) {
            Long other = e.getSrcId().equals(id) ? e.getDstId() : e.getSrcId();
            kpRepo.findById(other).ifPresent(o -> {
                Map<String, Object> rm = new LinkedHashMap<>();
                rm.put("id", o.getId());
                rm.put("name", o.getName());
                rm.put("weight", e.getWeight());
                if (e.getNote() != null && !e.getNote().isEmpty()) rm.put("note", e.getNote());
                related.add(rm);
            });
        }
        related.sort(Comparator.comparingInt((Map<String, Object> m) -> (Integer) m.get("weight")).reversed());
        out.put("related", related);
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> brief(KpNode k) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", k.getId());
        m.put("name", k.getName());
        m.put("parentId", k.getParentId());
        m.put("isParent", k.getIsParent());
        m.put("freq", k.getFreq());
        m.put("questionCount", k.getQuestionCount());
        m.put("hasEssence", k.getEssence() != null && !k.getEssence().isEmpty());
        return m;
    }
}
