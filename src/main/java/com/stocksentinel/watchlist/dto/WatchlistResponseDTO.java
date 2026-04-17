package com.stocksentinel.watchlist.dto;

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
public class WatchlistResponseDTO {

    private Long id;
    private String symbol;
    private Double alertThresholdHigh;
    private Double alertThresholdLow;
    private String addedAt;
    private Double currentPrice;
    private Double priceChange;
}
