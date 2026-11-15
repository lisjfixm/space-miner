@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Python。請先安裝 Python 並勾選 Add Python to PATH。
  pause
  exit /b 1
)
start "Space Miner Local Server" python -m http.server 8778 --bind 127.0.0.1
timeout /t 1 >nul
start "" http://127.0.0.1:8778/index.html
