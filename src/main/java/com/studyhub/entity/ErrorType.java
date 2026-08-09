package com.studyhub.entity;

public enum ErrorType {
    CONCEPT_MISS("概念不会"),
    MISREAD("审题失误"),
    MEMORY_CONFUSE("记忆混淆"),
    CALC_ERROR("计算错误");

    private final String label;

    ErrorType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static ErrorType fromString(String value) {
        if (value == null || value.isBlank()) return CONCEPT_MISS;
        try {
            return ErrorType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return CONCEPT_MISS;
        }
    }
}
