package com.stocksentinel.anomaly;

import com.stocksentinel.anomaly.dto.AnomalyCountDTO;
import com.stocksentinel.anomaly.dto.AnomalyResponseDTO;
import com.stocksentinel.anomaly.dto.VolatilityDTO;
import com.stocksentinel.alert.AlertService;
import com.stocksentinel.exception.ResourceNotFoundException;
import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AnomalyService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyService.class);
    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StockRepository stockRepository;
    private final AnomalyRepository anomalyRepository;
    private final ZScoreDetector zScoreDetector;
    private final MovingAverageDetector movingAverageDetector;
    private final AlertService alertService;

    public AnomalyService(
            StockRepository stockRepository,
            AnomalyRepository anomalyRepository,
            ZScoreDetector zScoreDetector,
            MovingAverageDetector movingAverageDetector,
            AlertService alertService) {
        this.stockRepository = stockRepository;
        this.anomalyRepository = anomalyRepository;
        this.zScoreDetector = zScoreDetector;
        this.movingAverageDetector = movingAverageDetector;
        this.alertService = alertService;
    }

    private AnomalyResponseDTO toDTO(AnomalyRecord record) {
        return AnomalyResponseDTO.builder()
                .id(record.getId())
                .symbol(record.getSymbol())
                .type(record.getType())
                .severity(record.getSeverity())
                .zScore(record.getZScore())
                .deviation(record.getDeviation())
                .priceAtDetection(record.getPriceAtDetection())
                .timestamp(record.getTimestamp() == null
                        ? null
                        : record.getTimestamp().format(TIMESTAMP_FORMATTER))
                .build();
    }

    public List<AnomalyRecord> analyzeStock(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();

        List<StockData> recentData = stockRepository.findTop50BySymbolOrderByTimestampDesc(normalizedSymbol);
        if (recentData.size() < 3) {
            log.debug("Not enough data to analyze {}: {} points", normalizedSymbol, recentData.size());
            return List.of();
        }

        List<Double> prices = new ArrayList<>();
        for (int i = recentData.size() - 1; i >= 0; i--) {
            prices.add(recentData.get(i).getPrice());
        }

        List<AnomalyRecord> detectedAnomalies = new ArrayList<>();

        Optional<AnomalyRecord> zScoreResult = zScoreDetector.detect(prices);
        zScoreResult.ifPresent(record -> {
            record.setSymbol(normalizedSymbol);
            AnomalyRecord saved = anomalyRepository.save(record);
            try {
                alertService.createAlertFromAnomaly(saved);
            } catch (Exception e) {
                log.warn("Failed to create alert for anomaly: {}", e.getMessage());
            }
            detectedAnomalies.add(saved);
            log.info(
                    "Z-Score anomaly saved for {}: {} severity={}",
                    normalizedSymbol,
                    saved.getType(),
                    saved.getSeverity());
        });

        Optional<AnomalyRecord> maResult = movingAverageDetector.detect(prices);
        maResult.ifPresent(record -> {
            record.setSymbol(normalizedSymbol);
            AnomalyRecord saved = anomalyRepository.save(record);
            try {
                alertService.createAlertFromAnomaly(saved);
            } catch (Exception e) {
                log.warn("Failed to create alert for anomaly: {}", e.getMessage());
            }
            detectedAnomalies.add(saved);
            log.info("MA anomaly saved for {}: deviation={}%", normalizedSymbol, saved.getDeviation());
        });

        return detectedAnomalies;
    }

    public List<AnomalyResponseDTO> getAllAnomalies() {
        List<AnomalyRecord> records = anomalyRepository.findAllByOrderByTimestampDesc();
        log.info("Fetching all anomalies - count: {}", records.size());
        return records.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<AnomalyResponseDTO> getAnomaliesBySymbol(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        List<AnomalyRecord> records = anomalyRepository.findBySymbolOrderByTimestampDesc(normalizedSymbol);
        if (records.isEmpty()) {
            throw new ResourceNotFoundException("No anomalies found for: " + normalizedSymbol);
        }
        return records.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<AnomalyResponseDTO> getAnomaliesBySeverity(String severity) {
        String normalizedSeverity = severity.toUpperCase();
        if (!normalizedSeverity.equals("HIGH")
                && !normalizedSeverity.equals("MEDIUM")
                && !normalizedSeverity.equals("LOW")) {
            throw new RuntimeException(
                    "Invalid severity: " + severity + ". Must be HIGH, MEDIUM, or LOW");
        }

        return anomalyRepository.findBySeverityOrderByTimestampDesc(normalizedSeverity).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<AnomalyResponseDTO> getAnomaliesByDateRange(LocalDateTime start, LocalDateTime end) {
        return anomalyRepository.findByTimestampBetweenOrderByTimestampDesc(start, end).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AnomalyCountDTO getAnomalyCount() {
        long highCount = anomalyRepository.countBySeverity("HIGH");
        long mediumCount = anomalyRepository.countBySeverity("MEDIUM");
        long lowCount = anomalyRepository.countBySeverity("LOW");

        LocalDateTime sinceMidnight = LocalDateTime.now().toLocalDate().atStartOfDay();
        long totalToday = anomalyRepository.countRecentAnomalies(sinceMidnight);

        return AnomalyCountDTO.builder()
                .highCount(highCount)
                .mediumCount(mediumCount)
                .lowCount(lowCount)
                .totalToday(totalToday)
                .build();
    }

    // ==================== VOLATILITY SCORING ====================

    public VolatilityDTO getVolatilityScore(String symbol) {
        String normalized = symbol.toUpperCase();
        List<AnomalyRecord> all = anomalyRepository.findBySymbol(normalized);
        long recentCount = anomalyRepository.countBySymbolAndTimestampAfter(
                normalized, LocalDateTime.now().minusDays(7));
        long highCount = anomalyRepository.countBySymbolAndSeverity(normalized, "HIGH");

        double avgDev = all.stream()
                .filter(a -> a.getDeviation() != null)
                .mapToDouble(a -> Math.abs(a.getDeviation()))
                .average().orElse(0);

        String rating = calculateVolatilityRating(recentCount, avgDev);

        log.debug("Volatility for {}: rating={}, total={}, recent7d={}, highCount={}",
                normalized, rating, all.size(), recentCount, highCount);

        return new VolatilityDTO(normalized, rating, all.size(), (int) highCount, (int) recentCount, avgDev);
    }

    public List<VolatilityDTO> getAllVolatilityScores() {
        List<String> symbols = anomalyRepository.findDistinctSymbols();
        return symbols.stream()
                .map(this::getVolatilityScore)
                .collect(Collectors.toList());
    }

    private String calculateVolatilityRating(long recentCount, double avgDeviation) {
        if (recentCount >= 10 || avgDeviation > 5.0) return "EXTREME";
        if (recentCount >= 5 || avgDeviation > 3.0) return "HIGH";
        if (recentCount >= 2 || avgDeviation > 2.0) return "MODERATE";
        return "LOW";
    }
}

