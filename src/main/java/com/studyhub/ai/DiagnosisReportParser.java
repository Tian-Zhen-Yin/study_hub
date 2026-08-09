package com.studyhub.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyhub.dto.DiagnosisReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DiagnosisReportParser {

    private final ObjectMapper objectMapper;

    public DiagnosisReport parse(String raw, DiagnosisReport.LearnerProfile profile,
                                  List<DiagnosisReport.WeakDomain> computedWeakDomains,
                                  int tokensUsed) {
        if (raw == null || raw.isBlank()) {
            throw new LlmUnavailableException("PARSE_FAILED", "诊断 LLM 返回空内容");
        }

        String json = raw.trim();
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }

        try {
            JsonNode root = objectMapper.readTree(json);

            DiagnosisReport.LearnerProfile parsedProfile = profile;
            JsonNode profileNode = root.path("learnerProfile");
            if (!profileNode.isMissingNode()) {
                parsedProfile = DiagnosisReport.LearnerProfile.builder()
                    .level(profile.getLevel())
                    .title(profile.getTitle())
                    .totalAnswered(profile.getTotalAnswered())
                    .overallAccuracy(profile.getOverallAccuracy())
                    .loginStreak(profile.getLoginStreak())
                    .summary(profileNode.path("summary").asText(profile.getSummary()))
                    .strengths(toStringList(profileNode.path("strengths")))
                    .weaknesses(toStringList(profileNode.path("weaknesses")))
                    .build();
            }

            List<DiagnosisReport.WeakDomain> weakDomains = parseWeakDomains(root.path("weakDomains"));
            if (weakDomains.isEmpty()) {
                weakDomains = computedWeakDomains;
            }

            Map<String, Double> errorDist = parseErrorDistribution(root.path("errorDistribution"));
            String weeklyAdvice = root.path("weeklyAdvice").asText("暂无建议");

            List<Long> ranking = weakDomains.stream()
                .map(DiagnosisReport.WeakDomain::getDomainId)
                .collect(Collectors.toList());

            return DiagnosisReport.builder()
                .learnerProfile(parsedProfile)
                .weakDomains(weakDomains)
                .errorDistribution(errorDist)
                .weeklyAdvice(weeklyAdvice)
                .weakDomainRanking(ranking)
                .tokensUsed(tokensUsed)
                .build();
        } catch (LlmUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.warn("诊断报告 JSON 解析失败,使用计算数据兜底: {}", e.getMessage());
            return fallbackReport(profile, computedWeakDomains, tokensUsed);
        }
    }

    private List<DiagnosisReport.WeakDomain> parseWeakDomains(JsonNode node) {
        List<DiagnosisReport.WeakDomain> list = new ArrayList<>();
        if (!node.isArray()) return list;
        for (JsonNode item : node) {
            Long domainId = item.path("domainId").asLong(0);
            if (domainId == 0) continue;
            list.add(DiagnosisReport.WeakDomain.builder()
                .domainId(domainId)
                .domainName(item.path("domainName").asText(""))
                .accuracy(item.path("accuracy").asDouble(0))
                .errorCount(item.path("errorCount").asInt(0))
                .build());
        }
        return list;
    }

    private Map<String, Double> parseErrorDistribution(JsonNode node) {
        Map<String, Double> map = new LinkedHashMap<>();
        if (node.isMissingNode() || !node.isObject()) return map;
        node.fields().forEachRemaining(entry ->
            map.put(entry.getKey(), entry.getValue().asDouble(0)));
        return map;
    }

    private List<String> toStringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                list.add(item.asText());
            }
        }
        return list;
    }

    private DiagnosisReport fallbackReport(DiagnosisReport.LearnerProfile profile,
                                            List<DiagnosisReport.WeakDomain> weakDomains,
                                            int tokensUsed) {
        return DiagnosisReport.builder()
            .learnerProfile(profile)
            .weakDomains(weakDomains)
            .errorDistribution(new LinkedHashMap<>())
            .weeklyAdvice("AI 诊断生成异常，以下为基于作答数据的统计结果。")
            .weakDomainRanking(weakDomains.stream()
                .map(DiagnosisReport.WeakDomain::getDomainId)
                .collect(Collectors.toList()))
            .tokensUsed(tokensUsed)
            .build();
    }
}
