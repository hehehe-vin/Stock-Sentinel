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
public class AnomalyCountDTO {

    private long highCount;
    private long mediumCount;
    private long lowCount;
    private long totalToday;
}
