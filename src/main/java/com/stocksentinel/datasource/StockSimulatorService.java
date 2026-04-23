package com.stocksentinel.datasource;

import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class StockSimulatorService {

    private static final Logger log = LoggerFactory.getLogger(StockSimulatorService.class);

    private static final Map<String, Double> BASE_PRICES = new HashMap<>();
    static {
        BASE_PRICES.put("AAPL", 178.50);
        BASE_PRICES.put("TSLA", 245.30);
        BASE_PRICES.put("GOOGL", 141.20);
        BASE_PRICES.put("MSFT", 415.00);
        BASE_PRICES.put("AMZN", 185.50);
        BASE_PRICES.put("NFLX", 628.00);
        BASE_PRICES.put("META", 505.00);
        BASE_PRICES.put("NVDA", 875.00);
    }

    private final Random random = new Random();
    private int priceCallCount = 0;
    private int volumeCallCount = 0;

    private final StockRepository stockRepository;

    public StockSimulatorService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    public Double generateSimulatedPrice(String symbol) {
        Double basePrice = BASE_PRICES.getOrDefault(symbol, 100.0);
        double fluctuation = (random.nextDouble() - 0.5) * 0.04;

        if (++priceCallCount % 10 == 0) {
            fluctuation *= 15;
        }

        double price = basePrice * (1 + fluctuation);
        return Math.round(price * 100.0) / 100.0;
    }

    public Long generateSimulatedVolume(String symbol) {
        long baseVolume = 1_000_000L;
        long variation = random.nextInt(500_000);
        long volume = baseVolume + variation;

        if (++volumeCallCount % 10 == 0) {
            volume *= 8;
        }

        return volume;
    }

    public List<StockData> generateAndSaveSimulatedData() {
        List<StockData> results = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (String symbol : BASE_PRICES.keySet()) {
            Double price = generateSimulatedPrice(symbol);
            Long volume = generateSimulatedVolume(symbol);

            if (!stockRepository.existsBySymbolAndTimestamp(symbol, now)) {
                StockData stockData = StockData.builder()
                        .symbol(symbol)
                        .price(price)
                        .volume(volume)
                        .timestamp(now)
                        .source("SIMULATOR")
                        .build();

                stockRepository.save(stockData);
                results.add(stockData);
            }
        }

        log.debug("Simulator generated {} data points", results.size());
        return results;
    }

    public List<String> getAvailableSymbols() {
        return new ArrayList<>(BASE_PRICES.keySet());
    }

    // ==================== READ-ONLY METHODS (no DB writes) ====================

    /**
     * Generate a single live quote without saving to DB.
     */
    public LiveQuoteDTO generateQuote(String symbol) {
        Double basePrice = BASE_PRICES.getOrDefault(symbol.toUpperCase(), 100.0);
        double price = generateSimulatedPrice(symbol);
        double change = price - basePrice;
        double changePct = (change / basePrice) * 100;
        double high = price * (1 + random.nextDouble() * 0.01);
        double low = price * (1 - random.nextDouble() * 0.01);

        return new LiveQuoteDTO(
            symbol.toUpperCase(), price, 
            Math.round(change * 100.0) / 100.0,
            Math.round(changePct * 100.0) / 100.0,
            Math.round(high * 100.0) / 100.0,
            Math.round(low * 100.0) / 100.0,
            Math.round(basePrice * 100.0) / 100.0,
            basePrice
        );
    }

    public List<LiveQuoteDTO> generateQuotes(List<String> symbols) {
        List<LiveQuoteDTO> quotes = new ArrayList<>();
        for (String symbol : symbols) {
            quotes.add(generateQuote(symbol));
        }
        return quotes;
    }

    /**
     * Generate synthetic intraday candle data (random walk from base price).
     * Creates realistic-looking chart data for offline/demo mode.
     */
    public List<CandleDTO> generateCandles(String symbol, int hours) {
        List<CandleDTO> candles = new ArrayList<>();
        double basePrice = BASE_PRICES.getOrDefault(symbol.toUpperCase(), 100.0);
        long now = Instant.now().getEpochSecond();
        long start = now - (hours * 3600L);
        int intervalSeconds = 300; // 5-minute candles

        double currentPrice = basePrice;

        for (long t = start; t <= now; t += intervalSeconds) {
            // Random walk
            double drift = (random.nextDouble() - 0.48) * 0.003; // slight upward bias
            double volatility = (random.nextDouble() - 0.5) * 0.01;
            currentPrice = currentPrice * (1 + drift + volatility);

            double open = currentPrice * (1 + (random.nextDouble() - 0.5) * 0.002);
            double close = currentPrice;
            double high = Math.max(open, close) * (1 + random.nextDouble() * 0.003);
            double low = Math.min(open, close) * (1 - random.nextDouble() * 0.003);
            long volume = 500_000L + random.nextInt(1_500_000);

            candles.add(new CandleDTO(
                symbol.toUpperCase(), t,
                Math.round(open * 100.0) / 100.0,
                Math.round(high * 100.0) / 100.0,
                Math.round(low * 100.0) / 100.0,
                Math.round(close * 100.0) / 100.0,
                volume
            ));
        }

        log.info("Simulator generated {} candles for {}", candles.size(), symbol);
        return candles;
    }
}

