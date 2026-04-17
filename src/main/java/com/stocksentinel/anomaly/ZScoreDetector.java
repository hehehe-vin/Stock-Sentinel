package com.stocksentinel.anomaly;

import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ZScoreDetector {

    private static final Logger log = LoggerFactory.getLogger(ZScoreDetector.class);

    public Optional<AnomalyRecord> detect(List<Double> prices) {
        int size = prices == null ? 0 : prices.size();
        if (prices == null || prices.size() < 3) {
            log.debug("Insufficient data for Z-Score detection: {} points", size);
            return Optional.empty();
        }

        double currentPrice = prices.get(prices.size() - 1);
        List<Double> historicalPrices = prices.subList(0, prices.size() - 1);

        double mean = historicalPrices.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        double variance = historicalPrices.stream()
                .mapToDouble(p -> Math.pow(p - mean, 2))
                .average()
                .orElse(0.0);
        double stdDev = Math.sqrt(variance);

        if (stdDev == 0.0) {
            return Optional.empty();
        }

        double zScore = (currentPrice - mean) / stdDev;
        double absZ = Math.abs(zScore);

        if (absZ < 2.0) {
            return Optional.empty();
        }

        String severity;
        if (absZ >= 3.0) {
            severity = "HIGH";
        } else if (absZ >= 2.5) {
            severity = "MEDIUM";
        } else {
            severity = "LOW";
        }

        String type = zScore > 0 ? "PRICE_SPIKE" : "PRICE_DROP";

        log.info(
                "Z-Score anomaly detected - symbol analysis, Z={}, severity={}",
                String.format("%.2f", zScore),
                severity);

        return Optional.of(AnomalyRecord.builder()
                .type(type)
                .severity(severity)
                .zScore(Math.round(zScore * 100.0) / 100.0)
                .priceAtDetection(currentPrice)
                .build());
    }
}
