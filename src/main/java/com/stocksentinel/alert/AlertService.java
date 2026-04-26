package com.stocksentinel.alert;

import com.stocksentinel.anomaly.AnomalyRecord;
import com.stocksentinel.auth.UserEntity;
import com.stocksentinel.auth.UserRepository;
import com.stocksentinel.exception.ResourceNotFoundException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);
    private static final DateTimeFormatter CREATED_AT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AlertRepository alertRepository;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public AlertService(
            AlertRepository alertRepository,
            EmailService emailService,
            UserRepository userRepository) {
        this.alertRepository = alertRepository;
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    private AlertResponseDTO toDTO(AlertRecord alert) {
        return AlertResponseDTO.builder()
                .id(alert.getId())
                .symbol(alert.getSymbol())
                .alertType(alert.getAlertType())
                .severity(alert.getSeverity())
                .message(alert.getMessage())
                .recipientEmail(alert.getRecipientEmail())
                .emailSent(alert.isEmailSent())
                .createdAt(alert.getCreatedAt() == null
                        ? null
                        : alert.getCreatedAt().format(CREATED_AT_FORMATTER))
                .build();
    }

    public AlertRecord createAlertFromAnomaly(AnomalyRecord anomaly) {
        String message = String.format(
                "ALERT: %s anomaly detected for %s. Severity: %s. Price at detection: $%.2f.",
                anomaly.getType(), anomaly.getSymbol(), anomaly.getSeverity(), anomaly.getPriceAtDetection());

        if (anomaly.getZScore() != null) {
            message += String.format(" Z-Score: %.2f.", anomaly.getZScore());
        }
        if (anomaly.getDeviation() != null) {
            message += String.format(" Deviation: %.2f%%.", anomaly.getDeviation());
        }

        int anomalyRank = getSeverityRank(anomaly.getSeverity());
        List<UserEntity> users = userRepository.findAll();
        AlertRecord lastCreated = null;

        for (UserEntity user : users) {
            String subject = "StockSentinel Alert: " + anomaly.getSymbol() + " - " + anomaly.getType();
            boolean sent = false;

            if (user.isEmailAlertsEnabled()) {
                int userThreshold = getSeverityRank(user.getMinimumAlertSeverity());
                if (anomalyRank >= userThreshold) {
                    sent = emailService.sendAlertEmail(user.getEmail(), subject, message);
                } else {
                    log.debug("Skipping email for {} (anomaly severity {} < user threshold {})",
                            user.getEmail(), anomaly.getSeverity(), user.getMinimumAlertSeverity());
                }
            } else {
                log.debug("Skipping email for {} (alerts disabled)", user.getEmail());
            }

            AlertRecord alert = AlertRecord.builder()
                    .symbol(anomaly.getSymbol())
                    .alertType(anomaly.getType())
                    .severity(anomaly.getSeverity())
                    .message(message)
                    .recipientEmail(user.getEmail())
                    .emailSent(sent)
                    .build();

            lastCreated = alertRepository.save(alert);
            log.info(
                    "Alert created for {} - email {}: {}",
                    user.getEmail(),
                    sent ? "sent" : "skipped/failed",
                    anomaly.getSymbol());
        }

        return lastCreated;
    }

    private int getSeverityRank(String severity) {
        if (severity == null) return 0;
        switch (severity.toUpperCase()) {
            case "EXTREME": return 4;
            case "HIGH": return 3;
            case "MEDIUM": return 2;
            case "LOW": return 1;
            default: return 0;
        }
    }

    public List<AlertResponseDTO> getAllAlerts() {
        List<AlertRecord> alerts = alertRepository.findAllByOrderByCreatedAtDesc();
        log.info("Fetching all alerts - count: {}", alerts.size());
        return alerts.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<AlertResponseDTO> getAlertsBySymbol(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        List<AlertRecord> alerts = alertRepository.findBySymbolOrderByCreatedAtDesc(normalizedSymbol);
        if (alerts.isEmpty()) {
            throw new ResourceNotFoundException("No alerts found for: " + normalizedSymbol);
        }
        return alerts.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<AlertResponseDTO> getAlertsByUser(String email) {
        return alertRepository.findByRecipientEmailOrderByCreatedAtDesc(email).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
