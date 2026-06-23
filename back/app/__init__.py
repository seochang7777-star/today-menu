from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import sys, os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__,
<<<<<<< HEAD
            template_folder='../../front/templates',
            static_folder='../../front/static')
=======
                template_folder='../front/templates',
                static_folder='../front/static')

>>>>>>> 0252d285a3c1b1c562a730731fee2420c004882d
    app.config.from_object('config.Config')

    db.init_app(app)
    migrate.init_app(app, db)  # DB 마이그레이션 연결
    jwt.init_app(app)
    CORS(app)  # 프론트엔드 통신

    # 블루프린트 등록
    from app.routes import main_bp, auth_bp, menu_bp, party_bp, mypage_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(menu_bp)
    app.register_blueprint(party_bp)
    app.register_blueprint(mypage_bp)
    app.register_blueprint(api_bp)

    return app