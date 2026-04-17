package com.stocksentinel.anomaly;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AnomalyRepository extends JpaRepository<AnomalyRecord, Long> {

    List<AnomalyRecord> findBySymbolOrderByTimestampDesc(String symbol);

    List<AnomalyRecord> findBySeverityOrderByTimestampDesc(String severity);

    List<AnomalyRecord> findAllByOrderByTimestampDesc();

    List<AnomalyRecord> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime start, LocalDateTime end);

    List<AnomalyRecord> findBySymbolAndTimestampBetweenOrderByTimestampDesc(
            String symbol,
            LocalDateTime start,
            LocalDateTime end);

    long countBySeverity(String severity);

    @Query("SELECT COUNT(a) FROM AnomalyRecord a WHERE a.timestamp >= :since")
    long countRecentAnomalies(@Param("since") LocalDateTime since);
}
