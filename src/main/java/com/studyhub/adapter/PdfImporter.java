package com.studyhub.adapter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.dto.ImportResultDTO;
import com.studyhub.entity.Domain;
import com.studyhub.entity.Question;
import com.studyhub.repository.DomainRepository;
import com.studyhub.repository.QuestionRepository;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Component
public class PdfImporter implements QuestionImporter {
    private final QuestionRepository questionRepository;
    private final DomainRepository domainRepository;
    private final ObjectMapper objectMapper;

    public PdfImporter(QuestionRepository questionRepository,
                       DomainRepository domainRepository,
                       ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.domainRepository = domainRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public ImportResultDTO importQuestions(String pdfDirPath) {
        try {
            Path tempJson = Path.of(System.getProperty("java.io.tmpdir"), "pdf_questions_import.json");
            String scriptPath = Path.of("scripts/parse_pdf_questions.py").toAbsolutePath().toString();

            ProcessBuilder pb = new ProcessBuilder(
                "python", scriptPath, pdfDirPath, tempJson.toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[PdfImporter] " + line);
            }
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("Python script failed with exit code: " + exitCode);
            }

            List<Map<String, Object>> questions = objectMapper.readValue(
                tempJson.toFile(), new TypeReference<List<Map<String, Object>>>() {}
            );

            int imported = 0;
            int skipped = 0;
            for (Map<String, Object> q : questions) {
                String domainName = (String) q.get("domainName");
                Domain domain = domainRepository.findByName(domainName).orElse(null);
                if (domain == null) {
                    domain = domainRepository.findByName("架构设计").orElse(null);
                }
                if (domain == null) {
                    skipped++;
                    continue;
                }

                Question entity = new Question();
                entity.setSource("PDF");
                entity.setSubject((String) q.get("subject"));
                entity.setDomain(domain);
                entity.setStem((String) q.get("stem"));
                entity.setOptionsJson((String) q.get("optionsJson"));
                entity.setAnswer((String) q.get("answer"));
                entity.setAnalysis((String) q.get("analysis"));
                entity.setExamYear((String) q.get("examYear"));
                entity.setSourceFile((String) q.get("sourceFile"));
                entity.setImageUrl((String) q.get("imageUrl"));
                questionRepository.save(entity);
                imported++;
            }

            return new ImportResultDTO(questions.size(), imported, skipped, "PDF");
        } catch (Exception e) {
            throw new RuntimeException("PDF import failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getSourceType() {
        return "PDF";
    }
}
