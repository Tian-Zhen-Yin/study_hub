package com.studyhub.ai;

import lombok.extern.slf4j.Slf4j;

/**
 * Mock LLM 客户端:不调用真实模型,返回本地构造的占位响应,用于无 API Key 时的流程验证。
 * 由 {@link LlmProviderRegistry} 在 provider=MOCK 时按需实例化,不作为 Spring Bean。
 */
@Slf4j
public class MockLlmClient implements LlmClient {

    public MockLlmClient() {
        log.warn("====== 使用 MockLlmClient (不会调用真实 LLM) ======");
        log.warn("如需启用真实 AI, 请在前端「AI 模型」页切换并配置对应提供方的 API Key");
    }

    @Override
    public LlmResponse chat(LlmRequest request) {
        String userPrompt = request.userPrompt();
        String content;

        if (userPrompt.contains("错因分布") || userPrompt.contains("诊断报告") || userPrompt.contains("学习者画像")) {
            content = buildDiagnosisResponse();
            log.info("[Mock] 返回诊断报告 mock 响应");
        } else if (userPrompt.contains("学生选择的答案") || userPrompt.contains("errorType")) {
            content = buildTutorResponse(userPrompt);
            log.info("[Mock] 返回错题辅导 mock 响应");
        } else {
            content = "{\"explanation\":\"Mock 模式:未识别请求类型\",\"errorType\":\"CONCEPT_MISS\",\"confidence\":0.5}";
        }

        try {
            Thread.sleep(300);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        int mockTokens = (int) Math.ceil(content.length() / 3.0);
        return LlmResponse.fresh(content, mockTokens);
    }

    private String buildTutorResponse(String userPrompt) {
        String errorType = "CONCEPT_MISS";
        String explanation = "这是一条 Mock 辅导解释（未调用真实 LLM）。";

        if (userPrompt.contains("流水线")) {
            errorType = "CONCEPT_MISS";
            explanation = "你选了 B，但正确答案是 A。本题考查流水线执行时间计算。" +
                "流水线执行时间 = (一条指令时间) + (n-1) × (最长段时间)。" +
                "你混淆了流水线周期和单条指令执行时间。流水线周期取各段中最长者，" +
                "而非各段之和。建议复习流水线时空图的绘制方法。";
        } else if (userPrompt.contains("PV") || userPrompt.contains("信号量")) {
            errorType = "MEMORY_CONFUSE";
            explanation = "你选了 C，但正确答案是 D。本题考查 PV 操作。" +
                "你把 P 操作和 V 操作的作用记反了：P 操作是申请资源(减1)，V 操作是释放资源(加1)。" +
                "这是典型的记忆混淆，建议用生产者-消费者模型重新理解 PV 操作的配对关系。";
        } else if (userPrompt.contains("范式") || userPrompt.contains("函数依赖")) {
            errorType = "CONCEPT_MISS";
            explanation = "你选了 A，但正确答案是 C。本题考查数据库范式。" +
                "3NF 要求消除传递函数依赖，而 BCNF 进一步要求每个决定因素都必须是候选键。" +
                "你漏掉了 BCNF 对主属性的额外约束。建议对比 3NF 和 BCNF 的严格定义。";
        } else if (userPrompt.contains("TCP") || userPrompt.contains("三次握手")) {
            errorType = "MISREAD";
            explanation = "你选了 D，但正确答案是 B。本题考查 TCP 三次握手。" +
                "你选择了'四次挥手'的选项，属于审题失误——题目问的是建立连接过程，不是断开连接。" +
                "建议答题时先圈出关键词'建立连接'再选答案。";
        } else if (userPrompt.contains("单例") || userPrompt.contains("设计模式")) {
            errorType = "CALC_ERROR";
            explanation = "你选了 C，但正确答案是 A。本题考查单例模式的实现。" +
                "双重检查锁定需要在实例字段上加 volatile 关键字，防止指令重排序。" +
                "你遗漏了 volatile 修饰，属于对并发细节的疏忽。";
        } else {
            errorType = "CONCEPT_MISS";
            explanation = "【Mock 模式】你答错了这道题。正确答案和解析请参考上方标准解析。" +
                "根据 Mock LLM 的默认判断，这属于概念掌握不牢固，建议针对该知识点做专项复习。" +
                "(配置 studyhub.llm.provider=ark 并设置 ARK_API_KEY 可获得真实 AI 辅导)";
        }

        return String.format(
            "{\"explanation\":\"%s\",\"errorType\":\"%s\",\"confidence\":0.85}",
            escapeJson(explanation), errorType
        );
    }

    private String buildDiagnosisResponse() {
        return """
            {
              "learnerProfile": {
                "summary": "中级架构师,累计25题,正确率56%,连续学习7天,计算机网络和操作系统为明显短板",
                "strengths": ["数据库技术", "设计模式"],
                "weaknesses": ["计算机网络", "操作系统"]
              },
              "weakDomains": [
                {"domainId": 4, "domainName": "计算机网络", "accuracy": 0.25, "errorCount": 3},
                {"domainId": 2, "domainName": "操作系统", "accuracy": 0.33, "errorCount": 2},
                {"domainId": 1, "domainName": "计算机系统基础", "accuracy": 0.50, "errorCount": 1}
              ],
              "errorDistribution": {
                "CONCEPT_MISS": 0.50,
                "MEMORY_CONFUSE": 0.25,
                "MISREAD": 0.17,
                "CALC_ERROR": 0.08
              },
              "weeklyAdvice": "本周计算机网络(正确率25%)和操作系统(33%)为最薄弱模块,且错因50%为概念不会。建议:1)每天投入1小时系统复习这两章的核心概念;2)计算机网络重点抓TCP/IP协议栈和三次握手;3)操作系统重点抓进程调度和PV操作;4)错因中记忆混淆占25%,建议对易混淆知识点(如P/V操作方向)使用记忆卡片强化。"
            }""";
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "");
    }
}
