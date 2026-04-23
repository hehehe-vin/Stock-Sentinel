package com.stocksentinel.stock;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StockRepository extends JpaRepository<StockData, Long> {

    List<StockData> findBySymbolOrderByTimestampDesc(String symbol);

    List<StockData> findBySymbolAndTimestampBetweenOrderByTimestampAsc(
            String symbol,
            LocalDateTime start,
            LocalDateTime end);

    List<StockData> findTop50BySymbolOrderByTimestampDesc(String symbol);

    boolean existsBySymbolAndTimestamp(String symbol, LocalDateTime timestamp);

    List<StockData> findAllByOrderByTimestampDesc();

    @Query("SELECT DISTINCT s.symbol FROM StockData s ORDER BY s.symbol ASC")
    List<String> findAllDistinctSymbols();

    @Modifying
    @Transactional
    @Query("DELETE FROM StockData s WHERE s.source = :source")
    int deleteBySource(@Param("source") String source);
}

