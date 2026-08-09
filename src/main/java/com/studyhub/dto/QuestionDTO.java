package com.studyhub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDTO {
    private Long id;
    private String source;
    private String subject;
    private Long domainId;
    private String domainName;
    private String stem;
    private String optionsJson;
    private String answer;
    private String analysis;
    private String examYear;
    private String sourceFile;
    private String imageUrl;
}
