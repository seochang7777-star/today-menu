@echo off
chcp 65001 > nul
echo Flask(:5000) 와 Vite(:5173) 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F > nul 2>&1
echo 완료!
timeout /t 2 /nobreak > nul
