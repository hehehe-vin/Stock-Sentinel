package com.stocksentinel.anomaly;

import com.stocksentinel.anomaly.dto.AnomalyCountDTO;
import com.stocksentinel.anomaly.dto.AnomalyResponseDTO;
import com.stocksentinel.anomaly.dto.VolatilityDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.stocksentinel.stock.CsvImportService;
import com.stocksentinel.stock.StockData;

@RestController
@RequestMapping("/api/anomalies")
@Tag(name = "Anomalies", description = "Anomaly detection results and statistics")
public class AnomalyController {

    private static final Logger log = LoggerFactory.getLogger(AnomalyController.class);

    private final AnomalyService anomalyService;
    private final CsvImportService csvImportService;

    public AnomalyController(AnomalyService anomalyService, CsvImportService csvImportService) {
        this.anomalyService = anomalyService;
        this.csvImportService = csvImportService;
    }

    @GetMapping
    @Operation(summary = "Get all detected anomalies, newest first")
    public ResponseEntity<List<AnomalyResponseDTO>> getAllAnomalies() {
        log.info("GET /api/anomalies");
        return ResponseEntity.ok(anomalyService.getAllAnomalies());
    }

    @PostMapping("/backtest")
    @Operation(summary = "Backtest a CSV file for anomalies")
    public ResponseEntity<List<AnomalyResponseDTO>> backtestCsv(@RequestParam("file") MultipartFile file) {
        log.info("POST /api/anomalies/backtest — file: {}", file.getOriginalFilename());
        List<StockData> data = csvImportService.parseCsvFile(file);
        List<AnomalyRecord> anomalies = anomalyService.backtestHistoricalData(data);
        
        List<AnomalyResponseDTO> dtos = anomalies.stream().map(record -> AnomalyResponseDTO.builder()
                .id(record.getId())
                .symbol(record.getSymbol())
                .type(record.getType())
                .severity(record.getSeverity())
                .zScore(record.getZScore())
                .deviation(record.getDeviation())
                .priceAtDetection(record.getPriceAtDetection())
                .timestamp(record.getTimestamp() == null ? null : record.getTimestamp().toString()) // Simplify timestamp
                .build()).toList();
                
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{symbol}")
    @Operation(summary = "Get anomalies for a specific stock symbol")
    public ResponseEntity<List<AnomalyResponseDTO>> getAnomaliesBySymbol(@PathVariable String symbol) {
        log.info("GET /api/anomalies/{}", symbol);
        return ResponseEntity.ok(anomalyService.getAnomaliesBySymbol(symbol));
    }

    @GetMapping("/severity/{level}")
    @Operation(summary = "Get anomalies by severity: HIGH, MEDIUM, or LOW")
    public ResponseEntity<List<AnomalyResponseDTO>> getAnomaliesBySeverity(@PathVariable String level) {
        log.info("GET /api/anomalies/severity/{}", level);
        return ResponseEntity.ok(anomalyService.getAnomaliesBySeverity(level));
    }

    @GetMapping("/range")
    @Operation(summary = "Get anomalies between two datetime values")
    public ResponseEntity<List<AnomalyResponseDTO>> getAnomaliesByDateRange(
            @RequestParam String start,
            @RequestParam String end) {
        LocalDateTime startDt = LocalDateTime.parse(start);
        LocalDateTime endDt = LocalDateTime.parse(end);
        return ResponseEntity.ok(anomalyService.getAnomaliesByDateRange(startDt, endDt));
    }

    @GetMapping("/count")
    @Operation(summary = "Get anomaly counts by severity and today's total")
    public ResponseEntity<AnomalyCountDTO> getAnomalyCount() {
        log.info("GET /api/anomalies/count");
        return ResponseEntity.ok(anomalyService.getAnomalyCount());
    }

    @GetMapping("/volatility")
    @Operation(summary = "Get volatility scores for all symbols with anomaly history")
    public ResponseEntity<List<VolatilityDTO>> getAllVolatility() {
        log.info("GET /api/anomalies/volatility");
        return ResponseEntity.ok(anomalyService.getAllVolatilityScores());
    }

    @GetMapping("/volatility/{symbol}")
    @Operation(summary = "Get volatility score for a specific symbol")
    public ResponseEntity<VolatilityDTO> getVolatility(@PathVariable String symbol) {
        log.info("GET /api/anomalies/volatility/{}", symbol);
        return ResponseEntity.ok(anomalyService.getVolatilityScore(symbol));
    }
}
