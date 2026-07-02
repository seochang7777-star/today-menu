import os
import sys
from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

db       = SQLAlchemy()
migrate  = Migrate()
jwt      = JWTManager()
socketio = SocketIO()

def _allowed_origins():
    base = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'capacitor://localhost',
        'http://localhost',
    ]
    extra = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]
    return list(set(base + extra))

def create_app():
    app = Flask(
        __name__,
        instance_relative_config=True,
        instance_path=str(Path(__file__).resolve().parent.parent / 'instance')
    )

    app.config.from_object('config.Config')
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    # DB URI 확인
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    print(f"[APP] Using DB: {db_uri[:60]}")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(
        app,
        async_mode='eventlet',
        cors_allowed_origins=_allowed_origins(),
        supports_credentials=True,
    )

    CORS(app,
         supports_credentials=True,
         resources={r'/*': {'origins': _allowed_origins()}})

    from app.routes import main_bp, auth_bp, menu_bp, party_bp, mypage_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(party_bp)
    app.register_blueprint(mypage_bp)
    app.register_blueprint(api_bp)

    with app.app_context():
        try:
            db.create_all()
            print("[APP] DB tables created successfully")
        except Exception as e:
            print(f"[APP] DB ERROR: {e}")
            # SQLite면 종료
            if 'sqlite' in db_uri:
                print("[APP] FATAL: Using SQLite instead of PostgreSQL!")
                sys.exit(1)

    return app
