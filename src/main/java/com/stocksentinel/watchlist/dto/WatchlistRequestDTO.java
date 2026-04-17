package com.stocksentinel.watchlist.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WatchlistRequestDTO {

    @NotBlank(message = "Symbol is required")
    private String symbol;

    private Double alertThresholdHigh;
    private Double alertThresholdLow;
}
