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

db        = SQLAlchemy()
migrate   = Migrate()
jwt       = JWTManager()
socketio  = SocketIO()

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

    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    print(f"[APP] Using DB: {db_uri[:60]}")

    # ── psycopg prepare_threshold 강제 설정 ──────────────────────────────────
    # pgbouncer Transaction mode에서 DuplicatePreparedStatement 방지
    if 'psycopg' in db_uri:
        engine_opts = app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
        connect_args = engine_opts.get('connect_args', {})
        connect_args['prepare_threshold'] = 0
        engine_opts['connect_args'] = connect_args
        engine_opts['pool_pre_ping'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_opts
        print("[APP] psycopg prepare_threshold=0 적용")

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

    from app.routes import main_bp, auth_bp, menu_bp, party_bp, mypage_bp, api_bp, support_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(party_bp)
    app.register_blueprint(mypage_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(support_bp)

    with app.app_context():
        try:
            db.create_all()
            print("[APP] DB tables created successfully")
        except Exception as e:
            print(f"[APP] DB ERROR: {e}")

    # ── APScheduler: 파티 자동 종료 (1분마다) ──────────────────
    from flask_apscheduler import APScheduler
    scheduler = APScheduler()

    if not scheduler.running:
        @scheduler.task('interval', id='auto_close_parties', minutes=1, misfire_grace_time=30)
        def auto_close_parties():
            with app.app_context():
                try:
                    from datetime import datetime
                    from app.models import Party, StatusEnum
                    now = datetime.now()
                    expired = Party.query.filter(
                        Party.status.in_([StatusEnum.RECRUITING, StatusEnum.CLOSED]),
                        Party.meeting_time < now
                    ).all()
                    for p in expired:
                        p.status = StatusEnum.COMPLETED
                    if expired:
                        db.session.commit()
                        print(f"[Scheduler] {len(expired)}개 파티 자동 종료")
                except Exception as e:
                    print(f"[Scheduler] 오류: {e}")
                    db.session.rollback()

        scheduler.init_app(app)
        scheduler.start()
        print("[APP] APScheduler 시작")

    return app
