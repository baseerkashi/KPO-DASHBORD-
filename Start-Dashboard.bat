@echo off
title KPO Intelligence Dashboard Server
color 0B
echo =======================================================
echo          KPO INTELLIGENCE DASHBOARD (MVP)
echo =======================================================
echo.
echo [STATUS] Starting servers... Please wait.
echo.
echo [INFO] A browser window will open automatically.
echo [INFO] To turn the website OFF, simply click the 'X' 
echo        to close this black command window.
echo.
echo =======================================================

:: Wait 3 seconds to ensure terminal is visible before firing browser
timeout /t 3 /nobreak >nul

:: Open default web browser to the correct local address
start "" "http://localhost:5173"

:: Start the application (this command runs infinitely)
call npm run dev
