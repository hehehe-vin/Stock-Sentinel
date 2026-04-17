# StockSentinel — Remaining Prompts (7–18)

## Verification Summary (Prompts 1–6)

All 6 completed prompts verified working:

| Test | Result |
|---|---|
| `mvn clean compile` | ✅ Zero errors |
| App startup | ✅ Tomcat on port 8080, H2 tables created |
| Finnhub polling | ✅ Live data for AAPL, TSLA, GOOGL, MSFT, AMZN, NVDA |
| `POST /api/auth/register` | ✅ JWT token returned |
| `POST /api/auth/login` | ✅ JWT token returned |
| `GET /api/stocks/symbols` | ✅ Returns 6 symbols |
| `GET /api/datasource/status` | ✅ `{"activeSource": "FINNHUB"}` |
| `POST /api/stocks/upload-csv` | ✅ 20 rows imported, 0 skipped |
| `POST /api/datasource/poll` | ✅ Manual poll triggers anomaly analysis |
| `GET /api/anomalies` | ✅ 3 MA_DEVIATION anomalies detected (AAPL, TSLA, GOOGL) |
| `GET /api/anomalies/count` | ✅ `highCount: 3, totalToday: 3` |
| Swagger UI | ✅ All 4 endpoint groups visible |

---

## PROMPT 7 — Alert Module (Email Notifications)

```
We are building StockSentinel — a Spring Boot anomaly detection system.
Base package: com.stocksentinel
All previous modules (config, exception, auth, stock, datasource, anomaly) already exist and work.
Do NOT modify any existing files unless explicitly told to in this prompt.

This prompt builds the alert module — when anomalies are detected,
email notifications are sent and alert records are stored in the database.

═══════════════════════════════════════════
PART 1 — ALERT ENTITY
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE AlertRecord.java:
- Annotated with @Entity, @Table(name = "alert_records")
- Use Lombok: @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
- Fields:
  - @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id
  - @Column(nullable = false)
    String symbol            ← stock symbol e.g. "AAPL"
  - @Column(nullable = false)
    String alertType         ← matches anomaly type: "PRICE_SPIKE", "PRICE_DROP", 
                                "VOLUME_SURGE", "MA_DEVIATION"
  - @Column(nullable = false)
    String severity          ← "HIGH", "MEDIUM", "LOW"
  - @Column(nullable = false, length = 1000)
    String message           ← human-readable alert message
  - @Column(nullable = false)
    String recipientEmail    ← email address alert was sent to
  - @Column(nullable = false)
    boolean emailSent        ← true if email was successfully delivered, false if failed
  - @Column(nullable = false)
    LocalDateTime createdAt
- Add @PrePersist method called onPrePersist():
  - Sets createdAt = LocalDateTime.now() if null

═══════════════════════════════════════════
PART 2 — ALERT REPOSITORY
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE AlertRepository.java:
- Extends JpaRepository<AlertRecord, Long>
- Annotated with @Repository
- Custom query methods:
  - List<AlertRecord> findAllByOrderByCreatedAtDesc()
    ← all alerts newest first
  - List<AlertRecord> findBySymbolOrderByCreatedAtDesc(String symbol)
    ← alerts for one symbol
  - List<AlertRecord> findByRecipientEmailOrderByCreatedAtDesc(String email)
    ← alerts sent to a specific user
  - long countByEmailSent(boolean emailSent)
    ← count of successfully sent / failed emails

═══════════════════════════════════════════
PART 3 — ALERT DTO
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE AlertResponseDTO.java:
- Use Lombok: @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
- Fields:
  - Long id
  - String symbol
  - String alertType
  - String severity
  - String message
  - String recipientEmail
  - boolean emailSent
  - String createdAt       ← formatted as "yyyy-MM-dd HH:mm:ss"

═══════════════════════════════════════════
PART 4 — EMAIL SERVICE
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE EmailService.java:
- Annotated with @Service
- Has a logger
- Inject JavaMailSender via constructor injection
- Read sender email: @Value("${spring.mail.username}") private String fromEmail

- Method — sendAlertEmail(String to, String subject, String body) returns boolean:
  Step 1: Wrap everything in try-catch
  Step 2: Create a SimpleMailMessage:
          SimpleMailMessage mail = new SimpleMailMessage()
          mail.setFrom(fromEmail)
          mail.setTo(to)
          mail.setSubject(subject)
          mail.setText(body)
  Step 3: Send: mailSender.send(mail)
  Step 4: Log: log.info("Alert email sent to {} — subject: {}", to, subject)
  Step 5: Return true

  On catch (Exception e):
  log.error("Failed to send email to {}: {}", to, e.getMessage())
  Return false
  ← The system should NOT crash if email fails to send.
  ← It just records emailSent=false in the database.

═══════════════════════════════════════════
PART 5 — ALERT SERVICE
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE AlertService.java:
- Annotated with @Service
- Has a logger
- Inject AlertRepository, EmailService, UserRepository via constructor injection

- Helper method — toDTO(AlertRecord alert) returns AlertResponseDTO:
  Converts entity to DTO, formats createdAt

- Method 1 — createAlertFromAnomaly(AnomalyRecord anomaly) returns AlertRecord:
  Step 1: Build a human-readable message:
          String message = String.format(
              "ALERT: %s anomaly detected for %s. Severity: %s. Price at detection: $%.2f.",
              anomaly.getType(), anomaly.getSymbol(), anomaly.getSeverity(),
              anomaly.getPriceAtDetection())
          If anomaly has zScore (not null):
              message += String.format(" Z-Score: %.2f.", anomaly.getZScore())
          If anomaly has deviation (not null):
              message += String.format(" Deviation: %.2f%%.", anomaly.getDeviation())

  Step 2: Get all registered user emails from UserRepository:
          List<UserEntity> users = userRepository.findAll()
          ← In a real system you'd only notify users who watch this symbol.
          ← For simplicity we notify all registered users.

  Step 3: For each user, create an AlertRecord and try to send email:
          for (UserEntity user : users) {
              String subject = "StockSentinel Alert: " + anomaly.getSymbol()
                               + " — " + anomaly.getType()
              boolean sent = emailService.sendAlertEmail(
                  user.getEmail(), subject, message)

              AlertRecord alert = AlertRecord.builder()
                  .symbol(anomaly.getSymbol())
                  .alertType(anomaly.getType())
                  .severity(anomaly.getSeverity())
                  .message(message)
                  .recipientEmail(user.getEmail())
                  .emailSent(sent)
                  .build()
              alertRepository.save(alert)
              log.info("Alert created for {} — email {}: {}",
                  user.getEmail(), sent ? "sent" : "failed", anomaly.getSymbol())
          }

  Step 4: Return the last created AlertRecord (or null if no users exist)

- Method 2 — getAllAlerts() returns List<AlertResponseDTO>:
  - Calls alertRepository.findAllByOrderByCreatedAtDesc()
  - Maps to DTOs
  - Log: log.info("Fetching all alerts — count: {}", list.size())

- Method 3 — getAlertsBySymbol(String symbol) returns List<AlertResponseDTO>:
  - Converts symbol to uppercase
  - Calls alertRepository.findBySymbolOrderByCreatedAtDesc(symbol)
  - If empty throw ResourceNotFoundException("No alerts found for: " + symbol)
  - Maps to DTOs

- Method 4 — getAlertsByUser(String email) returns List<AlertResponseDTO>:
  - Calls alertRepository.findByRecipientEmailOrderByCreatedAtDesc(email)
  - Maps to DTOs

═══════════════════════════════════════════
PART 6 — ALERT CONTROLLER
Location: src/main/java/com/stocksentinel/alert/
═══════════════════════════════════════════

CREATE AlertController.java:
- Annotated with @RestController, @RequestMapping("/api/alerts")
- Has a logger
- Inject AlertService via constructor injection
- Swagger: @Tag(name = "Alerts", description = "Email alert records and history")

- Endpoint 1 — getAllAlerts:
  - Method: GET
  - Path: /api/alerts
  - Returns: ResponseEntity<List<AlertResponseDTO>>
  - Calls alertService.getAllAlerts()
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Get all alert records")

- Endpoint 2 — getAlertsBySymbol:
  - Method: GET
  - Path: /api/alerts/{symbol}
  - Path variable: String symbol
  - Returns: ResponseEntity<List<AlertResponseDTO>>
  - Calls alertService.getAlertsBySymbol(symbol)
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Get alerts for a specific stock symbol")

- Endpoint 3 — getMyAlerts:
  - Method: GET
  - Path: /api/alerts/my
  - Gets the currently authenticated user's email from SecurityContextHolder:
    String email = SecurityContextHolder.getContext()
                   .getAuthentication().getName()
  - Returns: ResponseEntity<List<AlertResponseDTO>>
  - Calls alertService.getAlertsByUser(email)
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Get alerts for the currently logged-in user")

═══════════════════════════════════════════
PART 7 — UPDATE AnomalyService.java
Location: src/main/java/com/stocksentinel/anomaly/
═══════════════════════════════════════════

MODIFY AnomalyService.java — add the following:

- Add AlertService injection via constructor
  (add it as a new constructor parameter alongside existing injections)

- In the analyzeStock() method, AFTER each anomaly is saved 
  (after anomalyRepository.save(record)), add:
  
  try {
      alertService.createAlertFromAnomaly(record);
  } catch (Exception e) {
      log.warn("Failed to create alert for anomaly: {}", e.getMessage());
  }
  
  ← This is wrapped in try-catch so a failed email never prevents
  ← anomaly detection from continuing.

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- alert/AlertRecord.java exists with all 8 fields
- alert/AlertRepository.java exists with 4 query methods
- alert/AlertResponseDTO.java exists
- alert/EmailService.java exists with sendAlertEmail method
- alert/AlertService.java exists with createAlertFromAnomaly and 3 getter methods
- alert/AlertController.java exists with 3 endpoints
- anomaly/AnomalyService.java updated with AlertService injection
  and alert creation after anomaly detection
- Run: mvn clean compile — zero errors
- Run the application and test in Swagger UI:
  1. Authorize with JWT token
  2. Upload sample-stocks.csv
  3. POST /api/datasource/poll
  4. GET /api/alerts — should show alert records
     (emailSent may be false if Gmail credentials aren't configured yet — that's fine)
  5. GET /api/alerts/my — should show alerts for logged-in user
  6. Check logs for "Alert created for..." messages
```

---

## PROMPT 8 — Watchlist Module

```
We are building StockSentinel — a Spring Boot anomaly detection system.
Base package: com.stocksentinel
All previous modules (config, exception, auth, stock, datasource, anomaly, alert) 
already exist and work.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the watchlist module — users can save stocks they want to track,
and set personal alert thresholds per stock.

═══════════════════════════════════════════
PART 1 — WATCHLIST ITEM ENTITY
Location: src/main/java/com/stocksentinel/watchlist/
═══════════════════════════════════════════

CREATE WatchlistItem.java:
- Annotated with @Entity, @Table(name = "watchlist_items",
  uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "symbol"}))
  ← ensures a user can't add the same stock twice
- Use Lombok: @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
- Fields:
  - @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id
  - @Column(name = "user_id", nullable = false)
    Long userId              ← references the user who added this stock
  - @Column(nullable = false)
    String symbol            ← stock symbol e.g. "AAPL"
  - @Column(nullable = true)
    Double alertThresholdHigh  ← if price goes ABOVE this, user wants alert
                                  null means no custom threshold
  - @Column(nullable = true)
    Double alertThresholdLow   ← if price goes BELOW this, user wants alert
                                  null means no custom threshold
  - @Column(nullable = false)
    LocalDateTime addedAt
- Add @PrePersist method:
  - Sets symbol = symbol.toUpperCase()
  - Sets addedAt = LocalDateTime.now() if null

═══════════════════════════════════════════
PART 2 — WATCHLIST REPOSITORY
Location: src/main/java/com/stocksentinel/watchlist/
═══════════════════════════════════════════

CREATE WatchlistRepository.java:
- Extends JpaRepository<WatchlistItem, Long>
- Annotated with @Repository
- Custom query methods:
  - List<WatchlistItem> findByUserIdOrderByAddedAtDesc(Long userId)
    ← get all watchlist items for a user
  - Optional<WatchlistItem> findByUserIdAndSymbol(Long userId, String symbol)
    ← find a specific stock in a user's watchlist
  - boolean existsByUserIdAndSymbol(Long userId, String symbol)
    ← check if stock already in user's watchlist
  - void deleteByUserIdAndSymbol(Long userId, String symbol)
    ← remove stock from watchlist

═══════════════════════════════════════════
PART 3 — DTOs
Location: src/main/java/com/stocksentinel/watchlist/dto/
═══════════════════════════════════════════

CREATE WatchlistRequestDTO.java:
- Use Lombok: @Getter @Setter @NoArgsConstructor @AllArgsConstructor
- Fields with validation:
  - @NotBlank(message = "Symbol is required")
    String symbol
  - Double alertThresholdHigh   ← optional, can be null
  - Double alertThresholdLow    ← optional, can be null

CREATE WatchlistResponseDTO.java:
- Use Lombok: @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
- Fields:
  - Long id
  - String symbol
  - Double alertThresholdHigh
  - Double alertThresholdLow
  - String addedAt             ← formatted as "yyyy-MM-dd HH:mm:ss"
  - Double currentPrice        ← latest price from stock_data table (filled by service)
  - Double priceChange         ← percentage change from previous data point (filled by service)

═══════════════════════════════════════════
PART 4 — WATCHLIST SERVICE
Location: src/main/java/com/stocksentinel/watchlist/
═══════════════════════════════════════════

CREATE WatchlistService.java:
- Annotated with @Service
- Has a logger
- Inject WatchlistRepository, UserRepository, StockRepository via constructor injection

- Helper method — getCurrentUserId(String email) returns Long:
  - Finds user by email using userRepository.findByEmail(email)
  - Throws ResourceNotFoundException if not found
  - Returns user.getId()

- Helper method — enrichWithPrice(WatchlistResponseDTO dto) returns WatchlistResponseDTO:
  - Fetches latest 2 data points for the symbol:
    List<StockData> recent = stockRepository
        .findTop50BySymbolOrderByTimestampDesc(dto.getSymbol())
  - If at least 1 record exists:
    dto.setCurrentPrice(recent.get(0).getPrice())
  - If at least 2 records exist:
    double prev = recent.get(1).getPrice()
    double curr = recent.get(0).getPrice()
    double change = ((curr - prev) / prev) * 100.0
    dto.setPriceChange(Math.round(change * 100.0) / 100.0)
  - Returns dto

- Method 1 — getWatchlist(String email) returns List<WatchlistResponseDTO>:
  Step 1: Get userId using getCurrentUserId(email)
  Step 2: Fetch watchlist: watchlistRepository.findByUserIdOrderByAddedAtDesc(userId)
  Step 3: Map each item to WatchlistResponseDTO
  Step 4: Enrich each DTO with currentPrice and priceChange using enrichWithPrice()
  Step 5: Log and return

- Method 2 — addToWatchlist(String email, WatchlistRequestDTO request) 
  returns WatchlistResponseDTO:
  Step 1: Get userId
  Step 2: Convert symbol to uppercase
  Step 3: Check if already exists:
          watchlistRepository.existsByUserIdAndSymbol(userId, symbol)
          If yes throw RuntimeException("Stock already in your watchlist: " + symbol)
  Step 4: Build and save WatchlistItem:
          WatchlistItem item = WatchlistItem.builder()
              .userId(userId)
              .symbol(symbol)
              .alertThresholdHigh(request.getAlertThresholdHigh())
              .alertThresholdLow(request.getAlertThresholdLow())
              .build()
          watchlistRepository.save(item)
  Step 5: Log: log.info("User {} added {} to watchlist", email, symbol)
  Step 6: Map to DTO, enrich with price, return

- Method 3 — updateThresholds(String email, String symbol, 
  WatchlistRequestDTO request) returns WatchlistResponseDTO:
  Step 1: Get userId
  Step 2: Find item: watchlistRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase())
          If not found throw ResourceNotFoundException
  Step 3: Update thresholds:
          item.setAlertThresholdHigh(request.getAlertThresholdHigh())
          item.setAlertThresholdLow(request.getAlertThresholdLow())
          watchlistRepository.save(item)
  Step 4: Log: log.info("User {} updated thresholds for {}", email, symbol)
  Step 5: Map to DTO, enrich, return

- Method 4 — removeFromWatchlist(String email, String symbol):
  Step 1: Get userId
  Step 2: Check exists, if not throw ResourceNotFoundException
  Step 3: Delete: watchlistRepository.deleteByUserIdAndSymbol(userId, symbol.toUpperCase())
          ← annotate this method with @Transactional
  Step 4: Log: log.info("User {} removed {} from watchlist", email, symbol)

═══════════════════════════════════════════
PART 5 — WATCHLIST CONTROLLER
Location: src/main/java/com/stocksentinel/watchlist/
═══════════════════════════════════════════

CREATE WatchlistController.java:
- Annotated with @RestController, @RequestMapping("/api/watchlist")
- Has a logger
- Inject WatchlistService via constructor injection
- Swagger: @Tag(name = "Watchlist", description = "User stock watchlist management")

- Helper to get current user email:
  private String getCurrentEmail() {
      return SecurityContextHolder.getContext().getAuthentication().getName();
  }

- Endpoint 1 — getMyWatchlist:
  - Method: GET
  - Path: /api/watchlist
  - Returns: ResponseEntity<List<WatchlistResponseDTO>>
  - Calls watchlistService.getWatchlist(getCurrentEmail())
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Get current user's watchlist with live prices")

- Endpoint 2 — addToWatchlist:
  - Method: POST
  - Path: /api/watchlist
  - Request body: @Valid @RequestBody WatchlistRequestDTO
  - Returns: ResponseEntity<WatchlistResponseDTO>
  - Calls watchlistService.addToWatchlist(getCurrentEmail(), request)
  - HTTP 201 CREATED
  - Swagger: @Operation(summary = "Add a stock to the current user's watchlist")

- Endpoint 3 — updateThresholds:
  - Method: PUT
  - Path: /api/watchlist/{symbol}
  - Path variable: String symbol
  - Request body: @Valid @RequestBody WatchlistRequestDTO
  - Returns: ResponseEntity<WatchlistResponseDTO>
  - Calls watchlistService.updateThresholds(getCurrentEmail(), symbol, request)
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Update alert thresholds for a watchlist stock")

- Endpoint 4 — removeFromWatchlist:
  - Method: DELETE
  - Path: /api/watchlist/{symbol}
  - Path variable: String symbol
  - Returns: ResponseEntity<Map<String, String>>
  - Calls watchlistService.removeFromWatchlist(getCurrentEmail(), symbol)
  - Returns: {"message": "Removed <symbol> from watchlist"}
  - HTTP 200 OK
  - Swagger: @Operation(summary = "Remove a stock from the current user's watchlist")

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- watchlist/WatchlistItem.java exists with unique constraint and thresholds
- watchlist/WatchlistRepository.java exists with 4 query methods
- watchlist/dto/WatchlistRequestDTO.java exists
- watchlist/dto/WatchlistResponseDTO.java exists with currentPrice and priceChange
- watchlist/WatchlistService.java exists with 4 methods
- watchlist/WatchlistController.java exists with 4 endpoints
- Run: mvn clean compile — zero errors
- Run the application and test in Swagger UI:
  1. Authorize with JWT token
  2. POST /api/watchlist with {"symbol": "AAPL"}
     Response should include currentPrice from live data
  3. GET /api/watchlist — should show AAPL with live price
  4. PUT /api/watchlist/AAPL with {"symbol":"AAPL","alertThresholdHigh":300,"alertThresholdLow":150}
  5. GET /api/watchlist — AAPL should now show thresholds
  6. POST /api/watchlist with {"symbol": "AAPL"} again — should throw error (duplicate)
  7. DELETE /api/watchlist/AAPL — should remove successfully
  8. GET /api/watchlist — should be empty
```

---

## PROMPT 9 — Unit Tests

```
We are building StockSentinel — a Spring Boot anomaly detection system.
Base package: com.stocksentinel
All backend modules are complete: config, exception, auth, stock, datasource, anomaly, alert, watchlist.
Do NOT modify any existing source files.

This prompt creates unit tests for the most critical components.

═══════════════════════════════════════════
PART 1 — Z-SCORE DETECTOR TEST
Location: src/test/java/com/stocksentinel/anomaly/
═══════════════════════════════════════════

CREATE ZScoreDetectorTest.java:
- Use JUnit 5: @Test, @DisplayName
- Create a new ZScoreDetector instance directly (no Spring context needed —
  it's a pure calculation class with no dependencies)

- Test 1 — @DisplayName("Should return empty for null input")
  Call detect(null) → assert result is Optional.empty()

- Test 2 — @DisplayName("Should return empty for insufficient data (less than 3)")
  Call detect(List.of(100.0, 101.0)) → assert Optional.empty()

- Test 3 — @DisplayName("Should return empty for normal price movement")
  Create a list of similar prices: [100.0, 101.0, 99.5, 100.5, 100.2]
  Call detect(prices) → assert Optional.empty()
  (all prices are close together, Z-Score should be < 2.0)

- Test 4 — @DisplayName("Should detect PRICE_SPIKE anomaly")
  Create prices: [100.0, 101.0, 99.5, 100.5, 100.2, 250.0]
  ← 250.0 is a massive spike
  Call detect(prices) → assert result is present
  Assert type is "PRICE_SPIKE"
  Assert severity is "HIGH" (Z-Score should be > 3.0)
  Assert zScore is positive

- Test 5 — @DisplayName("Should detect PRICE_DROP anomaly")
  Create prices: [100.0, 101.0, 99.5, 100.5, 100.2, 10.0]
  ← 10.0 is a massive drop
  Call detect(prices) → assert result is present
  Assert type is "PRICE_DROP"
  Assert severity is "HIGH"
  Assert zScore is negative (in the AnomalyRecord)

- Test 6 — @DisplayName("Should return empty when all prices are identical")
  Create prices: [100.0, 100.0, 100.0, 100.0]
  ← stdDev would be 0.0
  Call detect(prices) → assert Optional.empty()

═══════════════════════════════════════════
PART 2 — MOVING AVERAGE DETECTOR TEST
Location: src/test/java/com/stocksentinel/anomaly/
═══════════════════════════════════════════

CREATE MovingAverageDetectorTest.java:
- Use JUnit 5

- Test 1 — @DisplayName("Should return empty for null input")
  Call detect(null) → assert Optional.empty()

- Test 2 — @DisplayName("Should return empty for insufficient data")
  Call detect(List.of(100.0)) → assert Optional.empty()

- Test 3 — @DisplayName("Should return empty for normal prices")
  Create prices: [100.0, 101.0, 99.5, 100.5, 100.2]
  Call detect(prices) → assert Optional.empty()
  (deviation from MA should be < 2%)

- Test 4 — @DisplayName("Should detect MA_DEVIATION anomaly for large spike")
  Create prices: [100.0, 101.0, 99.5, 100.5, 100.2, 200.0]
  Call detect(prices) → assert result is present
  Assert type is "MA_DEVIATION"
  Assert severity is "HIGH"
  Assert deviation > 5.0

- Test 5 — @DisplayName("Should detect MEDIUM severity for moderate deviation")
  Create prices where last value deviates 3-5% from average
  For example: [100.0, 100.0, 100.0, 100.0, 100.0, 104.0]
  ← 4% deviation — should be MEDIUM severity
  Call detect(prices) → assert result is present
  Assert severity is "MEDIUM"

═══════════════════════════════════════════
PART 3 — CSV IMPORT SERVICE TEST
Location: src/test/java/com/stocksentinel/stock/
═══════════════════════════════════════════

CREATE CsvImportServiceTest.java:
- Use JUnit 5 + Mockito: @ExtendWith(MockitoExtension.class)
- @Mock StockRepository stockRepository
- @InjectMocks CsvImportService csvImportService

- Test 1 — @DisplayName("Should throw InvalidCsvException for empty file")
  Create a MockMultipartFile with empty content
  Assert that calling importCsv(file) throws InvalidCsvException

- Test 2 — @DisplayName("Should throw InvalidCsvException for non-CSV file")
  Create a MockMultipartFile with filename "data.txt"
  Assert that calling importCsv(file) throws InvalidCsvException

- Test 3 — @DisplayName("Should import valid CSV successfully")
  Create a MockMultipartFile with valid CSV content:
  "symbol,price,volume,timestamp\nAAPL,178.50,1200000,2024-01-15T09:30:00"
  Mock stockRepository.existsBySymbolAndTimestamp() to return false
  Call importCsv(file)
  Assert importedRows == 1
  Assert skippedRows == 0
  Verify stockRepository.save() was called once

- Test 4 — @DisplayName("Should skip duplicate rows")
  Create a MockMultipartFile with valid CSV
  Mock stockRepository.existsBySymbolAndTimestamp() to return true
  Call importCsv(file)
  Assert importedRows == 0
  Assert skippedRows == 1
  Verify stockRepository.save() was never called

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- test/java/com/stocksentinel/anomaly/ZScoreDetectorTest.java exists with 6 tests
- test/java/com/stocksentinel/anomaly/MovingAverageDetectorTest.java exists with 5 tests
- test/java/com/stocksentinel/stock/CsvImportServiceTest.java exists with 4 tests
- Run: mvn test — all 15 tests pass
- Check the test output — should show "Tests run: 15, Failures: 0, Errors: 0"
```

---

## PROMPT 10 — React Frontend Setup (Vite + Tailwind)

```
We are building StockSentinel — a full-stack application.
The backend (Spring Boot) is complete and running on http://localhost:8080.
Now we build the React frontend.

This prompt sets up the React project with Vite, Tailwind CSS, 
React Router, and Axios.

═══════════════════════════════════════════
PART 1 — CREATE REACT PROJECT
═══════════════════════════════════════════

In the project root (same level as pom.xml), create the frontend:

1. Run: npm create vite@latest stocksentinel-ui -- --template react
2. cd stocksentinel-ui
3. Run: npm install
4. Run: npm install react-router-dom axios recharts lucide-react
   ← react-router-dom: page routing
   ← axios: HTTP client for API calls
   ← recharts: charts library
   ← lucide-react: icon library (clean, modern icons)

5. Install Tailwind CSS v3:
   Run: npm install -D tailwindcss @tailwindcss/vite
   
6. ADD Tailwind to Vite config — MODIFY vite.config.js:
   import tailwindcss from '@tailwindcss/vite'
   
   export default defineConfig({
     plugins: [react(), tailwindcss()],
     server: {
       port: 5173,
       proxy: {
         '/api': {
           target: 'http://localhost:8080',
           changeOrigin: true,
         }
       }
     }
   })
   ← The proxy means all /api calls from React are forwarded
   ← to Spring Boot automatically — no CORS issues during dev.

7. REPLACE the content of src/index.css with:
   @import "tailwindcss";

8. DELETE all default content from src/App.jsx and src/App.css
   We will rewrite them completely.

═══════════════════════════════════════════
PART 2 — THEME SYSTEM
Location: stocksentinel-ui/src/theme/
═══════════════════════════════════════════

CREATE themes.js:
- Export an object called THEMES with 8 theme definitions:

  defaultDark: {
    name: "Default Dark",
    bg: "#0f0f0f",
    bgSecondary: "#1a1a1a",
    bgCard: "#1e1e1e",
    text: "#e5e5e5",
    textSecondary: "#a3a3a3",
    accent: "#3b82f6",
    accentHover: "#2563eb",
    border: "#2a2a2a",
    success: "#22c55e",
    danger: "#ef4444",
    warning: "#f59e0b",
    sidebar: "#111111",
    sidebarText: "#d4d4d4",
    sidebarAccent: "#3b82f6",
    chart: "#3b82f6",
  },
  defaultLight: {
    name: "Default Light",
    bg: "#f8f9fa",
    bgSecondary: "#ffffff",
    bgCard: "#ffffff",
    text: "#1a1a1a",
    textSecondary: "#6b7280",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    border: "#e5e7eb",
    success: "#16a34a",
    danger: "#dc2626",
    warning: "#d97706",
    sidebar: "#ffffff",
    sidebarText: "#374151",
    sidebarAccent: "#2563eb",
    chart: "#2563eb",
  },
  deepNavy: {
    name: "Deep Navy",
    bg: "#0a192f",
    bgSecondary: "#112240",
    bgCard: "#1d3461",
    text: "#ccd6f6",
    textSecondary: "#8892b0",
    accent: "#64ffda",
    accentHover: "#45e6c0",
    border: "#1e3a5f",
    success: "#64ffda",
    danger: "#ff6b6b",
    warning: "#ffd93d",
    sidebar: "#020c1b",
    sidebarText: "#a8b2d1",
    sidebarAccent: "#64ffda",
    chart: "#64ffda",
  },
  slateDark: {
    name: "Slate Dark",
    bg: "#1e293b",
    bgSecondary: "#0f172a",
    bgCard: "#334155",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    accent: "#38bdf8",
    accentHover: "#0ea5e9",
    border: "#475569",
    success: "#4ade80",
    danger: "#f87171",
    warning: "#fbbf24",
    sidebar: "#0f172a",
    sidebarText: "#cbd5e1",
    sidebarAccent: "#38bdf8",
    chart: "#38bdf8",
  },
  darkEmerald: {
    name: "Dark Emerald",
    bg: "#0c1a0f",
    bgSecondary: "#132218",
    bgCard: "#1a3322",
    text: "#d1fae5",
    textSecondary: "#6ee7b7",
    accent: "#10b981",
    accentHover: "#059669",
    border: "#1f4a2d",
    success: "#34d399",
    danger: "#f87171",
    warning: "#fbbf24",
    sidebar: "#071209",
    sidebarText: "#a7f3d0",
    sidebarAccent: "#10b981",
    chart: "#10b981",
  },
  midnightBlue: {
    name: "Midnight Blue",
    bg: "#0d1117",
    bgSecondary: "#161b22",
    bgCard: "#21262d",
    text: "#c9d1d9",
    textSecondary: "#8b949e",
    accent: "#58a6ff",
    accentHover: "#388bfd",
    border: "#30363d",
    success: "#3fb950",
    danger: "#f85149",
    warning: "#d29922",
    sidebar: "#010409",
    sidebarText: "#b1bac4",
    sidebarAccent: "#58a6ff",
    chart: "#58a6ff",
  },
  graphiteAmber: {
    name: "Graphite Amber",
    bg: "#1c1917",
    bgSecondary: "#292524",
    bgCard: "#44403c",
    text: "#fafaf9",
    textSecondary: "#a8a29e",
    accent: "#f59e0b",
    accentHover: "#d97706",
    border: "#57534e",
    success: "#84cc16",
    danger: "#ef4444",
    warning: "#f59e0b",
    sidebar: "#0c0a09",
    sidebarText: "#d6d3d1",
    sidebarAccent: "#f59e0b",
    chart: "#f59e0b",
  },
  inkAndPaper: {
    name: "Ink & Paper",
    bg: "#faf9f6",
    bgSecondary: "#f0efe9",
    bgCard: "#ffffff",
    text: "#1a1a1a",
    textSecondary: "#555555",
    accent: "#1a1a1a",
    accentHover: "#333333",
    border: "#d4d0c8",
    success: "#2d5016",
    danger: "#8b0000",
    warning: "#8b6914",
    sidebar: "#1a1a1a",
    sidebarText: "#e5e5e5",
    sidebarAccent: "#ffffff",
    chart: "#1a1a1a",
  },

- Export FONTS object:
  {
    inter: { name: "Inter", family: "'Inter', sans-serif", url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
    jetbrainsMono: { name: "JetBrains Mono", family: "'JetBrains Mono', monospace", url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" },
    poppins: { name: "Poppins", family: "'Poppins', sans-serif", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" },
    sora: { name: "Sora", family: "'Sora', sans-serif", url: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" },
    dmSans: { name: "DM Sans", family: "'DM Sans', sans-serif", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" },
  }

CREATE ThemeContext.jsx:
- Create a React Context called ThemeContext
- ThemeProvider component:
  - State: currentTheme (default: "defaultDark")
  - State: currentFont (default: "inter")
  - State: sidebarExpanded (default: true)
  - State: chartType (default: "area")
  - On mount: Load all 4 values from localStorage if they exist
  - useEffect: When currentTheme changes:
    - Get the theme object from THEMES[currentTheme]
    - Apply all colors as CSS custom properties on document.documentElement:
      document.documentElement.style.setProperty('--bg', theme.bg)
      document.documentElement.style.setProperty('--bg-secondary', theme.bgSecondary)
      ... (all 16 properties)
    - Save to localStorage: localStorage.setItem('theme', currentTheme)
  - useEffect: When currentFont changes:
    - Load font URL by creating/updating a <link> in document.head
    - Set font family: document.documentElement.style.setProperty('--font', FONTS[currentFont].family)
    - Save to localStorage
  - Provide: { currentTheme, setCurrentTheme, currentFont, setCurrentFont,
               sidebarExpanded, setSidebarExpanded, chartType, setChartType,
               themes: THEMES, fonts: FONTS }

═══════════════════════════════════════════
PART 3 — API SERVICE LAYER
Location: stocksentinel-ui/src/services/
═══════════════════════════════════════════

CREATE api.js:
- Import axios
- Create and export an axios instance:
  const API = axios.create({
    baseURL: "/api",    ← uses the Vite proxy, no hardcoded URL needed
    headers: { "Content-Type": "application/json" }
  })
- Add a request interceptor:
  API.interceptors.request.use(config => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
- Add a response interceptor for auto-logout on 401:
  API.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
      return Promise.reject(error)
    }
  )
- Export default API

CREATE authService.js:
- Import API from "./api"
- Export functions:
  - register(name, email, password) — POST /auth/register
  - login(email, password) — POST /auth/login

CREATE stockService.js:
- Import API from "./api"
- Export functions:
  - getAllStocks() — GET /stocks
  - getStockBySymbol(symbol) — GET /stocks/{symbol}
  - getAllSymbols() — GET /stocks/symbols
  - uploadCsv(file) — POST /stocks/upload-csv (multipart form data)
  - getStocksByRange(symbol, start, end) — GET /stocks/{symbol}/range?start=&end=

CREATE anomalyService.js:
- Import API from "./api"
- Export functions:
  - getAllAnomalies() — GET /anomalies
  - getAnomaliesBySymbol(symbol) — GET /anomalies/{symbol}
  - getAnomaliesBySeverity(level) — GET /anomalies/severity/{level}
  - getAnomaliesByDateRange(start, end) — GET /anomalies/range?start=&end=
  - getAnomalyCount() — GET /anomalies/count

CREATE alertService.js:
- Import API from "./api"
- Export functions:
  - getAllAlerts() — GET /alerts
  - getAlertsBySymbol(symbol) — GET /alerts/{symbol}
  - getMyAlerts() — GET /alerts/my

CREATE watchlistService.js:
- Import API from "./api"
- Export functions:
  - getWatchlist() — GET /watchlist
  - addToWatchlist(symbol, thresholdHigh, thresholdLow) — POST /watchlist
  - updateThresholds(symbol, thresholdHigh, thresholdLow) — PUT /watchlist/{symbol}
  - removeFromWatchlist(symbol) — DELETE /watchlist/{symbol}

CREATE datasourceService.js:
- Import API from "./api"
- Export functions:
  - getStatus() — GET /datasource/status
  - getWatchedSymbols() — GET /datasource/symbols
  - triggerPoll() — POST /datasource/poll

═══════════════════════════════════════════
PART 4 — AUTH CONTEXT
Location: stocksentinel-ui/src/context/
═══════════════════════════════════════════

CREATE AuthContext.jsx:
- Create AuthContext and AuthProvider
- State: user (loaded from localStorage on mount)
- State: token (loaded from localStorage on mount)
- State: loading (true while checking if user is logged in)

- Method — login(email, password):
  Calls authService.login(email, password)
  Stores token and user data in localStorage and state
  Returns the response

- Method — register(name, email, password):
  Calls authService.register(name, email, password)
  Stores token and user data in localStorage and state
  Returns the response

- Method — logout():
  Clears localStorage (token, user)
  Clears state
  Navigates to /login

- Provide: { user, token, loading, login, register, logout, isAuthenticated: !!token }

═══════════════════════════════════════════
PART 5 — PROTECTED ROUTE
Location: stocksentinel-ui/src/components/
═══════════════════════════════════════════

CREATE ProtectedRoute.jsx:
- Import useAuth from AuthContext
- If loading, show a loading spinner (simple div with "Loading...")
- If not authenticated, redirect to /login using Navigate
- Otherwise render the children (Outlet)

═══════════════════════════════════════════
PART 6 — APP ROUTING
Location: stocksentinel-ui/src/
═══════════════════════════════════════════

REPLACE App.jsx with:
- Import BrowserRouter, Routes, Route from react-router-dom
- Import ThemeProvider, AuthProvider
- Import ProtectedRoute
- Import page components (create empty placeholders for now):
  - LoginPage, RegisterPage, DashboardPage, WatchlistPage,
    AnomaliesPage, CsvUploadPage, SettingsPage
- Structure:
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>   ← this is the sidebar layout wrapper
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
              <Route path="/csv-upload" element={<CsvUploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>

CREATE placeholder pages — for each page create a simple component
that returns <div>Page Name</div>. We will build them out in later prompts.
Location: stocksentinel-ui/src/pages/
- LoginPage.jsx
- RegisterPage.jsx
- DashboardPage.jsx
- WatchlistPage.jsx
- AnomaliesPage.jsx
- CsvUploadPage.jsx
- SettingsPage.jsx

═══════════════════════════════════════════
PART 7 — APP LAYOUT WITH SIDEBAR
Location: stocksentinel-ui/src/components/
═══════════════════════════════════════════

CREATE AppLayout.jsx:
- Import Outlet from react-router-dom
- Import useTheme from ThemeContext
- Import useAuth from AuthContext
- Import NavLink from react-router-dom
- Import icons from lucide-react:
  LayoutDashboard, Eye, AlertTriangle, Upload, Settings, LogOut,
  ChevronLeft, ChevronRight, Activity

- Uses sidebarExpanded and setSidebarExpanded from ThemeContext

- Structure:
  <div className="flex h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
    
    {/* Sidebar */}
    <aside style={{ background: 'var(--sidebar)', width: sidebarExpanded ? '240px' : '64px' }}
           className="transition-all duration-300 flex flex-col border-r"
           style also includes borderColor: 'var(--border)'>
      
      {/* Logo area */}
      <div className="flex items-center p-4 gap-3">
        <Activity size={24} style={{ color: 'var(--sidebar-accent)' }} />
        {sidebarExpanded && <span className="font-bold text-lg"
          style={{ color: 'var(--sidebar-text)' }}>StockSentinel</span>}
      </div>

      {/* Toggle button */}
      <button onClick={() => setSidebarExpanded(!sidebarExpanded)}>
        {sidebarExpanded ? <ChevronLeft /> : <ChevronRight />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-2">
        For each of these nav items, create a NavLink:
        - { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }
        - { path: "/watchlist", icon: Eye, label: "Watchlist" }
        - { path: "/anomalies", icon: AlertTriangle, label: "Anomalies" }
        - { path: "/csv-upload", icon: Upload, label: "CSV Upload" }
        - { path: "/settings", icon: Settings, label: "Settings" }
        
        Each NavLink should:
        - Have padding, rounded corners, and hover effect
        - Show active state with accent color background
        - Show icon always, show label only when sidebarExpanded
        - Use style with CSS custom properties for colors
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {/* Data source badge */}
        <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Data source will be shown here
        </div>
        {/* User info + logout */}
        <div className="flex items-center gap-2">
          {sidebarExpanded && <span style={{ color: 'var(--sidebar-text)' }}>
            {user?.name}
          </span>}
          <button onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>

    {/* Main content */}
    <main className="flex-1 overflow-auto p-6"
          style={{ background: 'var(--bg)' }}>
      <Outlet />
    </main>
  </div>

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- stocksentinel-ui/ folder exists at project root
- npm run dev starts without errors on localhost:5173
- Navigating to localhost:5173 redirects to /login (placeholder page)
- Theme system loads — CSS custom properties are applied to :root
- tailwind classes work (test with a simple colored div)
- Create a temporary test: manually set a token in localStorage,
  refresh the page — should show the sidebar layout with placeholder content
- The sidebar should collapse and expand when clicking the toggle button
- All 5 nav links should navigate to their placeholder pages
```

---

## PROMPT 11 — Login & Register Pages

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All routing, contexts, services, and AppLayout already exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the Login and Register pages.

═══════════════════════════════════════════
PART 1 — LOGIN PAGE
Location: stocksentinel-ui/src/pages/LoginPage.jsx
═══════════════════════════════════════════

REPLACE LoginPage.jsx:
- Import useAuth from AuthContext
- Import useState for form state
- Import Link, useNavigate from react-router-dom

- State: email, password, error, loading

- onSubmit handler:
  - Prevents default form submission
  - Sets loading = true, error = null
  - Calls auth.login(email, password)
  - On success: navigate to "/dashboard"
  - On error: set error message from response
  - Finally: loading = false

- Layout — centered card on a full-screen background:
  <div className="min-h-screen flex items-center justify-center"
       style={{ background: 'var(--bg)' }}>
    <div className="w-full max-w-md p-8 rounded-2xl shadow-xl"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <Activity icon, large, in accent color
        <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--text)' }}>
          StockSentinel
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Sign in to your account
        </p>
      </div>

      {/* Error message */}
      {error && <div className="p-3 rounded-lg mb-4 text-sm"
        style={{ background: 'var(--danger)', color: '#fff' }}>
        {error}
      </div>}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email field */}
        <div>
          <label className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none
                       focus:ring-2 transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              focusRingColor: 'var(--accent)'
            }}
            placeholder="you@example.com" />
        </div>
        
        {/* Password field — same styling as email */}

        {/* Submit button */}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium text-sm
                     transition-all duration-200 hover:opacity-90"
          style={{
            background: 'var(--accent)',
            color: '#fff'
          }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center mt-6 text-sm"
         style={{ color: 'var(--text-secondary)' }}>
        Don't have an account?{" "}
        <Link to="/register" style={{ color: 'var(--accent)' }}
              className="font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  </div>

═══════════════════════════════════════════
PART 2 — REGISTER PAGE
Location: stocksentinel-ui/src/pages/RegisterPage.jsx
═══════════════════════════════════════════

REPLACE RegisterPage.jsx:
- Same layout as LoginPage but with 3 fields: name, email, password
- onSubmit calls auth.register(name, email, password)
- On success: navigate to "/dashboard"
- Link at bottom says "Already have an account? Sign in" → links to /login
- Everything else identical in style to LoginPage

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Navigate to localhost:5173/login — see the login form
- Navigate to localhost:5173/register — see the register form
- Register a new user — should redirect to dashboard
- Logout, then login with same credentials — should redirect to dashboard
- Try logging in with wrong password — error message should appear
- Try registering with existing email — error message should appear
- Styling should use the current theme colors via CSS custom properties
```

---

## PROMPT 12 — Dashboard Page

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All routing, contexts, services, sidebar layout, and auth pages already exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the main Dashboard page.

═══════════════════════════════════════════
REPLACE DashboardPage.jsx
Location: stocksentinel-ui/src/pages/DashboardPage.jsx
═══════════════════════════════════════════

The dashboard has 4 sections stacked top to bottom:

SECTION 1 — Header Row:
- Left: "Dashboard" title in large font with today's date below it
- Right: 
  - Active data source badge (fetched from /api/datasource/status)
    ← green dot + "FINNHUB" or "SIMULATOR" etc.
  - Manual refresh button (calls /api/datasource/poll)
    ← subtle icon button with a refresh icon (RotateCw from lucide-react)
    ← shows a spinner while polling

SECTION 2 — Metric Cards Row (4 cards in a horizontal grid):
  Card 1: "Total Stocks" — fetch from /api/stocks/symbols and show count
  Card 2: "Today's Anomalies" — fetch from /api/anomalies/count → totalToday
  Card 3: "High Severity" — from same count endpoint → highCount
  Card 4: "Active Source" — from /api/datasource/status → activeSource

  Each card:
  - Has an icon (in accent color), a label (text-secondary), and a large value
  - Rounded corners, subtle border, card background
  - Use CSS custom properties for all colors

SECTION 3 — Price Chart:
- Area/Line chart using Recharts
- Data: Fetch from /api/stocks/{symbol} for the selected symbol
  ← default to first symbol from /api/stocks/symbols
- Symbol selector: row of small tabs/buttons at top of chart
  (one per symbol from the symbols list)
  Clicking a tab loads that symbol's data
- X axis: timestamp (formatted as HH:mm)
- Y axis: price
- Chart type based on ThemeContext chartType preference
  ("area" → AreaChart with gradient fill, "line" → LineChart)
- Use the theme's chart color for the line/area fill
- Tooltip showing exact price and time on hover
- Responsive: fills available width

SECTION 4 — Recent Anomalies Table:
- Fetch latest anomalies from /api/anomalies (limit display to 10)
- Table columns: Symbol, Type, Severity, Price, Time
- Severity column: colored badge
  HIGH → danger color, MEDIUM → warning color, LOW → success color
- Rows have subtle hover highlight
- "View All" link at bottom navigates to /anomalies

AUTO-REFRESH:
- Set up a useEffect with setInterval that:
  - Fetches fresh data every 30 seconds
  - Updates metric cards, chart data, and anomalies table
  - Cleans up interval on unmount

LOADING STATE:
- While data is loading on first render, show skeleton-like placeholders
  (simple animated pulse divs with bg-secondary color)

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Login and navigate to /dashboard
- 4 metric cards should show real numbers
- Chart should display price data for the default symbol
- Clicking symbol tabs should switch the chart data
- Recent anomalies table should show detected anomalies
- Clicking "Refresh" button should trigger a manual poll
- Data should auto-refresh every 30 seconds
- All colors should match the current theme
```

---

## PROMPT 13 — Watchlist Page

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All previous pages and services exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the Watchlist page.

═══════════════════════════════════════════
REPLACE WatchlistPage.jsx
Location: stocksentinel-ui/src/pages/WatchlistPage.jsx
═══════════════════════════════════════════

SECTION 1 — Header:
- Title "Watchlist" with subtitle "Track your favorite stocks"
- "Add Stock" button that opens an inline form or modal

SECTION 2 — Add Stock Form (shown when "Add Stock" is clicked):
- Input field for stock symbol (text input, uppercase on change)
- Optional: Two numeric inputs for alertThresholdHigh and alertThresholdLow
- "Add" button → calls watchlistService.addToWatchlist()
- "Cancel" button → hides the form
- On success: refresh the watchlist data and hide form
- On error: show error message (e.g. "Stock already in your watchlist")

SECTION 3 — Watchlist Table:
- Fetch from /api/watchlist on mount
- Table columns:
  - Symbol (bold)
  - Current Price (from response — enriched by backend)
  - Change % (from priceChange field — green if positive, red if negative)
  - Alert High (editable — show threshold or "—" if null)
  - Alert Low (editable — show threshold or "—" if null)
  - Actions: Edit Thresholds button + Remove button

- Edit Thresholds:
  - Clicking "Edit" on a row enables inline editing of thresholds
  - Shows two small numeric inputs and a Save button
  - Save calls watchlistService.updateThresholds(symbol, high, low)
  - On success: refresh the row data

- Remove:
  - Clicking "Remove" shows a brief confirmation
  - Calls watchlistService.removeFromWatchlist(symbol)
  - On success: remove the row from the list

SECTION 4 — Watchlist Chart:
- Below the table, show a price chart for the selected watchlist stock
- Clicking any row in the table selects that stock
- Chart shows the last 50 data points from /api/stocks/{symbol}
- Same chart component style as dashboard (Recharts, area/line based on preference)
- If no stock is selected, show "Click a stock to view its chart"

EMPTY STATE:
- If watchlist is empty, show a centered message:
  "Your watchlist is empty. Click 'Add Stock' to start tracking."
  With a subtle icon (Eye from lucide-react)

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Navigate to /watchlist
- Add "AAPL" to watchlist — should appear with live price
- Add "TSLA" — should appear below AAPL
- Try adding "AAPL" again — should show error
- Edit thresholds for AAPL (e.g., high: 300, low: 150) — should save
- Click AAPL row — chart should show AAPL price data below
- Remove TSLA — should disappear from table
- All colors should match current theme
```

---

## PROMPT 14 — Anomalies Page

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All previous pages exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the Anomalies page with filtering and CSV export.

═══════════════════════════════════════════
REPLACE AnomaliesPage.jsx
Location: stocksentinel-ui/src/pages/AnomaliesPage.jsx
═══════════════════════════════════════════

SECTION 1 — Header:
- Title "Anomalies" with subtitle "Detected market anomalies"
- Right side: "Export CSV" button

SECTION 2 — Filter Bar:
- Horizontal row of filter controls:
  - Symbol dropdown: populated from /api/stocks/symbols + "All Symbols" option
  - Severity dropdown: "All Severities", "HIGH", "MEDIUM", "LOW"
  - Date range: two date inputs (start and end)
  - "Apply Filters" button
  - "Clear Filters" button

- Filter logic:
  - If symbol selected (not "All") → use /api/anomalies/{symbol}
  - If severity selected (not "All") → use /api/anomalies/severity/{level}
  - If date range set → use /api/anomalies/range?start=&end=
  - If "All" → use /api/anomalies
  - If multiple filters: fetch all and filter client-side
    (backend doesn't support combined filters)

SECTION 3 — Summary Cards (small, above table):
- Fetch from /api/anomalies/count
- 4 small inline badges:
  - Total Today: {totalToday}
  - High: {highCount} (with danger color)
  - Medium: {mediumCount} (with warning color)
  - Low: {lowCount} (with success color)

SECTION 4 — Anomalies Table:
- Columns:
  - Symbol
  - Type (PRICE_SPIKE, PRICE_DROP, VOLUME_SURGE, MA_DEVIATION)
  - Severity (colored badge — same coloring as dashboard)
  - Z-Score (show value or "—" if null)
  - Deviation % (show value or "—" if null)
  - Price at Detection
  - Timestamp (formatted)

- Pagination:
  - Show 20 rows per page
  - Previous / Next buttons at bottom
  - "Showing X-Y of Z results" text

- Empty state: "No anomalies match your filters"

SECTION 5 — CSV Export:
- "Export CSV" button at top
- onClick handler:
  - Takes the current filtered anomaly data
  - Converts to CSV format:
    Header: symbol,type,severity,zscore,deviation,price,timestamp
    One row per anomaly
  - Creates a Blob, generates a download URL
  - Creates a temporary <a> tag, triggers click to download
  - Filename: "stocksentinel_anomalies_YYYY-MM-DD.csv"

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Navigate to /anomalies
- Table should show all detected anomalies
- Filter by symbol "AAPL" — only AAPL anomalies shown
- Filter by severity "HIGH" — only HIGH severity shown
- Clear filters — all anomalies return
- Click "Export CSV" — downloads a CSV file with correct data
- Summary cards show accurate counts
- Pagination works if more than 20 anomalies exist
- All colors match current theme
```

---

## PROMPT 15 — CSV Upload Page

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All previous pages exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the CSV Upload page with drag-and-drop, 
preview, and import results.

═══════════════════════════════════════════
REPLACE CsvUploadPage.jsx
Location: stocksentinel-ui/src/pages/CsvUploadPage.jsx
═══════════════════════════════════════════

The page has 3 states: UPLOAD → PREVIEW → RESULTS

STATE 1 — UPLOAD (initial):

- Title "CSV Upload" with subtitle "Import stock data from CSV files"

- Large drop zone:
  - Dashed border, rounded corners, tall rectangle
  - Icon: Upload from lucide-react (centered, large)
  - Text: "Drag and drop your CSV file here"
  - Sub-text: "or click to browse"
  - Supports drag-and-drop (onDragOver, onDrop events)
  - Also supports click-to-select via a hidden <input type="file" accept=".csv">
  - On file drop/select: validate it's a .csv file, then transition to PREVIEW

- Below drop zone: info box explaining the expected CSV format:
  "Expected format: symbol, price, volume, timestamp"
  "Example: AAPL, 178.50, 1200000, 2024-01-15T09:30:00"
  Styled with bg-secondary and text-secondary colors

STATE 2 — PREVIEW (after file selected):

- Show selected filename and file size
- Parse the CSV client-side using FileReader:
  reader.readAsText(file)
  Split into lines, split each line by comma
- Display first 10 rows in a preview table:
  Columns: symbol, price, volume, timestamp
  (parsed from the CSV, header row excluded)
- Show total row count: "Total rows: X"
- Two buttons:
  - "Cancel" → go back to UPLOAD state
  - "Import" → call stockService.uploadCsv(file), transition to RESULTS
  - Show loading spinner while importing

STATE 3 — RESULTS (after import completes):

- Success/summary card:
  - Total Rows: X
  - Imported: Y (in success color)
  - Skipped: Z (in warning color)
  - Message from backend response

- If there are errors, show them in a scrollable list:
  Each error as a text line in a subtle error-colored box

- Two buttons:
  - "Upload Another" → go back to UPLOAD state
  - "View Stocks" → navigate to /dashboard

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Navigate to /csv-upload
- See the drop zone with instructions
- Select sample-stocks.csv (or drag it)
- Preview should show first 10 rows with correct columns
- Click "Import" — should show results (20 imported or 20 skipped if already exist)
- Click "Upload Another" — returns to drop zone
- All colors match current theme
```

---

## PROMPT 16 — Settings Page

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All previous pages exist.
Do NOT modify any existing files unless explicitly told to.

This prompt builds the Settings page for theme/font/chart customization.

═══════════════════════════════════════════
REPLACE SettingsPage.jsx
Location: stocksentinel-ui/src/pages/SettingsPage.jsx
═══════════════════════════════════════════

- Import useTheme from ThemeContext (gives access to all theme/font state)

SECTION 1 — Header:
- Title "Settings" with subtitle "Customize your experience"

SECTION 2 — Color Theme:
- Title: "Color Theme"
- Grid of 8 theme cards (4 per row on desktop, 2 per row on mobile):
  
  For each theme in THEMES:
  - Small card with:
    - A color preview strip: 4 small colored circles showing
      bg, accent, success, danger colors of that theme
    - Theme name below
    - If currently selected: accent-colored border and a checkmark icon
    - onClick: setCurrentTheme(themeKey)
  - The card itself uses a neutral border, not the theme colors
    (so they're all visible regardless of current theme)

  Themes should change INSTANTLY on click (no save button).

SECTION 3 — Font:
- Title: "Font Family"
- Grid of 5 font cards (one per font):
  
  For each font in FONTS:
  - Card showing the font name rendered IN that font:
    <span style={{ fontFamily: font.family }}>Aa Bb Cc 123</span>
  - Font name below
  - If currently selected: accent border + checkmark
  - onClick: setCurrentFont(fontKey)
  - Font loads immediately via Google Fonts link injection

SECTION 4 — Sidebar Default:
- Title: "Sidebar"
- Two option cards side by side:
  - "Expanded" (icon: sidebar expanded visual)
  - "Compact" (icon: sidebar collapsed visual)
  - Currently selected has accent border
  - onClick: setSidebarExpanded(true/false) + save to localStorage

SECTION 5 — Chart Type:
- Title: "Chart Style"
- Three option cards side by side:
  - "Area" — small preview showing an area chart silhouette
  - "Line" — small preview showing a line chart silhouette
  - "Bar" — small preview showing a bar chart silhouette
  - Currently selected has accent border
  - onClick: setChartType(type)

ALL CHANGES SAVED INSTANTLY to localStorage. No save button needed.
Show a small toast/notification at the bottom when any setting changes:
"Settings saved" — fades out after 2 seconds.

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Navigate to /settings
- Click "Deep Navy" theme — entire app should instantly change to dark navy colors
- Click "Ink & Paper" — app switches to light, minimal theme
- Click "JetBrains Mono" font — all text changes to monospace
- Click "Compact" sidebar — sidebar should collapse
- Click "Area" chart type — go to dashboard, verify area chart
- Refresh the page — settings should persist from localStorage
- All 8 themes, 5 fonts, 2 sidebar options, 3 chart types work correctly
```

---

## PROMPT 17 — Dashboard Data Source Badge & Polish

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All pages are built.
This prompt adds finishing touches and integrates the live data source 
indicator into the sidebar.

═══════════════════════════════════════════
PART 1 — UPDATE AppLayout.jsx (Sidebar)
═══════════════════════════════════════════

MODIFY AppLayout.jsx:

In the bottom section of the sidebar, add a live data source indicator:

- On mount, fetch from datasourceService.getStatus()
- Store the activeSource in state
- Re-fetch every 60 seconds
- Display as a small badge:
  - Green dot (pulsing animation) + source name
  - When source is "FINNHUB": green dot
  - When source is "ALPHAVANTAGE": blue dot
  - When source is "SIMULATOR": amber/yellow dot
  - When sidebarExpanded: show dot + label
  - When collapsed: show only the colored dot

═══════════════════════════════════════════
PART 2 — LOADING SKELETONS
Location: stocksentinel-ui/src/components/
═══════════════════════════════════════════

CREATE Skeleton.jsx:
- A reusable skeleton/shimmer component for loading states
- Props: width, height, className
- Renders a div with:
  - background: var(--bg-secondary)
  - Rounded corners
  - CSS animation: a subtle pulse or shimmer effect
  - Configurable dimensions

Update DashboardPage.jsx to use Skeleton components while data is loading
instead of showing blank space.

═══════════════════════════════════════════
PART 3 — TOAST NOTIFICATION COMPONENT
Location: stocksentinel-ui/src/components/
═══════════════════════════════════════════

CREATE Toast.jsx:
- A simple notification that appears at bottom-right
- Props: message, type (success/error/warning), onClose
- Auto-dismisses after 3 seconds
- Slides in from right, slides out on dismiss
- Uses theme colors: success → green, error → danger, warning → warning

CREATE a useToast hook or simple toast context that any page can use:
  const { showToast } = useToast()
  showToast("Settings saved", "success")

Integrate toast into:
- Settings page (when any setting changes)
- CSV Upload page (on successful import)
- Watchlist page (on add/remove success)

═══════════════════════════════════════════
PART 4 — RESPONSIVE DESIGN
═══════════════════════════════════════════

Ensure all pages work on smaller screens:

- Sidebar: On screens < 768px wide, sidebar should auto-collapse to compact mode
  and overlay the content when expanded (with a semi-transparent backdrop)
- Dashboard: metric cards stack to 2-per-row on medium, 1-per-row on small
- Tables: Add horizontal scroll on small screens
- Forms: Full width on mobile

═══════════════════════════════════════════
VERIFY at the end:
═══════════════════════════════════════════
- Sidebar shows live data source indicator with colored dot
- Loading skeletons appear on dashboard while data fetches
- Toast notifications appear for settings changes, CSV uploads, watchlist edits
- On narrow browser window: sidebar auto-collapses, tables scroll horizontally
- No visual bugs or broken layouts
```

---

## PROMPT 18 — Final Integration & Testing

```
We are building StockSentinel — a React frontend with Tailwind CSS.
Location: stocksentinel-ui/
All pages and components are built.
This is the final prompt — wire everything together and verify the complete app.

═══════════════════════════════════════════
PART 1 — INDEX.HTML
═══════════════════════════════════════════

UPDATE stocksentinel-ui/index.html:
- Set the page title to: "StockSentinel — Stock Market Anomaly Detector"
- Add meta description: "Real-time stock market anomaly detection dashboard 
  with live data, CSV import, and email alerts."
- Add favicon: use a simple chart/activity icon (you can use an SVG inline or
  generate a simple one)
- Ensure the default Google Font (Inter) is preloaded

═══════════════════════════════════════════
PART 2 — ERROR HANDLING
═══════════════════════════════════════════

CREATE ErrorBoundary.jsx:
Location: stocksentinel-ui/src/components/
- A React class component that catches errors in child components
- Displays a friendly error page instead of crashing:
  "Something went wrong"
  "Please refresh the page or try again later."
  With a "Refresh" button that calls window.location.reload()

Wrap <App /> in ErrorBoundary in main.jsx

═══════════════════════════════════════════
PART 3 — 404 PAGE
═══════════════════════════════════════════

CREATE NotFoundPage.jsx:
Location: stocksentinel-ui/src/pages/
- Shows a large "404" text
- "Page not found" message
- "Go to Dashboard" button that navigates to /dashboard
- Styled with theme colors

Add a catch-all route in App.jsx:
<Route path="*" element={<NotFoundPage />} />

═══════════════════════════════════════════
PART 4 — FINAL VERIFICATION CHECKLIST
═══════════════════════════════════════════

Run the full application and verify EVERY feature:

Backend (Spring Boot running on :8080):
1. mvn clean compile — zero errors
2. mvn spring-boot:run — starts successfully
3. Swagger UI loads at /swagger-ui.html
4. H2 console loads at /h2-console
5. All API endpoints respond correctly

Frontend (React running on :5173):
1. npm run dev — starts without errors
2. Register a new user — redirects to dashboard
3. Logout — redirects to login
4. Login with existing credentials — redirects to dashboard
5. Dashboard:
   - 4 metric cards show real data
   - Chart displays price data
   - Symbol tabs switch chart data
   - Recent anomalies table populated
   - Refresh button triggers manual poll
   - Auto-refresh updates data every 30s
6. Watchlist:
   - Add "AAPL" — appears with live price
   - Add "TSLA" — appears below AAPL
   - Edit thresholds for AAPL — saves correctly
   - Click AAPL row — chart shows below
   - Remove TSLA — disappears
7. Anomalies:
   - Table shows all anomalies
   - Filter by symbol works
   - Filter by severity works
   - Export CSV downloads correct file
8. CSV Upload:
   - Drop zone accepts .csv files
   - Preview shows first 10 rows
   - Import shows results (imported/skipped)
9. Settings:
   - All 8 themes change app instantly
   - All 5 fonts change app instantly
   - Sidebar compact/expanded works
   - Chart type changes
   - Settings persist across page refresh
10. Sidebar:
    - Collapse/expand toggle works
    - Active page highlighted
    - Data source indicator shows with colored dot
    - Logout button works
11. Theme system:
    - All pages use CSS custom properties
    - No hardcoded colors anywhere
12. Responsive:
    - Sidebar collapses on narrow screens
    - Tables scroll horizontally on mobile
13. Error handling:
    - Navigate to /nonexistent — shows 404 page
    - Invalid API calls show error messages, don't crash
14. Auto-logout:
    - If JWT expires, user is redirected to login

If everything passes, the project is COMPLETE.
```

---

> [!IMPORTANT]
> **Prompt execution order matters.** Run them sequentially: 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18. Each prompt depends on files created by the previous one. Compile/test after each prompt before moving to the next.
