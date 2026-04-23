<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.4.4-6DB33F?logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/H2-Database-blue?logo=database" />
  <img src="https://img.shields.io/badge/Finnhub-API-orange" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

# 📈 Stock Sentinel

**Stock Sentinel** is a real-time market intelligence platform that monitors live stock prices, detects statistical anomalies using Z-Score and Moving Average algorithms, and provides rich comparative analytics — all through a sleek, dark-themed React dashboard backed by a Spring Boot API.

---

## 🌟 Key Features

### 📊 Real-Time Dashboard
- **Live Price Tracking** — Streams 5-minute OHLC candle data from Finnhub for 6 tracked symbols (AAPL, AMZN, GOOGL, MSFT, NVDA, TSLA)
- **Interactive Charts** — Area and line charts with hover tooltips, powered by Recharts
- **Multi-Stock Overlay** — "All Stocks" view renders each stock on its own auto-scaled Y-axis so every curve shows its true trend regardless of price level
- **Volatility Badges** — Real-time severity ratings (LOW → EXTREME) displayed inline on every stock button

### ⚡ Anomaly Detection Engine
- **Z-Score Detector** — Flags statistically significant price deviations from historical mean
- **Moving Average Detector** — Identifies divergences from rolling average trendlines
- **Severity Classification** — LOW, MEDIUM, HIGH based on deviation magnitude
- **Volatility Ratings** — Computed per-symbol: total anomalies, high-severity count, 7-day recent count, average deviation %
- **Toast Notifications** — Real-time popup alerts when new anomalies are detected

### 🔀 Stock Comparator (max 4 stocks)
- **Value Mode** — Side-by-side comparison cards showing:
  - Current price & daily change with color-coded arrows
  - Sparkline mini-charts from intraday candle data
  - Day range progress bars (low → current → high)
  - Key metrics: Open, Previous Close, Intraday Range %, Gap %
  - Volatility badge with anomaly count
  - **Performance Summary Table** — Rows are metrics, columns are stocks, best performer per metric highlighted with 🏆
- **Trend Mode** — Overlay chart with independent Y-axes per stock, range slider (10%–100%) for zoom

### 📂 CSV Upload & Historical Analysis
- Upload custom CSV files with stock data (symbol, price, timestamp)
- Historical (CSV) data displayed on separate tab with daily-aligned charts
- Data persists across server restarts (H2 file-based database)

### ⭐ Watchlist
- Star stocks from the dashboard to add to your personal watchlist
- Dedicated watchlist page with per-stock detail views

### 🔐 Authentication
- JWT-based auth with register/login flow
- Protected routes redirect unauthenticated users to registration
- Stale token detection with automatic cleanup

### 📧 Email Alerts
- Configurable SMTP integration for anomaly notifications
- Triggered when high-severity anomalies are detected

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  Dashboard │ Watchlist │ Anomalies │ CSV Upload │ Settings   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JWT Auth)
┌──────────────────────────┴──────────────────────────────────┐
│                 Spring Boot Backend                          │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Auth    │  │  DataSource  │  │   Anomaly Engine      │  │
│  │  Module   │  │   Manager    │  │  ┌─────────────────┐  │  │
│  │ JWT/User  │  │              │  │  │ Z-Score Detector│  │  │
│  └──────────┘  │  Finnhub ──┐ │  │  │ MA Detector     │  │  │
│                │  AlphaVant─┤ │  │  │ Volatility Calc │  │  │
│  ┌──────────┐  │  Simulator─┘ │  │  └─────────────────┘  │  │
│  │ Watchlist │  └──────────────┘  └───────────────────────┘  │
│  │  Module   │                                               │
│  └──────────┘  ┌──────────────┐  ┌───────────────────────┐  │
│                │  Stock/CSV   │  │    Alert Service       │  │
│                │   Module     │  │   (Email via SMTP)     │  │
│                └──────────────┘  └───────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  H2 Database │
                    │  (File-based)│
                    └─────────────┘
```

### Data Source Fallback Chain
```
Finnhub (Primary) → Alpha Vantage (Fallback) → Simulator (Demo)
```
If Finnhub is unreachable, the system automatically falls back to Alpha Vantage. If both are unavailable, a built-in stock simulator generates realistic demo data so the dashboard always has something to display.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite 8 | SPA with hot-reload |
| **Charting** | Recharts | Area, Line, sparkline charts |
| **Icons** | Lucide React | Modern icon set |
| **Styling** | Tailwind CSS | Utility-first dark theme |
| **Backend** | Spring Boot 3.4.4 | REST API + scheduled polling |
| **Security** | Spring Security + JWT | Token-based authentication |
| **Database** | H2 (File-mode) | Persistent embedded DB |
| **APIs** | Finnhub, Alpha Vantage | Real-time market data |
| **Email** | Spring Mail (SMTP) | Anomaly alert notifications |
| **Docs** | SpringDoc OpenAPI | Auto-generated Swagger UI |

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+** (JDK)
- **Maven 3.8+**
- **Node.js 18+** & npm
- **Finnhub API Key** (free at [finnhub.io](https://finnhub.io))

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Stock-Sentinel.git
cd Stock-Sentinel
```

### 2. Configure API Keys
Edit `src/main/resources/application.properties`:
```properties
# Finnhub API
finnhub.api.key=YOUR_FINNHUB_API_KEY

# Alpha Vantage API (optional fallback)
alphavantage.api.key=YOUR_ALPHAVANTAGE_KEY

# Email Alerts (optional)
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

### 3. Start the Backend
```bash
mvn spring-boot:run
```
The backend starts on **http://localhost:8080**. It immediately begins polling Finnhub for live data and running anomaly detection every 30 seconds.

### 4. Start the Frontend
```bash
cd stocksentinel-ui
npm install
npm run dev
```
The frontend starts on **http://localhost:5173** and proxies API calls to the backend.

### 5. Register & Login
Navigate to `http://localhost:5173` → Register a new account → Login → Dashboard loads with live data.

---

## 📁 Project Structure

```
Stock-Sentinel/
├── src/main/java/com/stocksentinel/
│   ├── StockSentinelApplication.java    # Entry point + @EnableScheduling
│   ├── auth/                            # JWT auth, user management
│   │   ├── AuthController.java          # POST /api/auth/register, /login
│   │   ├── AuthService.java             # Registration, login logic
│   │   ├── JwtAuthFilter.java           # OncePerRequestFilter for JWT
│   │   ├── JwtUtil.java                 # Token generation & validation
│   │   └── UserEntity.java              # User JPA entity
│   ├── datasource/                      # Market data providers
│   │   ├── DataSourceManager.java       # Orchestrator + fallback chain
│   │   ├── DataSourceController.java    # GET /api/datasource/**
│   │   ├── FinnhubService.java          # Primary: Finnhub WebSocket/REST
│   │   ├── AlphaVantageService.java     # Fallback: Alpha Vantage REST
│   │   └── StockSimulatorService.java   # Demo: realistic price simulator
│   ├── anomaly/                         # Detection & analysis engine
│   │   ├── AnomalyService.java          # Core detection + volatility calc
│   │   ├── AnomalyController.java       # GET /api/anomalies/**
│   │   ├── ZScoreDetector.java          # Statistical Z-Score anomaly detection
│   │   ├── MovingAverageDetector.java   # Moving average crossover detection
│   │   └── dto/
│   │       ├── AnomalyResponseDTO.java  # Anomaly API response
│   │       └── VolatilityDTO.java       # Volatility rating response
│   ├── stock/                           # Stock data CRUD + CSV upload
│   ├── watchlist/                       # User watchlist management
│   ├── alert/                           # Email notification service
│   ├── config/                          # Security, CORS, startup cleaner
│   └── exception/                       # Global exception handling
├── src/main/resources/
│   └── application.properties           # DB, API keys, SMTP config
├── stocksentinel-ui/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx        # Main dashboard with charts
│   │   │   ├── AnomaliesPage.jsx        # Anomaly history & frequency
│   │   │   ├── WatchlistPage.jsx        # Personal watchlist
│   │   │   ├── CsvUploadPage.jsx        # CSV file upload
│   │   │   ├── SettingsPage.jsx         # Theme & preferences
│   │   │   ├── LoginPage.jsx            # Sign in
│   │   │   └── RegisterPage.jsx         # Create account
│   │   ├── services/                    # Axios API service modules
│   │   ├── context/AuthContext.jsx      # React auth state management
│   │   ├── theme/ThemeContext.jsx        # Dark/light theme toggle
│   │   └── App.jsx                      # Router + protected routes
│   └── package.json
├── data/                                # H2 database files (auto-created)
├── pom.xml                              # Maven dependencies
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Login, returns JWT token |

### Market Data
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/datasource/quotes` | Live quotes for all tracked symbols |
| `GET` | `/api/datasource/candles/{symbol}` | OHLC candle data (5-min resolution) |
| `POST` | `/api/datasource/poll` | Trigger manual data refresh |

### Stocks & CSV
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/stocks/symbols` | List all symbols in database |
| `GET` | `/api/stocks/{symbol}` | Historical data for a symbol |
| `POST` | `/api/stocks/upload-csv` | Upload CSV with stock data |

### Anomalies
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/anomalies` | All detected anomalies |
| `GET` | `/api/anomalies/{symbol}` | Anomalies for specific symbol |
| `GET` | `/api/anomalies/volatility` | Volatility ratings for all symbols |

### Watchlist 🔒
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/watchlist` | User's watchlist |
| `POST` | `/api/watchlist/{symbol}` | Add symbol to watchlist |
| `DELETE` | `/api/watchlist/{symbol}` | Remove from watchlist |

> 🔒 = Requires `Authorization: Bearer <JWT>` header

### Interactive API Docs
Swagger UI available at: `http://localhost:8080/swagger-ui.html`

---

## 📊 CSV Upload Format

Upload historical stock data via the CSV Upload page. Expected format:

```csv
symbol,price,timestamp
AAPL,185.50,2026-04-17T10:30:00
TSLA,254.20,2026-04-17T10:30:00
NVDA,894.00,2026-04-17T10:30:00
```

| Column | Type | Description |
|--------|------|-------------|
| `symbol` | String | Stock ticker (e.g., AAPL) |
| `price` | Double | Stock price at that time |
| `timestamp` | ISO 8601 | Date and time of the price |

---

## ⚙️ Configuration Reference

| Property | Default | Description |
|----------|---------|-------------|
| `finnhub.api.key` | — | Finnhub API key (required for live data) |
| `alphavantage.api.key` | — | Alpha Vantage key (optional fallback) |
| `jwt.secret` | — | JWT signing secret (change in production!) |
| `jwt.expiration` | `86400000` | Token expiry in ms (24 hours) |
| `spring.jpa.hibernate.ddl-auto` | `update` | DB schema strategy (preserves data) |
| `spring.h2.console.enabled` | `true` | H2 web console at `/h2-console` |
| `spring.mail.*` | — | SMTP config for email alerts |

---

## 🧠 Anomaly Detection Algorithms

### Z-Score Detection
Calculates the standard score of the latest price relative to historical data:

```
Z = (price - mean) / stddev
```

A Z-score magnitude > 2.0 triggers an anomaly. Severity is classified as:
- |Z| > 3.0 → **HIGH**
- |Z| > 2.5 → **MEDIUM**
- |Z| > 2.0 → **LOW**

### Moving Average Detection
Compares the current price against a 20-period simple moving average (SMA). If the deviation exceeds a dynamic threshold, an anomaly is flagged.

### Volatility Rating
Computed per-symbol by aggregating anomaly history:

| Rating | Criteria |
|--------|----------|
| 🟢 **LOW** | < 3 anomalies, < 1 high-severity |
| 🟡 **MODERATE** | 3–6 anomalies |
| 🟠 **HIGH** | 7–12 anomalies or 3+ high-severity |
| 🔴 **EXTREME** | 12+ anomalies or 5+ high-severity |

---

## 🧹 Data Persistence Strategy

- **User data** (accounts, watchlist, CSV uploads) — **persisted** across restarts via `ddl-auto=update`
- **Ephemeral data** (Finnhub, AlphaVantage, Simulator) — **cleared on startup** by `StartupCleaner.java` to prevent stale market data
- **Database location** — `./data/stocksentineldb` (H2 file-based, auto-created)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Built with ☕ Spring Boot & ⚛️ React
</p>
