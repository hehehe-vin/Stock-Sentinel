package com.stocksentinel.anomaly.dto;

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
public class AnomalyResponseDTO {

    private Long id;
    private String symbol;
    private String type;
    private String severity;
    private Double zScore;
    private Double deviation;
    private Double priceAtDetection;
    private String timestamp;
}
