import os
from dotenv import load_dotenv
from pathlib import Path 

load_dotenv()

basedir = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'

    SQLALCHEMY_DATABASE_URI = (
        os.environ.get('DATABASE_URL')
        or f"sqlite:///{basedir / 'dining.db'}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY                 = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key'
    OPENAI_API_KEY                 = os.environ.get('OPENAI_API_KEY') or ''
