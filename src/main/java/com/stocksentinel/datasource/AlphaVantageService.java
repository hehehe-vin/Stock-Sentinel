package com.stocksentinel.datasource;

import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
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
public class AlphaVantageService {

    private static final Logger log = LoggerFactory.getLogger(AlphaVantageService.class);

    @Value("${alphavantage.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final StockRepository stockRepository;

    public AlphaVantageService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    public List<StockData> fetchAndSave(String symbol) {
        try {
            String url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY"
                    + "&symbol=" + symbol
                    + "&interval=1min"
                    + "&apikey=" + apiKey;

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null) {
                return Collections.emptyList();
            }

            if (body.containsKey("Note") || body.containsKey("Information")) {
                log.warn("AlphaVantage API limit reached for symbol: {}", symbol);
                return Collections.emptyList();
            }

            Object timeSeriesObj = body.get("Time Series (1min)");
            if (timeSeriesObj == null) {
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            Map<String, Map<String, String>> timeSeries = (Map<String, Map<String, String>>) timeSeriesObj;
            List<StockData> results = new ArrayList<>();
            int count = 0;

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (Map.Entry<String, Map<String, String>> entry : timeSeries.entrySet()) {
                if (count >= 5) break;

                String timestampStr = entry.getKey();
                Map<String, String> values = entry.getValue();

                try {
                    Double price = Double.parseDouble(values.get("4. close"));
                    Long volume = Long.parseLong(values.get("5. volume"));
                    LocalDateTime timestamp = LocalDateTime.parse(timestampStr, formatter);

                    if (!stockRepository.existsBySymbolAndTimestamp(symbol, timestamp)) {
                        StockData stockData = StockData.builder()
                                .symbol(symbol.toUpperCase())
                                .price(price)
                                .volume(volume)
                                .timestamp(timestamp)
                                .source("ALPHAVANTAGE")
                                .build();

                        stockRepository.save(stockData);
                        results.add(stockData);
                        count++;
                    }
                } catch (Exception e) {
                    log.warn("Error parsing AlphaVantage record: {}", e.getMessage());
                    continue;
                }
            }

            log.info("AlphaVantage saved {} records for {}", results.size(), symbol);
            return results;

        } catch (Exception e) {
            log.warn("AlphaVantage fetch failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    public boolean isAvailable() {
        try {
            String url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY"
                    + "&symbol=AAPL"
                    + "&interval=1min"
                    + "&apikey=" + apiKey;

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = responseEntity.getBody();

            return body != null && body.containsKey("Time Series (1min)");
        } catch (Exception e) {
            log.warn("AlphaVantage availability check failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Fetch a single live quote from AlphaVantage WITHOUT saving to DB.
     */
    public Optional<LiveQuoteDTO> fetchQuote(String symbol) {
        try {
            String url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE"
                    + "&symbol=" + symbol + "&apikey=" + apiKey;

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null || !body.containsKey("Global Quote")) return Optional.empty();

            @SuppressWarnings("unchecked")
            Map<String, String> quote = (Map<String, String>) body.get("Global Quote");
            if (quote == null || quote.isEmpty()) return Optional.empty();

            double price = Double.parseDouble(quote.getOrDefault("05. price", "0"));
            if (price == 0) return Optional.empty();

            double change = Double.parseDouble(quote.getOrDefault("09. change", "0"));
            double changePct = Double.parseDouble(quote.getOrDefault("10. change percent", "0%").replace("%", ""));
            double high = Double.parseDouble(quote.getOrDefault("03. high", "0"));
            double low = Double.parseDouble(quote.getOrDefault("04. low", "0"));
            double open = Double.parseDouble(quote.getOrDefault("02. open", "0"));
            double prevClose = Double.parseDouble(quote.getOrDefault("08. previous close", "0"));

            return Optional.of(new LiveQuoteDTO(symbol.toUpperCase(), price, change, changePct, high, low, open, prevClose));
        } catch (Exception e) {
            log.warn("AlphaVantage quote fetch failed for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    public List<LiveQuoteDTO> fetchQuotes(List<String> symbols) {
        List<LiveQuoteDTO> quotes = new ArrayList<>();
        for (String symbol : symbols) {
            fetchQuote(symbol).ifPresent(quotes::add);
            try { Thread.sleep(250); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
        return quotes;
    }

    /**
     * Fetch intraday candle data from AlphaVantage WITHOUT saving to DB.
     */
    @SuppressWarnings("unchecked")
    public List<CandleDTO> fetchCandles(String symbol) {
        List<CandleDTO> candles = new ArrayList<>();
        try {
            String url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY"
                    + "&symbol=" + symbol + "&interval=5min&apikey=" + apiKey;

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, null, new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();

            if (body == null || body.containsKey("Note") || body.containsKey("Information")) return candles;

            Object tsObj = body.get("Time Series (5min)");
            if (tsObj == null) return candles;

            Map<String, Map<String, String>> timeSeries = (Map<String, Map<String, String>>) tsObj;
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (Map.Entry<String, Map<String, String>> entry : timeSeries.entrySet()) {
                Map<String, String> vals = entry.getValue();
                LocalDateTime ldt = LocalDateTime.parse(entry.getKey(), formatter);
                long epoch = ldt.atZone(java.time.ZoneId.systemDefault()).toEpochSecond();

                candles.add(new CandleDTO(
                    symbol.toUpperCase(), epoch,
                    Double.parseDouble(vals.get("1. open")),
                    Double.parseDouble(vals.get("2. high")),
                    Double.parseDouble(vals.get("3. low")),
                    Double.parseDouble(vals.get("4. close")),
                    Long.parseLong(vals.get("5. volume"))
                ));
            }

            candles.sort((a, b) -> Long.compare(a.getTimestamp(), b.getTimestamp()));
            log.info("AlphaVantage candles fetched for {}: {} data points", symbol, candles.size());
        } catch (Exception e) {
            log.warn("AlphaVantage candle fetch failed for {}: {}", symbol, e.getMessage());
        }
        return candles;
    }
}

