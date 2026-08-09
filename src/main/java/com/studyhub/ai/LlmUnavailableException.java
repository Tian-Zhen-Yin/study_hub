package com.studyhub.ai;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class LlmUnavailableException extends RuntimeException {
    private final String reasonCode;
    private final HttpStatus httpStatus;

    public LlmUnavailableException(String reasonCode, String message) {
        super(message);
        this.reasonCode = reasonCode;
        this.httpStatus = null;
    }

    public LlmUnavailableException(String reasonCode, String message, Throwable cause) {
        super(message, cause);
        this.reasonCode = reasonCode;
        this.httpStatus = null;
    }

    public LlmUnavailableException(String reasonCode, String message, HttpStatus httpStatus, Throwable cause) {
        super(message, cause);
        this.reasonCode = reasonCode;
        this.httpStatus = httpStatus;
    }
}
