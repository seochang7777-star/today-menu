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

set PYTHON="%ROOT%.venv\Scripts\python.exe"
set PIP="%ROOT%.venv\Scripts\pip.exe"

echo.
echo [2/6] Python 패키지 설치 중...
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
echo [4/6] 프론트 패키지 설치 중...
cd /d "%FRONT%"
call npm install
if errorlevel 1 (
    echo [오류] npm install 실패
    pause
    exit /b 1
)
call npm install -D tailwindcss @tailwindcss/vite @tailwindcss/postcss
if errorlevel 1 (
    echo [오류] Tailwind 설치 실패
    pause
    exit /b 1
)

echo.
echo [5/6] DB 초기화 중... (테이블 생성 + 기본계정 + 테스트유저 100명)
cd /d "%BACK%"
if exist "%BACK%\수원지역_상가_정보.csv" (
    %PYTHON% seed.py --csv 수원지역_상가_정보.csv
) else (
    echo       수원지역_상가_정보.csv 없음 - CSV 건너뜀
    %PYTHON% seed.py --skip-csv
)
if errorlevel 1 (
    echo [오류] seed.py 실패
    pause
    exit /b 1
)

echo.
echo [6/6] 설치 확인...
%PYTHON% -c "from run import app; from app import db; app.app_context().push(); print('DB 연결 정상')"
if errorlevel 1 (
    echo [오류] DB 연결 실패
    pause
    exit /b 1
)

echo.
echo ================================================
echo 설치 완료!
echo.
echo 계정 정보:
echo   일반: test01@test.com / 1234
echo   관리자: asdf@asdf.com / 1234
echo.
echo start.bat 실행하세요
echo ================================================
echo.
pause
