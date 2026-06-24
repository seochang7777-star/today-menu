@echo off
chcp 65001 > nul
title 서버 종료

echo.
echo  Flask(포트 5000) 와 Node(포트 5173) 프로세스를 종료합니다...
echo.

:: 포트 5000 (Flask) 종료
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo  Flask PID %%a 종료 중...
    taskkill /PID %%a /F > nul 2>&1
)

:: 포트 5173 (Vite) 종료
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo  Vite  PID %%a 종료 중...
    taskkill /PID %%a /F > nul 2>&1
)

echo.
echo  완료!
timeout /t 2 /nobreak > nul
