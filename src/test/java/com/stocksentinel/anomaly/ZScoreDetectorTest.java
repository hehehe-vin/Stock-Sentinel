package com.stocksentinel.anomaly;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ZScoreDetectorTest {

    private ZScoreDetector zScoreDetector;

    @BeforeEach
    void setUp() {
        zScoreDetector = new ZScoreDetector();
    }

    @Test
    @DisplayName("Should return empty for null input")
    void shouldReturnEmptyForNullInput() {
        Optional<AnomalyRecord> result = zScoreDetector.detect(null);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should return empty for insufficient data (less than 3)")
    void shouldReturnEmptyForInsufficientData() {
        Optional<AnomalyRecord> result = zScoreDetector.detect(List.of(100.0, 101.0));
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should return empty for normal price movement")
    void shouldReturnEmptyForNormalPriceMovement() {
        List<Double> prices = Arrays.asList(100.0, 101.0, 99.5, 100.5, 100.2);
        Optional<AnomalyRecord> result = zScoreDetector.detect(prices);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should detect PRICE_SPIKE anomaly")
    void shouldDetectPriceSpikeAnomaly() {
        List<Double> prices = Arrays.asList(100.0, 101.0, 99.5, 100.5, 100.2, 250.0);
        Optional<AnomalyRecord> result = zScoreDetector.detect(prices);

        assertTrue(result.isPresent());
        AnomalyRecord record = result.get();
        assertEquals("PRICE_SPIKE", record.getType());
        assertEquals("HIGH", record.getSeverity());
        assertTrue(record.getZScore() > 0);
        assertEquals(250.0, record.getPriceAtDetection());
    }

    @Test
    @DisplayName("Should detect PRICE_DROP anomaly")
    void shouldDetectPriceDropAnomaly() {
        List<Double> prices = Arrays.asList(100.0, 101.0, 99.5, 100.5, 100.2, 10.0);
        Optional<AnomalyRecord> result = zScoreDetector.detect(prices);

        assertTrue(result.isPresent());
        AnomalyRecord record = result.get();
        assertEquals("PRICE_DROP", record.getType());
        assertEquals("HIGH", record.getSeverity());
        assertTrue(record.getZScore() < 0);
        assertEquals(10.0, record.getPriceAtDetection());
    }

    @Test
    @DisplayName("Should return empty when all prices are identical")
    void shouldReturnEmptyForIdenticalPrices() {
        List<Double> prices = Arrays.asList(100.0, 100.0, 100.0, 100.0);
        Optional<AnomalyRecord> result = zScoreDetector.detect(prices);
        assertTrue(result.isEmpty());
    }
}
