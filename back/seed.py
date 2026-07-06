"""
seed.py — DB 전체 초기화 스크립트 (기본 계정 + CSV + 테스트 유저 통합)

실행: cd back && python seed.py [옵션]

옵션:
  --csv    PATH   수원 상가 CSV 경로 (기본: 수원지역_상가_정보.csv)
  --skip-csv      CSV 임포트 건너뜀
  --skip-users    테스트 유저 100명 생성 건너뜀
  --clear         식당 데이터 초기화 후 재등록

실행 순서:
  1단계. DB 테이블 생성 (db.create_all)
  2단계. 기본 계정 2개 (test01@test.com, asdf@asdf.com)
  3단계. 수원 상가 CSV → Restaurant 등록
  4단계. 테스트 유저 100명 + 리뷰(1~5개) + 찜(2~5개) + 매너온도(20~50°C)
"""
import sys, os, csv, random, argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from run import app
from app import db
from app.models import User, Restaurant, RecommendationLog, RoleEnum
from werkzeug.security import generate_password_hash

# ── 상수 ──────────────────────────────────────────────────────────────────────
OUR_CATEGORIES = {'한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '술집'}

REVIEW_POOL = [
    "음식이 정말 맛있었어요! 다음에 또 올게요.",
    "가성비 최고입니다. 양도 많고 맛도 좋아요.",
    "직원분들이 너무 친절했어요. 서비스 최고!",
    "분위기가 너무 좋았어요. 데이트 코스로 추천해요.",
    "국물이 진하고 깊은 맛이 났어요. 강추!",
    "혼밥하기 딱 좋은 환경이었어요.",
    "재료가 신선하고 깔끔한 맛이에요.",
    "가격 대비 퀄리티가 훌륭합니다.",
    "맛집 인증! 지인들한테도 추천했어요.",
    "메뉴 구성이 다양해서 고르는 재미가 있어요.",
    "반찬이 정갈하고 맛있어요. 집밥 느낌이에요.",
    "사장님이 정말 친절하세요. 단골 될 것 같아요.",
    "양이 많아서 다 먹기 힘들었어요. 좋은 의미로요!",
    "리뷰 보고 왔는데 기대 이상이었어요.",
    "된장찌개가 어머니 손맛이에요. 정말 맛있어요.",
    "인테리어가 감각적이에요. 사진 찍기도 좋아요.",
    "웨이팅이 있었지만 기다릴 만한 가치가 있었어요.",
    "술안주로 딱이에요. 맥주랑 정말 잘 어울려요.",
    "소스가 특이하고 맛있었어요. 비법 소스 같아요.",
    "아이들도 잘 먹었어요. 가족 모임 추천!",
]

FOOD_PREFS = [
    ['한식', '분식'], ['일식', '양식'], ['중식', '치킨'],
    ['피자', '양식'], ['카페', '분식'], ['한식', '일식'],
    ['치킨', '피자'], ['분식', '중식'], ['양식', '카페'],
    ['한식'], ['일식'], ['중식'], ['양식'], ['분식'],
]

DISLIKES = [
    ['오이', '고수'], ['파', '마늘'], ['가지', '당근'],
    ['고등어', '낙지'], ['쑥갓'], [], ['민트', '콩'],
    ['땅콩'], ['갑각류'], [],
]


# ══════════════════════════════════════════════════════════════════════════════
# 1단계: DB 테이블 생성
# ══════════════════════════════════════════════════════════════════════════════
def step1_create_tables():
    print("\n[1단계] DB 테이블 생성...")
    with app.app_context():
        db.create_all()
    print("  ✅ 완료")


# ══════════════════════════════════════════════════════════════════════════════
# 2단계: 기본 계정 생성
# ══════════════════════════════════════════════════════════════════════════════
def step2_seed_base_users():
    print("\n[2단계] 기본 계정 생성...")
    BASE_USERS = [
        {
            'email': 'test01@test.com', 'password': '1234',
            'nickname': 'test01', 'role': RoleEnum.USER,
            'allergies': '',
            'preferences': {'likes': ['한식', '분식'], 'dislikes': ['오이']},
            'manner_score': 36.5,
        },
        {
            'email': 'asdf@asdf.com', 'password': '1234',
            'nickname': '관리자', 'role': RoleEnum.ADMIN,
            'allergies': '',
            'preferences': {'likes': [], 'dislikes': []},
            'manner_score': 36.5,
        },
    ]
    with app.app_context():
        for u in BASE_USERS:
            if User.query.filter_by(email=u['email']).first():
                print(f"  ⏭️  이미 존재: {u['email']}")
                continue
            db.session.add(User(
                email=u['email'],
                password=generate_password_hash(u['password']),
                nickname=u['nickname'],
                role=u['role'],
                allergies=u['allergies'],
                preferences=u['preferences'],
                manner_score=u['manner_score'],
            ))
            print(f"  ✅ 추가: {u['email']}")
        db.session.commit()


# ══════════════════════════════════════════════════════════════════════════════
# 3단계: CSV → Restaurant 등록
# ══════════════════════════════════════════════════════════════════════════════
def step3_import_csv(csv_path: str, clear: bool = False):
    print(f"\n[3단계] 수원 상가 CSV 등록... ({csv_path})")

    if not Path(csv_path).exists():
        print(f"  ⚠️  파일 없음: {csv_path}")
        print("  ⏭️  CSV 임포트 건너뜀 — 나중에 직접 실행하세요:")
        print("       python seed.py --csv 수원지역_상가_최종.csv")
        return

    with open(csv_path, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))

    print(f"  총 {len(rows)}개 행 읽음")

    valid = [r for r in rows
             if r.get('latitude', '').strip() and r.get('longitude', '').strip()
             and r.get('category', '').strip() in OUR_CATEGORIES]
    print(f"  등록 대상: {len(valid)}개")

    with app.app_context():
        if clear:
            deleted = db.session.query(Restaurant).delete()
            db.session.commit()
            print(f"  기존 {deleted}개 삭제")

        added = skipped = 0
        for i, r in enumerate(valid, 1):
            name    = r['name'].strip()
            address = r['address'].strip()

            if Restaurant.query.filter_by(name=name, address=address).first():
                skipped += 1
                continue

            db.session.add(Restaurant(
                name=name, address=address,
                latitude=float(r['latitude']), longitude=float(r['longitude']),
                category=r['category'].strip(),
                phone=r.get('phone', '').strip(),
                description='', avg_rating=0.0,
            ))
            added += 1
            if i % 500 == 0:
                db.session.commit()
                print(f"  {i}/{len(valid)} 처리 중...")

        db.session.commit()
        print(f"  ✅ 등록: {added}개 / ⏭️ 중복 건너뜀: {skipped}개")


# ══════════════════════════════════════════════════════════════════════════════
# [추가] 별도 메뉴 CSV 임포트
# ══════════════════════════════════════════════════════════════════════════════
def step_extra_menu_import(csv_path: str):
    print(f"\n[추가] 메뉴 CSV 파일 등록 중... ({csv_path})")
    
    if not Path(csv_path).exists():
        print(f" ⚠️ 파일 없음: {csv_path}")
        return

    with open(csv_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        with app.app_context():
            # SQL 직접 실행 방식으로 변경 (모델 의존성 제거)
            added = 0
            for row in reader:
                # 1. 카테고리 등록 (기존 테이블이 없어도 생성하도록 로직 보완)
                db.session.execute(
                    db.text("INSERT OR IGNORE INTO categories (id, name) VALUES (:id, :name)"),
                    {'id': row['category_id'], 'name': row['category']}
                )
                
                # 2. 메뉴 등록
                db.session.execute(
                    db.text("INSERT INTO menus (menu_name, category_id) VALUES (:name, :cat_id)"),
                    {'name': row['menu_name'], 'cat_id': row['category_id']}
                )
                added += 1
            
            db.session.commit()
            print(f"  ✅ 메뉴 {added}개 등록 완료!")


# ══════════════════════════════════════════════════════════════════════════════
# 4단계: 테스트 유저 100명
# ══════════════════════════════════════════════════════════════════════════════
def step4_seed_test_users():
    print("\n[4단계] 테스트 유저 100명 생성...")

    with app.app_context():
        rest_ids = [r.restaurant_id for r in
                    Restaurant.query.with_entities(Restaurant.restaurant_id).all()]

        if not rest_ids:
            print("  ⚠️  식당 데이터 없음 — 3단계(CSV 임포트) 먼저 실행하세요")
            return

        added_u = skipped_u = added_l = 0

        for i in range(1, 101):
            email    = f"test{i:02d}@test.com" if i <= 9 else f"test{i}@test.com"
            nickname = f"테스터{i:03d}"

            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    email=email,
                    password=generate_password_hash("1234"),
                    nickname=nickname,
                    manner_score=round(random.uniform(20.0, 50.0), 1),
                    allergies=', '.join(random.choice(DISLIKES)),
                    preferences={
                        'likes':    random.choice(FOOD_PREFS),
                        'dislikes': random.choice(DISLIKES),
                    },
                    role=RoleEnum.USER,
                )
                db.session.add(user)
                db.session.flush()
                added_u += 1
            else:
                user.manner_score = round(random.uniform(20.0, 50.0), 1)
                skipped_u += 1

            # 기존 로그 없으면 리뷰 1~5개 생성
            existing_ids = {l.recommended_restaurant_id for l in
                            RecommendationLog.query.filter_by(user_id=user.user_id).all()}
            if not existing_ids:
                chosen = random.sample(rest_ids, min(random.randint(1, 5), len(rest_ids)))
                for rid in chosen:
                    db.session.add(RecommendationLog(
                        user_id=user.user_id,
                        input_context={'review': random.choice(REVIEW_POOL), 'mode': 'recommend'},
                        recommended_restaurant_id=rid,
                        is_liked=False,
                    ))
                    added_l += 1
                existing_ids = set(chosen)

            # 찜 2~5개 보장
            target  = random.randint(2, 5)
            logs    = RecommendationLog.query.filter_by(user_id=user.user_id).all()
            liked   = [l for l in logs if l.is_liked]
            need    = target - len(liked)

            for l in [x for x in logs if not x.is_liked][:max(need, 0)]:
                l.is_liked = True; need -= 1

            if need > 0:
                avail = [r for r in rest_ids if r not in existing_ids]
                for rid in random.sample(avail, min(need, len(avail))):
                    db.session.add(RecommendationLog(
                        user_id=user.user_id,
                        input_context={'review': random.choice(REVIEW_POOL), 'mode': 'recommend'},
                        recommended_restaurant_id=rid,
                        is_liked=True,
                    ))
                    added_l += 1

        db.session.commit()

        scores = [u.manner_score for u in
                  User.query.filter(User.email.like('test%@test.com')).all()]
        liked_cnts = [
            RecommendationLog.query.filter_by(user_id=u.user_id, is_liked=True).count()
            for u in User.query.filter(User.email.like('test%@test.com')).all()
        ]

        print(f"  ✅ 신규 유저: {added_u}명 / 기존 온도 갱신: {skipped_u}명")
        print(f"  ✅ 로그 추가: {added_l}개")
        if scores:
            print(f"  매너온도: {min(scores):.1f}°C ~ {max(scores):.1f}°C")
        if liked_cnts:
            print(f"  찜 개수: 최소 {min(liked_cnts)}개 ~ 최대 {max(liked_cnts)}개")


# ══════════════════════════════════════════════════════════════════════════════
# 메인
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description='오늘의 메뉴 DB 초기화')
    parser.add_argument('--csv',        default='수원지역_상가_최종.csv', help='CSV 파일 경로')
    parser.add_argument('--menu-csv',   default='menus.csv', help='메뉴 CSV 경로')
    parser.add_argument('--skip-csv',   action='store_true', help='CSV 임포트 건너뜀')
    parser.add_argument('--skip-users', action='store_true', help='테스트 유저 생성 건너뜀')
    parser.add_argument('--clear',      action='store_true', help='식당 데이터 초기화 후 재등록')
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        csv_path = Path(__file__).parent / csv_path

    print("=" * 50)
    print("  오늘의 메뉴 — DB 초기화")
    print("=" * 50)

    step1_create_tables()
    step2_seed_base_users()

    if not args.skip_csv:
        step3_import_csv(str(csv_path), args.clear)
    else:
        print("\n[3단계] CSV 임포트 건너뜀 (--skip-csv)")

    menu_csv_path = Path(args.menu_csv)
    if menu_csv_path.exists():
        step_extra_menu_import(str(menu_csv_path))
    else:
        print(f" ⚠️ 메뉴 파일 없음, 건너뜀: {args.menu_csv}")

    if not args.skip_users:
        step4_seed_test_users()
    else:
        print("\n[4단계] 테스트 유저 건너뜀 (--skip-users)")

    with app.app_context():
        total_users = User.query.count()
        total_rests = Restaurant.query.count()
        total_logs  = RecommendationLog.query.count()

    print("\n" + "=" * 50)
    print("  초기화 완료!")
    print(f"  유저: {total_users}명 / 식당: {total_rests}개 / 로그: {total_logs}개")
    print("  계정: test01@test.com / 1234")
    print("        asdf@asdf.com   / 1234")
    print("=" * 50 + "\n")


if __name__ == '__main__':
    main()
