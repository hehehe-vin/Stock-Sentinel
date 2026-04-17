package com.stocksentinel.anomaly;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MovingAverageDetectorTest {

    private MovingAverageDetector movingAverageDetector;

    @BeforeEach
    void setUp() {
        movingAverageDetector = new MovingAverageDetector();
    }

    @Test
    @DisplayName("Should return empty for null input")
    void shouldReturnEmptyForNullInput() {
        Optional<AnomalyRecord> result = movingAverageDetector.detect(null);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should return empty for insufficient data")
    void shouldReturnEmptyForInsufficientData() {
        Optional<AnomalyRecord> result = movingAverageDetector.detect(List.of(100.0));
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should return empty for normal prices")
    void shouldReturnEmptyForNormalPrices() {
        List<Double> prices = Arrays.asList(100.0, 101.0, 99.5, 100.5, 100.2);
        Optional<AnomalyRecord> result = movingAverageDetector.detect(prices);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should detect MA_DEVIATION anomaly for large spike")
    void shouldDetectMaDeviationForLargeSpike() {
        List<Double> prices = Arrays.asList(100.0, 101.0, 99.5, 100.5, 100.2, 200.0);
        Optional<AnomalyRecord> result = movingAverageDetector.detect(prices);

        assertTrue(result.isPresent());
        AnomalyRecord record = result.get();
        assertEquals("MA_DEVIATION", record.getType());
        assertEquals("HIGH", record.getSeverity());
        assertTrue(record.getDeviation() > 5.0);
        assertEquals(200.0, record.getPriceAtDetection());
    }

    @Test
    @DisplayName("Should detect MEDIUM severity for moderate deviation")
    void shouldDetectMediumSeverityForModerateDeviation() {
        // MA of [100, 100, 100, 100, 100] = 100.0
        // Current price 104.0 → deviation = 4.0% → MEDIUM (>= 3.0 and < 5.0)
        List<Double> prices = Arrays.asList(100.0, 100.0, 100.0, 100.0, 100.0, 104.0);
        Optional<AnomalyRecord> result = movingAverageDetector.detect(prices);

        assertTrue(result.isPresent());
        AnomalyRecord record = result.get();
        assertEquals("MA_DEVIATION", record.getType());
        assertEquals("MEDIUM", record.getSeverity());
    }
}
