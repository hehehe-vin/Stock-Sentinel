package com.stocksentinel.stock.dto;

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
public class StockResponseDTO {

    private Long id;
    private String symbol;
    private Double price;
    private Long volume;
    private String timestamp;
    private String source;
    private String notes;
}
