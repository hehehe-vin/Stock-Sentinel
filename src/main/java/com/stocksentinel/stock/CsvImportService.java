package com.stocksentinel.stock;

import com.opencsv.CSVReader;
import com.stocksentinel.exception.InvalidCsvException;
import com.stocksentinel.stock.dto.CsvUploadResponseDTO;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CsvImportService {

    private static final Logger log = LoggerFactory.getLogger(CsvImportService.class);
    private static final DateTimeFormatter CSV_TIMESTAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final StockRepository stockRepository;

    public CsvImportService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    public CsvUploadResponseDTO importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidCsvException("Uploaded file is empty");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.endsWith(".csv")) {
            throw new InvalidCsvException("File must be a .csv file");
        }

        int totalRows = 0;
        int importedRows = 0;
        int skippedRows = 0;
        List<String> errors = new ArrayList<>();

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            String[] header = reader.readNext();
            List<String> expectedHeader = Arrays.asList("symbol", "price", "volume", "timestamp");

            if (header == null || header.length != 4 || !expectedHeader.equals(Arrays.asList(header))) {
                throw new InvalidCsvException("CSV must have columns: symbol, price, volume, timestamp");
            }

            String[] row;
            int lineNumber = 1;
            while ((row = reader.readNext()) != null) {
                lineNumber++;
                totalRows++;

                try {
                    if (row.length != 4) {
                        throw new IllegalArgumentException(
                                "Line " + lineNumber + ": expected 4 columns, found " + row.length);
                    }

                    String symbol = row[0].trim().toUpperCase();
                    if (symbol.isEmpty()) {
                        throw new IllegalArgumentException("Line " + lineNumber + ": symbol cannot be empty");
                    }

                    Double price = Double.parseDouble(row[1].trim());
                    if (price <= 0) {
                        throw new IllegalArgumentException(
                                "Line " + lineNumber + ": price must be greater than 0");
                    }

                    Long volume = Long.parseLong(row[2].trim());
                    if (volume < 0) {
                        throw new IllegalArgumentException(
                                "Line " + lineNumber + ": volume cannot be negative");
                    }

                    LocalDateTime timestamp = LocalDateTime.parse(row[3].trim(), CSV_TIMESTAMP_FORMAT);

                    if (stockRepository.existsBySymbolAndTimestamp(symbol, timestamp)) {
                        skippedRows++;
                        continue;
                    }

                    StockData stockData = StockData.builder()
                            .symbol(symbol)
                            .price(price)
                            .volume(volume)
                            .timestamp(timestamp)
                            .source("CSV")
                            .build();

                    stockRepository.save(stockData);
                    importedRows++;
                    log.debug("Imported row {}: {} at {}", lineNumber, symbol, price);
                } catch (Exception e) {
                    skippedRows++;
                    errors.add(e.getMessage());
                    log.warn("Skipped row {}: {}", lineNumber, e.getMessage());
                }
            }
        } catch (InvalidCsvException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidCsvException("Failed to process CSV file: " + e.getMessage());
        }

        log.info("CSV import complete — total: {}, imported: {}, skipped: {}", totalRows, importedRows, skippedRows);

        return CsvUploadResponseDTO.builder()
                .totalRows(totalRows)
                .importedRows(importedRows)
                .skippedRows(skippedRows)
                .message("CSV imported successfully. " + importedRows + " rows added to database.")
                .errors(errors)
                .build();
    }
}
