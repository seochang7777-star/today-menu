@echo off
chcp 65001 > nul
title 오늘의 메뉴 - 최초 설치

echo.
echo ================================================
echo 최초 설치를 시작합니다 (약 1~3분 소요)
echo ================================================
echo.

set ROOT=%~dp0
set BACK=%ROOT%back
set FRONT=%ROOT%front

echo [1/6] Python 가상환경 생성 중...
if exist "%ROOT%.venv" (
    echo 이미 존재 - 건너뜀
) else (
    python -m venv "%ROOT%.venv"
    if errorlevel 1 (
        echo [오류] Python 설치 확인
        pause
        exit /b 1
    )
)

set PYTHON=%ROOT%.venv\Scripts\python.exe
set PIP=%ROOT%.venv\Scripts\pip.exe

echo.
echo [2/6] 패키지 설치 중...
%PIP% install -r "%BACK%\requirements.txt"
if errorlevel 1 (
    echo [오류] pip install 실패
    pause
    exit /b 1
)

echo.
echo [3/6] instance 폴더 생성...
if not exist "%BACK%\instance" mkdir "%BACK%\instance"


echo.
echo [4/6] DB 테이블 생성...

cd /d "%BACK%"

%PYTHON% -c "from run import app; from app import db; app.app_context().push(); db.create_all()"

if errorlevel 1 (
    echo [오류] DB 생성 실패
    pause
    exit /b 1
)
echo 완료

echo.
echo [5/6] npm install...
cd /d "%FRONT%"
call npm install
if errorlevel 1 (
    echo [오류] Node.js 확인
    pause
    exit /b 1
)

echo.
echo [6/6] 초기 데이터 넣기...
cd /d "%BACK%"
%PYTHON% seed.py

echo.
echo ================================================
echo 설치 완료!
echo start.bat 실행하세요
echo ================================================
echo.

pause
