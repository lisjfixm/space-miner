@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Python 啟動器（py）。請先安裝 Python。
  pause
  exit /b 1
)
start "Space Miner Local Server" py -m http.server 8778 --bind 127.0.0.1
timeout /t 1 >nul
start "" http://127.0.0.1:8778/index.html
