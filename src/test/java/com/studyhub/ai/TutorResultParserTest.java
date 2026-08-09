package com.studyhub.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.dto.TutorResult;
import com.studyhub.entity.ErrorType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TutorResultParser 容错解析测试")
class TutorResultParserTest {

    private TutorResultParser parser;

    @BeforeEach
    void setUp() {
        parser = new TutorResultParser(new ObjectMapper());
    }

    @Test
    @DisplayName("标准JSON正常解析")
    void shouldParseStandardJson() {
        String raw = "{\"explanation\":\"概念错误\",\"errorType\":\"CONCEPT_MISS\",\"confidence\":0.9}";
        TutorResult result = parser.parse(raw);
        assertEquals("概念错误", result.explanation());
        assertEquals(ErrorType.CONCEPT_MISS, result.errorType());
        assertEquals(0.9, result.confidence(), 0.001);
    }

    @Test
    @DisplayName("带markdown代码块包裹时去壳后解析")
    void shouldStripCodeFence() {
        String raw = "```json\n{\"explanation\":\"审题出错\",\"errorType\":\"MISREAD\",\"confidence\":0.75}\n```";
        TutorResult result = parser.parse(raw);
        assertEquals("审题出错", result.explanation());
        assertEquals(ErrorType.MISREAD, result.errorType());
        assertEquals(0.75, result.confidence(), 0.001);
    }

    @Test
    @DisplayName("缺少confidence时默认0.0")
    void shouldDefaultConfidenceWhenMissing() {
        String raw = "{\"explanation\":\"记忆混淆\",\"errorType\":\"MEMORY_CONFUSE\"}";
        TutorResult result = parser.parse(raw);
        assertEquals("记忆混淆", result.explanation());
        assertEquals(ErrorType.MEMORY_CONFUSE, result.errorType());
        assertEquals(0.0, result.confidence(), 0.001);
    }

    @Test
    @DisplayName("缺少errorType时默认CONCEPT_MISS")
    void shouldDefaultErrorTypeWhenMissing() {
        String raw = "{\"explanation\":\"解析内容\",\"confidence\":0.5}";
        TutorResult result = parser.parse(raw);
        assertEquals("解析内容", result.explanation());
        assertEquals(ErrorType.CONCEPT_MISS, result.errorType());
    }

    @Test
    @DisplayName("errorType值非法时默认CONCEPT_MISS")
    void shouldDefaultErrorTypeWhenInvalid() {
        String raw = "{\"explanation\":\"测试\",\"errorType\":\"UNKNOWN_TYPE\",\"confidence\":0.6}";
        TutorResult result = parser.parse(raw);
        assertEquals(ErrorType.CONCEPT_MISS, result.errorType());
    }

    @Test
    @DisplayName("字段名不同时正则兜底提取explanation")
    void shouldRegexFallbackForExplanation() {
        String raw = "这是一段文本 {\"explain\":\"兜底解释\",\"errorType\":\"CALC_ERROR\"} 结束";
        TutorResult result = parser.parse(raw);
        assertNotNull(result.explanation());
        assertTrue(result.explanation().contains("兜底"));
    }

    @Test
    @DisplayName("完全非法文本且无explanation字段时抛出PARSE_FAILED")
    void shouldThrowWhenCompletelyInvalid() {
        String raw = "这是纯文本没有任何JSON";
        LlmUnavailableException ex = assertThrows(LlmUnavailableException.class,
            () -> parser.parse(raw));
        assertEquals("PARSE_FAILED", ex.getReasonCode());
    }

    @Test
    @DisplayName("空内容抛出PARSE_FAILED")
    void shouldThrowWhenEmpty() {
        assertThrows(LlmUnavailableException.class, () -> parser.parse(""));
        assertThrows(LlmUnavailableException.class, () -> parser.parse(null));
    }

    @Test
    @DisplayName("JSON含额外字段不影响解析")
    void shouldIgnoreExtraFields() {
        String raw = "{\"explanation\":\"解释\",\"errorType\":\"MISREAD\",\"confidence\":0.8,\"extra\":\"ignore\"}";
        TutorResult result = parser.parse(raw);
        assertEquals("解释", result.explanation());
        assertEquals(ErrorType.MISREAD, result.errorType());
    }
}
