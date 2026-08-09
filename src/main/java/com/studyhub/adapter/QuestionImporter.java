package com.studyhub.adapter;

import com.studyhub.dto.ImportResultDTO;

public interface QuestionImporter {
    ImportResultDTO importQuestions(String filePath);
    String getSourceType();
}
