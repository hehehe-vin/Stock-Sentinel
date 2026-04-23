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

    /**
     * Fetch a real-time quote from Finnhub WITHOUT saving to DB.
     * Used by the Live tab for real-time display.
     */
    public Optional<LiveQuoteDTO> fetchQuote(String symbol) {
        try {
            String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null) return Optional.empty();

            double price = body.get("c") != null ? ((Number) body.get("c")).doubleValue() : 0;
            if (price == 0) return Optional.empty();

            double change = body.get("d") != null ? ((Number) body.get("d")).doubleValue() : 0;
            double changePercent = body.get("dp") != null ? ((Number) body.get("dp")).doubleValue() : 0;
            double high = body.get("h") != null ? ((Number) body.get("h")).doubleValue() : 0;
            double low = body.get("l") != null ? ((Number) body.get("l")).doubleValue() : 0;
            double open = body.get("o") != null ? ((Number) body.get("o")).doubleValue() : 0;
            double previousClose = body.get("pc") != null ? ((Number) body.get("pc")).doubleValue() : 0;

            return Optional.of(new LiveQuoteDTO(symbol.toUpperCase(), price, change, changePercent, high, low, open, previousClose));
        } catch (Exception e) {
            log.warn("Finnhub quote fetch failed for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Fetch real-time quotes for multiple symbols WITHOUT saving to DB.
     */
    public List<LiveQuoteDTO> fetchQuotes(List<String> symbols) {
        List<LiveQuoteDTO> quotes = new ArrayList<>();
        for (String symbol : symbols) {
            fetchQuote(symbol).ifPresent(quotes::add);
            try {
                Thread.sleep(200); // Finnhub rate limit
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        return quotes;
    }

    /**
     * Fetch intraday candle data from Finnhub WITHOUT saving to DB.
     * Returns OHLCV data for the given time range.
     */
    @SuppressWarnings("unchecked")
    public List<CandleDTO> fetchCandles(String symbol, String resolution, long from, long to) {
        List<CandleDTO> candles = new ArrayList<>();
        try {
            String url = "https://finnhub.io/api/v1/stock/candle?symbol=" + symbol
                    + "&resolution=" + resolution
                    + "&from=" + from + "&to=" + to + "&token=" + apiKey;

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null || !"ok".equals(body.get("s"))) {
                log.warn("Finnhub candle response not ok for {}", symbol);
                return candles;
            }

            List<Number> closes = (List<Number>) body.get("c");
            List<Number> highs = (List<Number>) body.get("h");
            List<Number> lows = (List<Number>) body.get("l");
            List<Number> opens = (List<Number>) body.get("o");
            List<Number> volumes = (List<Number>) body.get("v");
            List<Number> timestamps = (List<Number>) body.get("t");

            if (closes == null || timestamps == null) return candles;

            for (int i = 0; i < closes.size(); i++) {
                candles.add(new CandleDTO(
                    symbol.toUpperCase(),
                    timestamps.get(i).longValue(),
                    opens.get(i).doubleValue(),
                    highs.get(i).doubleValue(),
                    lows.get(i).doubleValue(),
                    closes.get(i).doubleValue(),
                    volumes.get(i).longValue()
                ));
            }

            log.info("Finnhub candles fetched for {}: {} data points", symbol, candles.size());
        } catch (Exception e) {
            log.warn("Finnhub candle fetch failed for {}: {}", symbol, e.getMessage());
        }
        return candles;
    }
}

