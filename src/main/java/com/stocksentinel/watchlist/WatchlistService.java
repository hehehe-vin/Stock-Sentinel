package com.stocksentinel.watchlist;

import com.stocksentinel.auth.UserEntity;
import com.stocksentinel.auth.UserRepository;
import com.stocksentinel.exception.ResourceNotFoundException;
import com.stocksentinel.stock.StockData;
import com.stocksentinel.stock.StockRepository;
import com.stocksentinel.watchlist.dto.WatchlistRequestDTO;
import com.stocksentinel.watchlist.dto.WatchlistResponseDTO;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WatchlistService {

    private static final Logger log = LoggerFactory.getLogger(WatchlistService.class);
    private static final DateTimeFormatter ADDED_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final StockRepository stockRepository;

    public WatchlistService(
            WatchlistRepository watchlistRepository,
            UserRepository userRepository,
            StockRepository stockRepository) {
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
        this.stockRepository = stockRepository;
    }

    private Long getCurrentUserId(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return user.getId();
    }

    private WatchlistResponseDTO enrichWithPrice(WatchlistResponseDTO dto) {
        List<StockData> recent = stockRepository.findTop50BySymbolOrderByTimestampDesc(dto.getSymbol());

        if (!recent.isEmpty()) {
            dto.setCurrentPrice(recent.get(0).getPrice());
        }

        if (recent.size() >= 2) {
            double prev = recent.get(1).getPrice();
            double curr = recent.get(0).getPrice();
            double change = ((curr - prev) / prev) * 100.0;
            dto.setPriceChange(Math.round(change * 100.0) / 100.0);
        }

        return dto;
    }

    private WatchlistResponseDTO toDTO(WatchlistItem item) {
        return WatchlistResponseDTO.builder()
                .id(item.getId())
                .symbol(item.getSymbol())
                .alertThresholdHigh(item.getAlertThresholdHigh())
                .alertThresholdLow(item.getAlertThresholdLow())
                .addedAt(item.getAddedAt() == null ? null : item.getAddedAt().format(ADDED_AT_FORMAT))
                .build();
    }

    public List<WatchlistResponseDTO> getWatchlist(String email) {
        Long userId = getCurrentUserId(email);
        List<WatchlistResponseDTO> response = watchlistRepository.findByUserIdOrderByAddedAtDesc(userId).stream()
                .map(this::toDTO)
                .map(this::enrichWithPrice)
                .toList();
        log.info("Fetched watchlist for {} - count: {}", email, response.size());
        return response;
    }

    public WatchlistResponseDTO addToWatchlist(String email, WatchlistRequestDTO request) {
        Long userId = getCurrentUserId(email);
        String symbol = request.getSymbol().toUpperCase();

        if (watchlistRepository.existsByUserIdAndSymbol(userId, symbol)) {
            throw new RuntimeException("Stock already in your watchlist: " + symbol);
        }

        WatchlistItem item = WatchlistItem.builder()
                .userId(userId)
                .symbol(symbol)
                .alertThresholdHigh(request.getAlertThresholdHigh())
                .alertThresholdLow(request.getAlertThresholdLow())
                .build();

        WatchlistItem saved = watchlistRepository.save(item);
        log.info("User {} added {} to watchlist", email, symbol);
        return enrichWithPrice(toDTO(saved));
    }

    public WatchlistResponseDTO updateThresholds(String email, String symbol, WatchlistRequestDTO request) {
        Long userId = getCurrentUserId(email);
        String normalizedSymbol = symbol.toUpperCase();

        WatchlistItem item = watchlistRepository.findByUserIdAndSymbol(userId, normalizedSymbol)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Watchlist item not found: " + normalizedSymbol));

        item.setAlertThresholdHigh(request.getAlertThresholdHigh());
        item.setAlertThresholdLow(request.getAlertThresholdLow());

        WatchlistItem saved = watchlistRepository.save(item);
        log.info("User {} updated thresholds for {}", email, normalizedSymbol);
        return enrichWithPrice(toDTO(saved));
    }

    @Transactional
    public void removeFromWatchlist(String email, String symbol) {
        Long userId = getCurrentUserId(email);
        String normalizedSymbol = symbol.toUpperCase();

        if (!watchlistRepository.existsByUserIdAndSymbol(userId, normalizedSymbol)) {
            throw new ResourceNotFoundException("Watchlist item not found: " + normalizedSymbol);
        }

        watchlistRepository.deleteByUserIdAndSymbol(userId, normalizedSymbol);
        log.info("User {} removed {} from watchlist", email, normalizedSymbol);
    }
}
