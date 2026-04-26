package com.stocksentinel.datasource;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/datasource")
@Tag(name = "Data Source", description = "Live data polling and source management")
public class DataSourceController {

    private static final Logger log = LoggerFactory.getLogger(DataSourceController.class);

    private final DataSourceManager dataSourceManager;

    public DataSourceController(DataSourceManager dataSourceManager) {
        this.dataSourceManager = dataSourceManager;
    }

    @GetMapping("/status")
    @Operation(summary = "Get currently active data source")
    public ResponseEntity<Map<String, Object>> getCurrentSource() {
        log.debug("GET /api/datasource/status");
        Map<String, Object> response = new HashMap<>();
        response.put("activeSource", dataSourceManager.getCurrentDataSource());
        response.put("lastUpdated", dataSourceManager.getCachedLastUpdated());
        response.put("forceSimulator", dataSourceManager.isForceSimulator());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/symbols")
    @Operation(summary = "Get list of symbols being polled")
    public ResponseEntity<List<String>> getWatchedSymbols() {
        log.info("GET /api/datasource/symbols");
        return ResponseEntity.ok(dataSourceManager.getWatchedSymbols());
    }

    @PostMapping("/poll")
    @Operation(summary = "Manually trigger a live data poll")
    public ResponseEntity<Map<String, Object>> triggerManualPoll() {
        log.info("POST /api/datasource/poll — manual poll triggered");
        String dataSource = dataSourceManager.triggerManualPoll();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Manual poll triggered successfully");
        response.put("dataSource", dataSource);
        response.put("lastUpdated", dataSourceManager.getCachedLastUpdated());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/force-simulator")
    @Operation(summary = "Force the system to use SIMULATOR (saves API limits)")
    public ResponseEntity<Map<String, Object>> toggleForceSimulator(@RequestParam boolean enable) {
        log.info("POST /api/datasource/force-simulator?enable={}", enable);
        dataSourceManager.setForceSimulator(enable);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Simulator mode updated");
        response.put("forceSimulator", dataSourceManager.isForceSimulator());
        response.put("activeSource", dataSourceManager.getCurrentDataSource());
        response.put("lastUpdated", dataSourceManager.getCachedLastUpdated());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/live-quotes")
    @Operation(summary = "Get real-time quotes directly from the API (no DB)")
    public ResponseEntity<List<LiveQuoteDTO>> getLiveQuotes() {
        log.info("GET /api/datasource/live-quotes");
        List<LiveQuoteDTO> quotes = dataSourceManager.fetchLiveQuotes();
        return ResponseEntity.ok(quotes);
    }

    @GetMapping("/candles/{symbol}")
    @Operation(summary = "Get intraday candle data for a symbol (no DB)")
    public ResponseEntity<List<CandleDTO>> getCandles(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "5") String resolution,
            @RequestParam(defaultValue = "24") int hours) {
        log.info("GET /api/datasource/candles/{} (resolution={}, hours={})", symbol, resolution, hours);
        List<CandleDTO> candles = dataSourceManager.fetchCandles(symbol.toUpperCase(), resolution, hours);
        return ResponseEntity.ok(candles);
    }
}

