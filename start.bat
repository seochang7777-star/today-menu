@echo off
chcp 65001 > nul
title 오늘의 메뉴 - 서버 실행

echo.
echo ================================================
echo 오늘의 메뉴 서버를 시작합니다
echo ================================================
echo.

set ROOT=%~dp0
set BACK=%ROOT%back
set FRONT=%ROOT%front

if not exist "%BACK%\run.py" (
    echo [오류] back\run.py 없음
    pause
    exit /b 1
)

if not exist "%FRONT%\package.json" (
    echo [오류] front\package.json 없음
    pause
    exit /b 1
)

:: ── 가상환경 감지 ──────────────────────────────────────────────────
if exist "%ROOT%.venv\Scripts\python.exe" (
    set PYTHON="%ROOT%.venv\Scripts\python.exe"
) else if exist "%BACK%\.venv\Scripts\python.exe" (
    set PYTHON="%BACK%\.venv\Scripts\python.exe"
) else (
    set PYTHON=python
)

:: ── npm install 확인 (node_modules 없을 때만 실행) ────────────────
if not exist "%FRONT%\node_modules" (
    echo [프론트] node_modules 없음 - npm install 실행 중...
    cd /d "%FRONT%"
    call npm install
    if errorlevel 1 ( echo [오류] npm install 실패 & pause & exit /b 1 )
    echo [프론트] npm install 완료!
) else (
    echo [프론트] node_modules 존재 - 설치 건너뜀
)

if not exist "%BACK%\instance" (
    mkdir "%BACK%\instance"
)

echo.
echo [백엔드] Flask 실행
start "" cmd /k cd /d "%BACK%" ^&^& %PYTHON% run.py

timeout /t 3 > nul

echo [프론트] Vite 실행
start "" cmd /k cd /d "%FRONT%" ^&^& npm run dev

timeout /t 3 > nul
start "" http://localhost:5173