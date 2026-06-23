import os

# 현재 파일이 위치한 경로를 기준으로 폴더 구조를 파악합니다.
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # 1. 보안을 위한 키 (앱의 세션 등을 암호화할 때 사용)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-for-local'

    # 2. 데이터베이스 설정 (SQLite는 파일 경로만 지정하면 됩니다)
    # instance 폴더가 없으면 에러가 날 수 있으니 미리 생성하세요.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'instance', 'dining.db')
    
    # 3. 데이터베이스 변경 사항 추적 여부 (성능을 위해 False)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 4. JWT 관련 설정
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key'
