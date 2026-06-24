"""
seed.py  —  초기 데이터 삽입
실행: cd back && python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from run import app
from app import db
from app.models import User, RoleEnum
from werkzeug.security import generate_password_hash

USERS = [
    {
        'email':    'test01@test.com',
        'password': '1234',
        'nickname': 'test01',
        'role':     RoleEnum.USER,
        'allergies': '',
        'preferences': {'likes': ['한식', '분식'], 'dislikes': ['오이']},
    },
    {
        'email':    'asdf@asdf.com',
        'password': '1234',
        'nickname': '관리자',
        'role':     RoleEnum.ADMIN,
        'allergies': '',
        'preferences': {'likes': [], 'dislikes': []},
    },
]

def seed():
    with app.app_context():
        added = []
        skipped = []

        for u in USERS:
            if User.query.filter_by(email=u['email']).first():
                skipped.append(u['email'])
                continue

            user = User(
                email=u['email'],
                password=generate_password_hash(u['password']),
                nickname=u['nickname'],
                role=u['role'],
                allergies=u['allergies'],
                preferences=u['preferences'],
                manner_score=36.5,
            )
            db.session.add(user)
            added.append(u['email'])

        db.session.commit()

        print("\n===== seed.py 완료 =====")
        for e in added:
            print(f"  ✅ 추가됨  : {e}")
        for e in skipped:
            print(f"  ⏭️  이미 존재: {e}")
        print("========================\n")

if __name__ == '__main__':
    seed()
