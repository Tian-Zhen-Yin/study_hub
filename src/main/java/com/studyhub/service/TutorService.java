package com.studyhub.service;

import com.studyhub.ai.LlmClient;
import com.studyhub.ai.LlmRequest;
import com.studyhub.ai.LlmResponse;
import com.studyhub.ai.LlmUnavailableException;
import com.studyhub.ai.PromptRegistry;
import com.studyhub.ai.TutorResultParser;
import com.studyhub.dto.TutorResponse;
import com.studyhub.dto.TutorResult;
import com.studyhub.entity.AnswerRecord;
import com.studyhub.entity.ErrorTag;
import com.studyhub.entity.ErrorType;
import com.studyhub.repository.ErrorTagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TutorService {

    private final LlmClient llm;
    private final PromptRegistry prompts;
    private final TutorResultParser parser;
    private final ErrorTagRepository tagRepo;

    private static final double MIN_CONFIDENCE_FOR_HISTORY = 0.6;
    private static final int HISTORY_TAG_LIMIT = 10;
    private static final int MAX_STEM_LENGTH = 2000;

    @Transactional
    public TutorResponse explain(AnswerRecord record) {
        Optional<ErrorTag> existing = tagRepo.findByAnswerRecordId(record.getId());
        if (existing.isPresent()) {
            ErrorTag tag = existing.get();
            log.info("ErrorTag 历史命中 recordId={}, 不调 LLM", record.getId());
            return TutorResponse.fromCache(tag.getAiExplanation(), tag.getErrorType(),
                tag.getConfidence() != null ? tag.getConfidence() : 0.0);
        }

        try {
            LlmRequest request = buildRequest(record);
            LlmResponse resp = llm.chat(request);
            TutorResult result = parser.parse(resp.content());

            ErrorTag tag = ErrorTag.builder()
                .answerRecord(record)
                .questionId(record.getQuestion().getId())
                .domainId(record.getQuestion().getDomain().getId())
                .errorType(result.errorType())
                .confidence(result.confidence())
                .aiExplanation(result.explanation())
                .createdAt(LocalDateTime.now())
                .build();
            tagRepo.save(tag);

            log.info("[Tutor] recordId={} tokens={} errorType={} confidence={}",
                record.getId(), resp.tokensUsed(), result.errorType(), result.confidence());

            return TutorResponse.builder()
                .explanation(result.explanation())
                .errorType(result.errorType())
                .errorTypeLabel(result.errorType().getLabel())
                .confidence(result.confidence())
                .cached(resp.cached())
                .degraded(false)
                .tokensUsed(resp.tokensUsed())
                .build();
        } catch (LlmUnavailableException e) {
            log.warn("LLM 辅导降级 recordId={} reason={}", record.getId(), e.getReasonCode());
            return TutorResponse.degraded(getFallbackAnalysis(record));
        } catch (Exception e) {
            log.warn("辅导异常 recordId={}", record.getId(), e);
            return TutorResponse.degraded(getFallbackAnalysis(record));
        }
    }

    private LlmRequest buildRequest(AnswerRecord record) {
        Long domainId = record.getQuestion().getDomain().getId();
        List<ErrorType> recentTypes = tagRepo.findRecentTagsByDomain(
            domainId, MIN_CONFIDENCE_FOR_HISTORY, HISTORY_TAG_LIMIT);
        String historyTags = recentTypes.isEmpty()
            ? "暂无历史错因数据"
            : recentTypes.stream().map(ErrorType::getLabel).collect(Collectors.joining("、"));

        String stem = record.getQuestion().getStem();
        if (stem != null && stem.length() > MAX_STEM_LENGTH) {
            stem = stem.substring(0, MAX_STEM_LENGTH) + "...(已截断)";
        }

        Map<String, Object> vars = new HashMap<>();
        vars.put("question", stem);
        vars.put("userAnswer", record.getUserAnswer());
        vars.put("correctAnswer", record.getQuestion().getAnswer());
        vars.put("analysis", record.getQuestion().getAnalysis() != null
            ? record.getQuestion().getAnalysis() : "无参考解析");
        vars.put("historyTags", historyTags);

        String system = prompts.render("tutor-system", Map.of());
        String user = prompts.render("tutor-explain", vars);

        return new LlmRequest(system, user, 0.7, 800).withJsonMode();
    }

    private String getFallbackAnalysis(AnswerRecord record) {
        String analysis = record.getQuestion().getAnalysis();
        if (analysis != null && !analysis.isBlank()) {
            return "AI 辅导暂时不可用，以下为标准解析：\n\n" + analysis;
        }
        return "AI 辅导暂时不可用，正确答案为：" + record.getQuestion().getAnswer();
    }
}
