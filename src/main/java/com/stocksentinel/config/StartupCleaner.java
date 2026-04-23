package com.stocksentinel.config;

import com.stocksentinel.stock.StockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class StartupCleaner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupCleaner.class);

    private final StockRepository stockRepository;

    public StartupCleaner(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    @Override
    public void run(String... args) {
        int finnhub = stockRepository.deleteBySource("FINNHUB");
        int alpha = stockRepository.deleteBySource("ALPHAVANTAGE");
        int sim = stockRepository.deleteBySource("SIMULATOR");
        log.info("========================================");
        log.info("  Startup cleanup complete:");
        log.info("    FINNHUB entries removed: {}", finnhub);
        log.info("    ALPHAVANTAGE entries removed: {}", alpha);
        log.info("    SIMULATOR entries removed: {}", sim);
        log.info("  Preserved: Users, Anomalies, CSV data, Watchlist, Alerts");
        log.info("========================================");
    }
}
