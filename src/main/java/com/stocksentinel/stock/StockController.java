package com.stocksentinel.stock;

import com.stocksentinel.stock.dto.CsvUploadResponseDTO;
import com.stocksentinel.stock.dto.StockResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/stocks")
@Tag(name = "Stocks", description = "Stock data management and CSV upload")
public class StockController {

    private static final Logger log = LoggerFactory.getLogger(StockController.class);

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    @Operation(summary = "Get all stock data")
    public ResponseEntity<List<StockResponseDTO>> getAllStocks() {
        log.info("GET /api/stocks");
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    @GetMapping("/{symbol}")
    @Operation(summary = "Get stock data by symbol")
    public ResponseEntity<List<StockResponseDTO>> getStockBySymbol(@PathVariable String symbol) {
        log.info("GET /api/stocks/{}", symbol);
        return ResponseEntity.ok(stockService.getStockBySymbol(symbol));
    }

    @GetMapping("/symbols")
    @Operation(summary = "Get all distinct stock symbols")
    public ResponseEntity<List<String>> getAllSymbols() {
        log.info("GET /api/stocks/symbols");
        return ResponseEntity.ok(stockService.getAllSymbols());
    }

    @PostMapping("/upload-csv")
    @Operation(summary = "Upload a CSV file to import stock data")
    public ResponseEntity<CsvUploadResponseDTO> uploadCsv(@RequestParam("file") MultipartFile file) {
        log.info("POST /api/stocks/upload-csv — file: {}", file.getOriginalFilename());
        return ResponseEntity.ok(stockService.uploadCsv(file));
    }

    @GetMapping("/{symbol}/range")
    @Operation(summary = "Get stock data by symbol and date range")
    public ResponseEntity<List<StockResponseDTO>> getStocksByDateRange(
            @PathVariable String symbol,
            @RequestParam String start,
            @RequestParam String end) {
        LocalDateTime startDt = LocalDateTime.parse(start);
        LocalDateTime endDt = LocalDateTime.parse(end);
        return ResponseEntity.ok(stockService.getStocksBySymbolAndDateRange(symbol, startDt, endDt));
    }
}
