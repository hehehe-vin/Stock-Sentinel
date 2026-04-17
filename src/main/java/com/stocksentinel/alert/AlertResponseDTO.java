package com.stocksentinel.alert;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertResponseDTO {

    private Long id;
    private String symbol;
    private String alertType;
    private String severity;
    private String message;
    private String recipientEmail;
    private boolean emailSent;
    private String createdAt;
}
