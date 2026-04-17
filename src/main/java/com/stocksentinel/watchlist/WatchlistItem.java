package com.stocksentinel.watchlist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "watchlist_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "symbol"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = true)
    private Double alertThresholdHigh;

    @Column(nullable = true)
    private Double alertThresholdLow;

    @Column(nullable = false)
    private LocalDateTime addedAt;

    @PrePersist
    public void onPrePersist() {
        if (symbol != null) {
            symbol = symbol.toUpperCase();
        }
        if (addedAt == null) {
            addedAt = LocalDateTime.now();
        }
    }
}
