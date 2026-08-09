package com.studyhub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImportResultDTO {
    private int total;
    private int imported;
    private int skipped;
    private String source;
}
