package com.stocksentinel.anomaly;

import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MovingAverageDetector {

    private static final Logger log = LoggerFactory.getLogger(MovingAverageDetector.class);
    private static final int MA_PERIOD = 20;

    public Optional<AnomalyRecord> detect(List<Double> prices) {
        if (prices == null || prices.size() < 2) {
            return Optional.empty();
        }

        double currentPrice = prices.get(prices.size() - 1);

        int period = Math.min(MA_PERIOD, prices.size() - 1);
        if (period < 1) {
            return Optional.empty();
        }

        List<Double> maWindow = prices.subList(prices.size() - 1 - period, prices.size() - 1);

        double movingAverage = maWindow.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        if (movingAverage == 0.0) {
            return Optional.empty();
        }

        double deviation = Math.abs(currentPrice - movingAverage) / movingAverage * 100.0;
        deviation = Math.round(deviation * 100.0) / 100.0;

        if (deviation < 2.0) {
            return Optional.empty();
        }

        String severity;
        if (deviation >= 5.0) {
            severity = "HIGH";
        } else if (deviation >= 3.0) {
            severity = "MEDIUM";
        } else {
            severity = "LOW";
        }

        String type = "MA_DEVIATION";

        log.info(
                "MA anomaly detected - deviation={}%, severity={}",
                String.format("%.2f", deviation),
                severity);

        return Optional.of(AnomalyRecord.builder()
                .type(type)
                .severity(severity)
                .deviation(deviation)
                .priceAtDetection(currentPrice)
                .build());
    }
}
