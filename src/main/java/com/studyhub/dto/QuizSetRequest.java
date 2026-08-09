package com.studyhub.dto;

import lombok.Data;

@Data
public class QuizSetRequest {
    private String mode = "continue";
    private Long domainId;
    private String examYear;
    private Integer count = 20;
    private String keyword;
}
