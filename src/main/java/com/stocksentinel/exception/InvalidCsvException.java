package com.stocksentinel.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCsvException extends RuntimeException {

    private static final Logger log = LoggerFactory.getLogger(InvalidCsvException.class);

    public InvalidCsvException(String message) {
        super(message);
        log.error("Invalid CSV: {}", message);
    }
}