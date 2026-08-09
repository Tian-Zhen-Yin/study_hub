package com.studyhub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomainDTO {
    private Long id;
    private String name;
    private Integer pct;
    private String priority;
    private String state;
}
