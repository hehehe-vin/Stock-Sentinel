# StockSentinel — Real-Time Stock Market Anomaly Detector

## Tech Stack
- Backend: Java 17, Spring Boot 3.2, Spring Security, Spring Data JPA
- Database: H2 (development), PostgreSQL (production)
- Authentication: JWT (JSON Web Tokens)
- Frontend: React, Axios, Recharts
- API Docs: Swagger UI

## How to Run (Development)

### Backend
1. Open the project in IntelliJ IDEA or VS Code
2. Make sure Java 17 is installed
3. Run: mvn spring-boot:run
4. Backend starts at: http://localhost:8080
5. Swagger UI at: http://localhost:8080/swagger-ui.html
6. H2 Console at: http://localhost:8080/h2-console

### Frontend
1. Navigate to stocksentinel-ui/
2. Run: npm install
3. Run: npm run dev
4. Frontend starts at: http://localhost:5173

## API Keys Required
- Finnhub: https://finnhub.io (free account)
- Alpha Vantage: https://www.alphavantage.co (free account)
- Add keys to application.properties

## Team
- StockGuards | Java-IV-T204
