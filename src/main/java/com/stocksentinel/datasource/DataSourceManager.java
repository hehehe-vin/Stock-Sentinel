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

    @Scheduled(fixedDelay = 60000)
    public void pollLiveData() {
        log.info("Live data poll started...");

        if (finnhubService.isAvailable()) {
            log.info("Data source: FINNHUB");
            finnhubService.fetchAndSaveMultiple(WATCHED_SYMBOLS);
            for (String symbol : WATCHED_SYMBOLS) {
                List<AnomalyRecord> anomalies = anomalyService.analyzeStock(symbol);
                if (!anomalies.isEmpty()) {
                    log.info("Anomalies detected for {}: {} records", symbol, anomalies.size());
                }
            }
            log.info("Live data poll completed");
            return;
        }

        log.warn("Finnhub unavailable, trying AlphaVantage...");
        if (alphaVantageService.isAvailable()) {
            log.info("Data source: ALPHAVANTAGE");
            for (String symbol : WATCHED_SYMBOLS) {
                alphaVantageService.fetchAndSave(symbol);
            }
            for (String symbol : WATCHED_SYMBOLS) {
                List<AnomalyRecord> anomalies = anomalyService.analyzeStock(symbol);
                if (!anomalies.isEmpty()) {
                    log.info("Anomalies detected for {}: {} records", symbol, anomalies.size());
                }
            }
            log.info("Live data poll completed");
            return;
        }

        log.warn("Both APIs unavailable, using SIMULATOR");
        stockSimulatorService.generateAndSaveSimulatedData();
        for (String symbol : WATCHED_SYMBOLS) {
            List<AnomalyRecord> anomalies = anomalyService.analyzeStock(symbol);
            if (!anomalies.isEmpty()) {
                log.info("Anomalies detected for {}: {} records", symbol, anomalies.size());
            }
        }
        log.info("Live data poll completed");
    }

    public String getCurrentDataSource() {
        if (finnhubService.isAvailable()) {
            return "FINNHUB";
        }
        if (alphaVantageService.isAvailable()) {
            return "ALPHAVANTAGE";
        }
        return "SIMULATOR";
    }

    public String triggerManualPoll() {
        pollLiveData();
        return getCurrentDataSource();
    }

    public List<String> getWatchedSymbols() {
        return WATCHED_SYMBOLS;
    }
}
