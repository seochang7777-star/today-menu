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
socketio = SocketIO(
    cors_allowed_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    async_mode='eventlet',
    supports_credentials=True,
)

def create_app():
    app = Flask(
        __name__,
        instance_relative_config=True,
        instance_path=str(Path(__file__).resolve().parent.parent / 'instance')
    )

    app.config.from_object('config.Config')
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, async_mode='eventlet', cors_allowed_origins=['http://localhost:5173', 'http://127.0.0.1:5173'])

    # CORS는 socketio에서 처리하므로 supports_credentials만 설정
    CORS(app, supports_credentials=True,
         resources={r'/*': {'origins': ['http://localhost:5173', 'http://127.0.0.1:5173']}})

    from app.routes import main_bp, auth_bp, menu_bp, party_bp, mypage_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(party_bp)
    app.register_blueprint(mypage_bp)
    app.register_blueprint(api_bp)

    return app
