import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# __file__ 기준 절대경로 (Windows 백슬래시 자동 처리)
basedir = Path(__file__).resolve().parent

# instance 폴더 없으면 자동 생성 (migrate 실행 전에 반드시 존재해야 함)
instance_dir = basedir / 'instance'
instance_dir.mkdir(exist_ok=True)

class Config:
    SECRET_KEY                     = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    # DATABASE_URL 환경변수 무시 — 상대경로는 Windows에서 경로를 못 찾음
    # Path로 절대경로 계산 후 슬래시 통일
    SQLALCHEMY_DATABASE_URI        = (
        'sqlite:///' + str(instance_dir / 'dining.db').replace('\\', '/')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY                 = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key'
    OPENAI_API_KEY                 = os.environ.get('OPENAI_API_KEY') or ''
