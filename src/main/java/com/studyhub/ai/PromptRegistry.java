package com.studyhub.ai;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
public class PromptRegistry {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)}}");
    private final Map<String, String> templates = new HashMap<>();

    @PostConstruct
    public void load() {
        loadTemplate("tutor-system", "prompts/tutor-system.md");
        loadTemplate("tutor-explain", "prompts/tutor-explain.md");
        loadTemplate("diagnosis-report", "prompts/diagnosis-report.md");
        loadTemplate("plan-generation", "prompts/plan-generation.md");
        loadTemplate("material-generation", "prompts/material-generation.md");
        log.info("Loaded {} prompt templates: {}", templates.size(), templates.keySet());
    }

    private void loadTemplate(String name, String classpathLocation) {
        try {
            Resource resource = new PathMatchingResourcePatternResolver().getResource("classpath:" + classpathLocation);
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                templates.put(name, sb.toString());
            }
        } catch (Exception e) {
            log.error("Failed to load prompt template: {}", classpathLocation, e);
            templates.put(name, "");
        }
    }

    public String render(String name, Map<String, Object> vars) {
        String tpl = templates.get(name);
        if (tpl == null) {
            throw new IllegalStateException("Prompt template not found: " + name);
        }
        if (vars == null || vars.isEmpty()) return tpl;
        Matcher matcher = VAR_PATTERN.matcher(tpl);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            Object value = vars.getOrDefault(key, "");
            matcher.appendReplacement(result, Matcher.quoteReplacement(String.valueOf(value)));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    public boolean hasTemplate(String name) {
        return templates.containsKey(name) && !templates.get(name).isEmpty();
    }
}
