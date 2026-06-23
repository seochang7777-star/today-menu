import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY            = os.environ.get('SECRET_KEY') or 'dev-secret-key-for-local'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'instance', 'dining.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY        = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key'
