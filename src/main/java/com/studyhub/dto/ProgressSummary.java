package com.studyhub.dto;

import lombok.Data;

@Data
public class ProgressSummary {
    private int schemaVersion;
    private String exportedAt;
    private int attempts;
    private int answeredQuestions;
    private int wrong;
    private int bookmarks;
    private String latestAt;
}
