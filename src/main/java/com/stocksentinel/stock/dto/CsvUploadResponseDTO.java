package com.stocksentinel.stock.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvUploadResponseDTO {

    private int totalRows;
    private int importedRows;
    private int skippedRows;
    private String message;
    private List<String> errors;
}
