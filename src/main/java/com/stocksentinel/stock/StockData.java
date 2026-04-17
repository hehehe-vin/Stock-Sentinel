package com.stocksentinel.stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stock_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private Long volume;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String source;

    @Column(nullable = true)
    private String notes;

    @PrePersist
    public void onPrePersist() {
        if (symbol != null) {
            symbol = symbol.toUpperCase();
        }
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
