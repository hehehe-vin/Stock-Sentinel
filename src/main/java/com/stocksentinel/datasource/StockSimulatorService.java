package com.stocksentinel.datasource;

import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import java.time.LocalDateTime;
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
}
