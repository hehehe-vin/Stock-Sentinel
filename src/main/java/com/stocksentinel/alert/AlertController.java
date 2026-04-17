package com.stocksentinel.alert;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alerts")
@Tag(name = "Alerts", description = "Email alert records and history")
public class AlertController {

    private static final Logger log = LoggerFactory.getLogger(AlertController.class);

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    @Operation(summary = "Get all alert records")
    public ResponseEntity<List<AlertResponseDTO>> getAllAlerts() {
        log.info("GET /api/alerts");
        return ResponseEntity.ok(alertService.getAllAlerts());
    }

    @GetMapping("/{symbol}")
    @Operation(summary = "Get alerts for a specific stock symbol")
    public ResponseEntity<List<AlertResponseDTO>> getAlertsBySymbol(@PathVariable String symbol) {
        log.info("GET /api/alerts/{}", symbol);
        return ResponseEntity.ok(alertService.getAlertsBySymbol(symbol));
    }

    @GetMapping("/my")
    @Operation(summary = "Get alerts for the currently logged-in user")
    public ResponseEntity<List<AlertResponseDTO>> getMyAlerts() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("GET /api/alerts/my - user: {}", email);
        return ResponseEntity.ok(alertService.getAlertsByUser(email));
    }
}
