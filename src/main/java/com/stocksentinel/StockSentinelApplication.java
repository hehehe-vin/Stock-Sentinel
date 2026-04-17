package com.stocksentinel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StockSentinelApplication implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(StockSentinelApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(StockSentinelApplication.class, args);
    }

    @Override
    public void run(String... args) {
        log.info("========================================");
        log.info("  StockSentinel is starting up...");
        log.info("  Swagger UI: http://localhost:8080/swagger-ui.html");
        log.info("  H2 Console: http://localhost:8080/h2-console");
        log.info("========================================");
    }
}
