package com.stocksentinel.alert;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlertRepository extends JpaRepository<AlertRecord, Long> {

    List<AlertRecord> findAllByOrderByCreatedAtDesc();

    List<AlertRecord> findBySymbolOrderByCreatedAtDesc(String symbol);

    List<AlertRecord> findByRecipientEmailOrderByCreatedAtDesc(String email);

    long countByEmailSent(boolean emailSent);
}
