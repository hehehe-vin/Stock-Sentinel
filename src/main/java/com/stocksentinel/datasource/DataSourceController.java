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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ResponseEntity<Map<String, String>> getCurrentSource() {
        log.info("GET /api/datasource/status");
        Map<String, String> response = new HashMap<>();
        response.put("activeSource", dataSourceManager.getCurrentDataSource());
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
    public ResponseEntity<Map<String, String>> triggerManualPoll() {
        log.info("POST /api/datasource/poll — manual poll triggered");
        String dataSource = dataSourceManager.triggerManualPoll();
        Map<String, String> response = new HashMap<>();
        response.put("message", "Manual poll triggered successfully");
        response.put("dataSource", dataSource);
        return ResponseEntity.ok(response);
    }
}
