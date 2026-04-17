package com.stocksentinel.stock;

import com.stocksentinel.exception.ResourceNotFoundException;
import com.stocksentinel.stock.dto.CsvUploadResponseDTO;
import com.stocksentinel.stock.dto.StockResponseDTO;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);
    private static final DateTimeFormatter RESPONSE_TIMESTAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final StockRepository stockRepository;
    private final CsvImportService csvImportService;

    public StockService(StockRepository stockRepository, CsvImportService csvImportService) {
        this.stockRepository = stockRepository;
        this.csvImportService = csvImportService;
    }

    public StockResponseDTO toDTO(StockData stock) {
        return StockResponseDTO.builder()
                .id(stock.getId())
                .symbol(stock.getSymbol())
                .price(stock.getPrice())
                .volume(stock.getVolume())
                .timestamp(stock.getTimestamp().format(RESPONSE_TIMESTAMP_FORMAT))
                .source(stock.getSource())
                .notes(stock.getNotes())
                .build();
    }

    public List<StockResponseDTO> getAllStocks() {
        List<StockData> list = stockRepository.findAllByOrderByTimestampDesc();
        log.info("Fetching all stocks — count: {}", list.size());
        return list.stream().map(this::toDTO).toList();
    }

    public List<StockResponseDTO> getStockBySymbol(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        List<StockData> stocks = stockRepository.findBySymbolOrderByTimestampDesc(normalizedSymbol);
        if (stocks.isEmpty()) {
            throw new ResourceNotFoundException("No data found for symbol: " + normalizedSymbol);
        }
        log.info("Fetching stock data for: {}", normalizedSymbol);
        return stocks.stream().map(this::toDTO).toList();
    }

    public List<String> getAllSymbols() {
        log.info("Fetching all distinct symbols");
        return stockRepository.findAllDistinctSymbols();
    }

    public CsvUploadResponseDTO uploadCsv(MultipartFile file) {
        log.info("CSV upload initiated — filename: {}", file.getOriginalFilename());
        return csvImportService.importCsv(file);
    }

    public List<StockResponseDTO> getStocksBySymbolAndDateRange(String symbol, LocalDateTime start, LocalDateTime end) {
        String normalizedSymbol = symbol.toUpperCase();
        List<StockData> stocks = stockRepository.findBySymbolAndTimestampBetweenOrderByTimestampAsc(
                normalizedSymbol,
                start,
                end);
        if (stocks.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No data found for symbol: " + normalizedSymbol + " in given date range");
        }
        return stocks.stream().map(this::toDTO).toList();
    }

    public List<StockResponseDTO> getLatest50BySymbol(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        List<StockData> stocks = stockRepository.findTop50BySymbolOrderByTimestampDesc(normalizedSymbol);
        if (stocks.isEmpty()) {
            throw new ResourceNotFoundException("No data found for symbol: " + normalizedSymbol);
        }
        return stocks.stream().map(this::toDTO).toList();
    }
}
