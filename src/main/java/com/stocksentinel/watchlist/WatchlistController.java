package com.stocksentinel.watchlist;

import com.stocksentinel.watchlist.dto.WatchlistRequestDTO;
import com.stocksentinel.watchlist.dto.WatchlistResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/watchlist")
@Tag(name = "Watchlist", description = "User stock watchlist management")
public class WatchlistController {

    private static final Logger log = LoggerFactory.getLogger(WatchlistController.class);

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    private String getCurrentEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping
    @Operation(summary = "Get current user's watchlist with live prices")
    public ResponseEntity<List<WatchlistResponseDTO>> getMyWatchlist() {
        String email = getCurrentEmail();
        log.info("GET /api/watchlist - user: {}", email);
        return ResponseEntity.ok(watchlistService.getWatchlist(email));
    }

    @PostMapping
    @Operation(summary = "Add a stock to the current user's watchlist")
    public ResponseEntity<WatchlistResponseDTO> addToWatchlist(@Valid @RequestBody WatchlistRequestDTO request) {
        String email = getCurrentEmail();
        log.info("POST /api/watchlist - user: {}, symbol: {}", email, request.getSymbol());
        WatchlistResponseDTO response = watchlistService.addToWatchlist(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{symbol}")
    @Operation(summary = "Update alert thresholds for a watchlist stock")
    public ResponseEntity<WatchlistResponseDTO> updateThresholds(
            @PathVariable String symbol,
            @Valid @RequestBody WatchlistRequestDTO request) {
        String email = getCurrentEmail();
        log.info("PUT /api/watchlist/{} - user: {}", symbol, email);
        return ResponseEntity.ok(watchlistService.updateThresholds(email, symbol, request));
    }

    @DeleteMapping("/{symbol}")
    @Operation(summary = "Remove a stock from the current user's watchlist")
    public ResponseEntity<Map<String, String>> removeFromWatchlist(@PathVariable String symbol) {
        String email = getCurrentEmail();
        log.info("DELETE /api/watchlist/{} - user: {}", symbol, email);
        watchlistService.removeFromWatchlist(email, symbol);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Removed " + symbol + " from watchlist");
        return ResponseEntity.ok(response);
    }
}
