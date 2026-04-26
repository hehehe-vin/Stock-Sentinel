package com.stocksentinel.datasource;

import com.stocksentinel.anomaly.AnomalyRecord;
import com.stocksentinel.anomaly.AnomalyService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class DataSourceManager {

    private static final Logger log = LoggerFactory.getLogger(DataSourceManager.class);

    private static final List<String> WATCHED_SYMBOLS =
            List.of("AAPL", "TSLA", "GOOGL", "MSFT", "AMZN", "NVDA");

    private final FinnhubService finnhubService;
    private final AlphaVantageService alphaVantageService;
    private final StockSimulatorService stockSimulatorService;
    private final AnomalyService anomalyService;

    // Caching state for immediate frontend response
    private volatile String cachedActiveSource = "Initializing...";
    private volatile List<LiveQuoteDTO> cachedQuotes = List.of();
    private volatile boolean forceSimulator = false;
    private volatile String cachedLastUpdated = null;

    public DataSourceManager(
            FinnhubService finnhubService,
            AlphaVantageService alphaVantageService,
            StockSimulatorService stockSimulatorService,
            AnomalyService anomalyService) {
        this.finnhubService = finnhubService;
        this.alphaVantageService = alphaVantageService;
        this.stockSimulatorService = stockSimulatorService;
        this.anomalyService = anomalyService;
    }

    @Scheduled(fixedDelay = 30000)
    public void pollLiveData() {
        log.info("Live data poll started...");

        if (forceSimulator) {
            log.info("Data source: SIMULATOR (Forced)");
            cachedActiveSource = "SIMULATOR";
            stockSimulatorService.generateAndSaveSimulatedData();
            cachedQuotes = stockSimulatorService.generateQuotes(WATCHED_SYMBOLS);
            processAnomalies();
            cachedLastUpdated = java.time.LocalDateTime.now().toString();
            log.info("Live data poll completed (Forced Simulator)");
            return;
        }

        if (finnhubService.isAvailable()) {
            log.info("Data source: FINNHUB");
            cachedActiveSource = "FINNHUB";
            finnhubService.fetchAndSaveMultiple(WATCHED_SYMBOLS);
            cachedQuotes = finnhubService.fetchQuotes(WATCHED_SYMBOLS);
            processAnomalies();
            cachedLastUpdated = java.time.LocalDateTime.now().toString();
            log.info("Live data poll completed");
            return;
        }

        log.warn("Finnhub unavailable, trying AlphaVantage...");
        if (alphaVantageService.isAvailable()) {
            log.info("Data source: ALPHAVANTAGE");
            cachedActiveSource = "ALPHAVANTAGE";
            for (String symbol : WATCHED_SYMBOLS) {
                alphaVantageService.fetchAndSave(symbol);
            }
            cachedQuotes = alphaVantageService.fetchQuotes(WATCHED_SYMBOLS);
            processAnomalies();
            cachedLastUpdated = java.time.LocalDateTime.now().toString();
            log.info("Live data poll completed");
            return;
        }

        log.warn("Both APIs unavailable, using SIMULATOR");
        cachedActiveSource = "SIMULATOR";
        stockSimulatorService.generateAndSaveSimulatedData();
        cachedQuotes = stockSimulatorService.generateQuotes(WATCHED_SYMBOLS);
        processAnomalies();
        cachedLastUpdated = java.time.LocalDateTime.now().toString();
        log.info("Live data poll completed");
    }

    private void processAnomalies() {
        for (String symbol : WATCHED_SYMBOLS) {
            List<AnomalyRecord> anomalies = anomalyService.analyzeStock(symbol);
            if (!anomalies.isEmpty()) {
                log.info("Anomalies detected for {}: {} records", symbol, anomalies.size());
            }
        }
    }

    public String getCurrentDataSource() {
        return cachedActiveSource;
    }

    public String getCachedLastUpdated() {
        return cachedLastUpdated;
    }

    public void setForceSimulator(boolean forceSimulator) {
        this.forceSimulator = forceSimulator;
        pollLiveData(); // Trigger immediate update
    }

    public boolean isForceSimulator() {
        return forceSimulator;
    }

    public String triggerManualPoll() {
        pollLiveData();
        return getCurrentDataSource();
    }

    public List<String> getWatchedSymbols() {
        return WATCHED_SYMBOLS;
    }

    /**
     * Fetch real-time quotes from the cache.
     * Instantaneous return.
     */
    public List<LiveQuoteDTO> fetchLiveQuotes() {
        return cachedQuotes;
    }

    /**
     * Fetch intraday candle data with fallback: Finnhub → AlphaVantage → Simulator.
     * No DB writes — purely for live chart display.
     */
    public List<CandleDTO> fetchCandles(String symbol, String resolution, int hours) {
        if (!forceSimulator) {
            if (finnhubService.isAvailable()) {
                long to = java.time.Instant.now().getEpochSecond();
                long from = to - (hours * 3600L);
                List<CandleDTO> candles = finnhubService.fetchCandles(symbol, resolution, from, to);
                
                // Weekend fallback: If empty, market might be closed. Look back 96 hours (4 days) to grab Friday data.
                if (candles.isEmpty()) {
                    long weekendFrom = to - (96 * 3600L);
                    candles = finnhubService.fetchCandles(symbol, resolution, weekendFrom, to);
                }
                
                if (!candles.isEmpty()) {
                    log.info("Candles source: FINNHUB ({} points for {})", candles.size(), symbol);
                    return candles;
                }
            }
            if (alphaVantageService.isAvailable()) {
                List<CandleDTO> candles = alphaVantageService.fetchCandles(symbol);
                if (!candles.isEmpty()) {
                    log.info("Candles source: ALPHAVANTAGE ({} points for {})", candles.size(), symbol);
                    return candles;
                }
            }
        }
        log.info("Candles source: SIMULATOR for {}", symbol);
        return stockSimulatorService.generateCandles(symbol, hours);
    }
}

