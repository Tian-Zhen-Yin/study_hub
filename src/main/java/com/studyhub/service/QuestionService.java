package com.studyhub.service;

import com.studyhub.adapter.MarkdownImporter;
import com.studyhub.adapter.PdfImporter;
import com.studyhub.dto.ImportResultDTO;
import com.studyhub.dto.QuestionDTO;
import com.studyhub.entity.Question;
import com.studyhub.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class QuestionService {
    private final QuestionRepository questionRepository;
    private final MarkdownImporter markdownImporter;
    private final PdfImporter pdfImporter;

    public QuestionService(QuestionRepository questionRepository,
                           MarkdownImporter markdownImporter,
                           PdfImporter pdfImporter) {
        this.questionRepository = questionRepository;
        this.markdownImporter = markdownImporter;
        this.pdfImporter = pdfImporter;
    }

    public List<QuestionDTO> getQuestions(Long domainId, Integer count, String source) {
        List<Question> questions;
        if (domainId != null && count != null) {
            questions = questionRepository.findRandomByDomain(domainId, count);
        } else if (domainId != null) {
            questions = questionRepository.findByDomainId(domainId).stream()
                .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource()))
                .collect(Collectors.toList());
        } else if (source != null) {
            questions = questionRepository.findBySource(source);
        } else {
            questions = questionRepository.findAll().stream()
                .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource()))
                .collect(Collectors.toList());
        }
        return questions.stream().map(this::toDTOPublic).collect(Collectors.toList());
    }

    public ImportResultDTO importMarkdown(String dirPath) {
        return markdownImporter.importQuestions(dirPath);
    }

    public ImportResultDTO importPdf(String dirPath) {
        return pdfImporter.importQuestions(dirPath);
    }

    public long countByDomain(Long domainId) {
        return questionRepository.countByDomainId(domainId);
    }

    public List<Map<String, Object>> getModuleStats() {
        List<Question> all = questionRepository.findAll().stream()
            .filter(q -> !"OUTDATED".equals(q.getSource()) && !"MOCK".equals(q.getSource()))
            .collect(Collectors.toList());
        Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
        for (Question q : all) {
            String module = q.getDomain() != null ? q.getDomain().getName() : "other";
            Long moduleId = q.getDomain() != null ? q.getDomain().getId() : 0L;
            if (!groups.containsKey(module)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", moduleId);
                m.put("name", module);
                m.put("count", 0);
                groups.put(module, m);
            }
            Map<String, Object> m = groups.get(module);
            m.put("count", (int) m.get("count") + 1);
        }
        return new ArrayList<>(groups.values());
    }

    public QuestionDTO toDTOPublic(Question q) {
        QuestionDTO dto = new QuestionDTO();
        dto.setId(q.getId());
        dto.setSource(q.getSource());
        dto.setSubject(q.getSubject());
        dto.setDomainId(q.getDomain() != null ? q.getDomain().getId() : null);
        dto.setDomainName(q.getDomain() != null ? q.getDomain().getName() : null);
        dto.setStem(q.getStem());
        dto.setOptionsJson(q.getOptionsJson());
        dto.setAnswer(q.getAnswer());
        dto.setAnalysis(q.getAnalysis());
        dto.setExamYear(q.getExamYear());
        dto.setSourceFile(q.getSourceFile());
        dto.setImageUrl(q.getImageUrl());
        return dto;
    }
}
