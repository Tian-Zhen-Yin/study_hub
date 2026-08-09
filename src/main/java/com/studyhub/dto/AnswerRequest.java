package com.studyhub.dto;

import lombok.Data;

@Data
public class AnswerRequest {
    private Long questionId;
    private String userAnswer;
}
