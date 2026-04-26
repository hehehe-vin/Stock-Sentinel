@echo off
echo ==============================================
echo       Starting Stock Sentinel Project
echo ==============================================

echo [1/2] Starting Spring Boot Backend...
:: We use the Maven Wrapper (mvnw.cmd) so you don't even need Maven installed!
start "Stock Sentinel Backend" cmd /k "mvnw.cmd spring-boot:run"

echo [2/2] Starting React Frontend...
:: Automatically install frontend dependencies if they are missing
:: Using npm.cmd explicitly to ensure it works properly across all Windows terminal environments
start "Stock Sentinel Frontend" cmd /k "cd stocksentinel-ui && (if not exist node_modules npm.cmd install) && npm.cmd run dev"

echo.
echo Both services are spinning up in separate windows!
echo - Backend will be available at http://localhost:8080
echo - Frontend will be available at http://localhost:5173
echo.
pause
