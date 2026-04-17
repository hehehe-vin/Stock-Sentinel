package com.stocksentinel.datasource;

import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FinnhubService {

    private static final Logger log = LoggerFactory.getLogger(FinnhubService.class);

    @Value("${finnhub.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final StockRepository stockRepository;

    public FinnhubService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    public Optional<StockData> fetchAndSave(String symbol) {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null) {
                return Optional.empty();
            }

            Object priceObj = body.get("c");
            if (priceObj == null) {
                return Optional.empty();
            }

            Double price = ((Number) priceObj).doubleValue();
            if (price == 0.0) {
                return Optional.empty();
            }

            Object volumeObj = body.get("v");
            Long volume = volumeObj != null ? ((Number) volumeObj).longValue() : 0L;

            LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);

            if (stockRepository.existsBySymbolAndTimestamp(symbol, now)) {
                return Optional.empty();
            }

            StockData stockData = StockData.builder()
                    .symbol(symbol.toUpperCase())
                    .price(price)
                    .volume(volume)
                    .timestamp(now)
                    .source("FINNHUB")
                    .build();

            stockRepository.save(stockData);
            log.info("Finnhub saved: {} at price {}", symbol, price);
            return Optional.of(stockData);

        } catch (Exception e) {
            log.warn("Finnhub fetch failed for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    public List<StockData> fetchAndSaveMultiple(List<String> symbols) {
        List<StockData> results = new ArrayList<>();

        for (String symbol : symbols) {
            Optional<StockData> result = fetchAndSave(symbol);
            result.ifPresent(results::add);

            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Finnhub fetch interrupted: {}", e.getMessage());
            }
        }

        log.info("Finnhub fetched {} symbols successfully", results.size());
        return results;
    }

    public boolean isAvailable() {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=AAPL&token=" + apiKey;
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body != null) {
                Object priceObj = body.get("c");
                if (priceObj != null) {
                    Double price = ((Number) priceObj).doubleValue();
                    return price > 0;
                }
            }
            return false;
        } catch (Exception e) {
            log.warn("Finnhub availability check failed: {}", e.getMessage());
            return false;
        }
    }
}
