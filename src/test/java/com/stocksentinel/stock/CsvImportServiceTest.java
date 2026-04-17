package com.stocksentinel.stock;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.stocksentinel.exception.InvalidCsvException;
import com.stocksentinel.stock.dto.CsvUploadResponseDTO;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CsvImportServiceTest {

    @Mock
    private StockRepository stockRepository;

    @InjectMocks
    private CsvImportService csvImportService;

    @Test
    @DisplayName("Should throw InvalidCsvException for empty file")
    void shouldThrowForEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "stocks.csv", "text/csv", new byte[0]);

        assertThrows(InvalidCsvException.class, () -> csvImportService.importCsv(emptyFile));
    }

    @Test
    @DisplayName("Should throw InvalidCsvException for non-CSV file")
    void shouldThrowForNonCsvFile() {
        MockMultipartFile txtFile = new MockMultipartFile(
                "file", "data.txt", "text/plain", "some content".getBytes());

        assertThrows(InvalidCsvException.class, () -> csvImportService.importCsv(txtFile));
    }

    @Test
    @DisplayName("Should import valid CSV successfully")
    void shouldImportValidCsvSuccessfully() {
        String csvContent = "symbol,price,volume,timestamp\nAAPL,178.50,1200000,2024-01-15T09:30:00";
        MockMultipartFile csvFile = new MockMultipartFile(
                "file", "stocks.csv", "text/csv", csvContent.getBytes());

        when(stockRepository.existsBySymbolAndTimestamp(
                eq("AAPL"), any(LocalDateTime.class))).thenReturn(false);
        when(stockRepository.save(any(StockData.class))).thenReturn(new StockData());

        CsvUploadResponseDTO result = csvImportService.importCsv(csvFile);

        assertEquals(1, result.getTotalRows());
        assertEquals(1, result.getImportedRows());
        assertEquals(0, result.getSkippedRows());
        verify(stockRepository, times(1)).save(any(StockData.class));
    }

    @Test
    @DisplayName("Should skip duplicate rows")
    void shouldSkipDuplicateRows() {
        String csvContent = "symbol,price,volume,timestamp\nAAPL,178.50,1200000,2024-01-15T09:30:00";
        MockMultipartFile csvFile = new MockMultipartFile(
                "file", "stocks.csv", "text/csv", csvContent.getBytes());

        when(stockRepository.existsBySymbolAndTimestamp(
                eq("AAPL"), any(LocalDateTime.class))).thenReturn(true);

        CsvUploadResponseDTO result = csvImportService.importCsv(csvFile);

        assertEquals(1, result.getTotalRows());
        assertEquals(0, result.getImportedRows());
        assertEquals(1, result.getSkippedRows());
        verify(stockRepository, never()).save(any(StockData.class));
    }
}
