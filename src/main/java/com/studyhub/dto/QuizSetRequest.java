package com.studyhub.dto;

import lombok.Data;

@Data
public class QuizSetRequest {
    private String mode = "continue";
    private Long domainId;
    private String examYear;
    private Integer count = 20;
    private String keyword;
    /** 按题型过滤：MCQ / CASE / ESSAY，空为不过滤 */
    private String questionType;
    /** 案例专项方向：匹配题干【案例题型·XX】前缀，空为不过滤 */
    private String caseTopic;
    /** 按题源筛选（如 CHEKO_SUPP=系分真题·架构师补充），空为全池 */
    private String source;
}
