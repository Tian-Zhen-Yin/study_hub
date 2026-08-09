package com.studyhub.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.dto.TutorResult;
import com.studyhub.entity.ErrorType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class TutorResultParser {

    private final ObjectMapper objectMapper;

    private static final Pattern CODE_FENCE = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);
    private static final Pattern EXPLANATION_REGEX = Pattern.compile("\"expla(?:nation|in)\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern ERROR_TYPE_REGEX = Pattern.compile("\"error(?:_?[Tt]ype|Type)\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern CONFIDENCE_REGEX = Pattern.compile("\"confidence\"\\s*:\\s*([0-9.]+)");

    public TutorResult parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new LlmUnavailableException("PARSE_FAILED", "LLM 返回空内容");
        }

        String json = stripCodeFence(raw).trim();

        try {
            JsonNode root = objectMapper.readTree(json);
            String explanation = extractText(root, "explanation", "explain");
            ErrorType errorType = ErrorType.fromString(extractText(root, "errorType", "error_type"));
            double confidence = extractDouble(root, "confidence", 0.0);
            return TutorResult.partial(explanation, errorType, confidence);
        } catch (Exception e) {
            log.warn("标准 JSON 解析失败,尝试正则兜底: {}", e.getMessage());
            return regexFallback(json);
        }
    }

    private TutorResult regexFallback(String json) {
        String explanation = extractByRegex(json, EXPLANATION_REGEX);
        if (explanation == null) {
            log.warn("正则兜底仍无法提取 explanation, 抛出解析异常");
            throw new LlmUnavailableException("PARSE_FAILED", "无法解析 LLM 响应为有效 JSON");
        }
        explanation = unescapeJson(explanation);
        String errorTypeStr = extractByRegex(json, ERROR_TYPE_REGEX);
        ErrorType errorType = ErrorType.fromString(errorTypeStr);
        String confidenceStr = extractByRegex(json, CONFIDENCE_REGEX);
        double confidence = confidenceStr != null ? Double.parseDouble(confidenceStr) : 0.0;
        return TutorResult.partial(explanation, errorType, confidence);
    }

    private String stripCodeFence(String raw) {
        Matcher matcher = CODE_FENCE.matcher(raw);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return raw;
    }

    private String extractText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode child = node.get(field);
            if (child != null && !child.isNull()) {
                return child.asText();
            }
        }
        return null;
    }

    private double extractDouble(JsonNode node, String field, double defaultValue) {
        JsonNode child = node.get(field);
        if (child == null || child.isNull()) return defaultValue;
        if (child.isNumber()) return child.asDouble();
        try {
            return Double.parseDouble(child.asText());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private String extractByRegex(String input, Pattern pattern) {
        Matcher matcher = pattern.matcher(input);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String unescapeJson(String text) {
        return text.replace("\\\"", "\"")
            .replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\\\", "\\");
    }
}
