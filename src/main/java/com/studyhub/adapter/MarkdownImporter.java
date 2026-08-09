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
public class MarkdownImporter implements QuestionImporter {
    private final QuestionRepository questionRepository;
    private final DomainRepository domainRepository;
    private final ObjectMapper objectMapper;

    public MarkdownImporter(QuestionRepository questionRepository,
                            DomainRepository domainRepository,
                            ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.domainRepository = domainRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public ImportResultDTO importQuestions(String markdownDirPath) {
        try {
            Path tempJson = Path.of(System.getProperty("java.io.tmpdir"), "questions_import.json");
            String scriptPath = Path.of("scripts/parse_markdown_questions.py").toAbsolutePath().toString();

            ProcessBuilder pb = new ProcessBuilder(
                "python", scriptPath, markdownDirPath, tempJson.toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[MarkdownImporter] " + line);
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
                    skipped++;
                    continue;
                }

                Question entity = new Question();
                entity.setSource((String) q.get("source"));
                entity.setSubject((String) q.get("subject"));
                entity.setDomain(domain);
                entity.setStem((String) q.get("stem"));
                entity.setOptionsJson((String) q.get("optionsJson"));
                entity.setAnswer((String) q.get("answer"));
                entity.setAnalysis((String) q.get("analysis"));
                entity.setSourceFile((String) q.get("sourceFile"));
                entity.setImageUrl((String) q.get("imageUrl"));
                questionRepository.save(entity);
                imported++;
            }

            return new ImportResultDTO(questions.size(), imported, skipped, "GITHUB");
        } catch (Exception e) {
            throw new RuntimeException("Markdown import failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String getSourceType() {
        return "GITHUB";
    }
}
