import os
from pathlib import Path

basedir      = Path(__file__).resolve().parent
instance_dir = basedir / 'instance'
instance_dir.mkdir(exist_ok=True)

_db_url = os.environ.get('DATABASE_URL', '')
_db_url = _db_url.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '')

if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

if _db_url.startswith('postgresql://') and '+' not in _db_url:
    _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg://', 1)

print(f"[CONFIG] Final URI = {_db_url[:60]}")

class Config:
    SECRET_KEY     = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'dev-jwt-key'
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY') or ''
    SQLALCHEMY_DATABASE_URI = _db_url or (
        'sqlite:///' + str(instance_dir / 'dining.db').replace('\\', '/')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping':    True,
        'pool_recycle':     300,
        'connect_args':     {
            'prepare_threshold': None,  # prepared statement 비활성화
        }
    }
