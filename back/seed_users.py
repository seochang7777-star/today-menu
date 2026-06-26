"""
seed_users.py — 테스트 유저 100명 + 추천 로그(리뷰) + 찜 목록 + 매너온도 생성
실행: cd back && python seed_users.py
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(__file__))

from run import app
from app import db
from app.models import User, Restaurant, RecommendationLog, RoleEnum
from werkzeug.security import generate_password_hash

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
    "인테리어가 감각적이에요. 사진 찍기도 좋아요.",
    "소스가 특이하고 맛있었어요. 비법 소스 같아요.",
    "사장님이 정말 친절하세요. 단골 될 것 같아요.",
    "양이 많아서 다 먹기 힘들었어요. 좋은 의미로요!",
    "리뷰 보고 왔는데 기대 이상이었어요.",
    "된장찌개가 어머니 손맛이에요. 정말 맛있어요.",
    "고기 굽는 방법을 알려주셔서 더 맛있게 먹었어요.",
    "웨이팅이 있었지만 기다릴 만한 가치가 있었어요.",
    "술안주로 딱이에요. 맥주랑 정말 잘 어울려요.",
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

def run():
    with app.app_context():
        rest_ids = [r.restaurant_id for r in
                    Restaurant.query.with_entities(Restaurant.restaurant_id).all()]
        print(f"식당 {len(rest_ids)}개 로드")

        added_users = skipped_users = added_logs = updated_logs = 0

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
                added_users += 1
            else:
                # 기존 유저 온도 업데이트
                user.manner_score = round(random.uniform(20.0, 50.0), 1)
                skipped_users += 1

            # ── 리뷰 로그 1~5개 ────────────────────────────────────────────
            existing_ids = {l.recommended_restaurant_id for l in
                            RecommendationLog.query.filter_by(user_id=user.user_id).all()}

            if not existing_ids:
                count   = random.randint(1, 5)
                chosen  = random.sample(rest_ids, min(count, len(rest_ids)))
                for rest_id in chosen:
                    db.session.add(RecommendationLog(
                        user_id=user.user_id,
                        input_context={
                            'message': f"추천 리뷰: {random.choice(REVIEW_POOL)}",
                            'review':  random.choice(REVIEW_POOL),
                            'mode':    'recommend',
                        },
                        recommended_restaurant_id=rest_id,
                        is_liked=False,
                    ))
                    added_logs += 1
                existing_ids = set(chosen)

            # ── 찜 2~5개 보장 ─────────────────────────────────────────────
            target = random.randint(2, 5)
            logs   = RecommendationLog.query.filter_by(user_id=user.user_id).all()
            liked  = [l for l in logs if l.is_liked]
            need   = target - len(liked)

            # 기존 로그 전환
            for l in [x for x in logs if not x.is_liked][:max(need, 0)]:
                l.is_liked = True
                need -= 1
                updated_logs += 1

            # 신규 로그 추가
            if need > 0:
                available = [r for r in rest_ids if r not in existing_ids]
                for rest_id in random.sample(available, min(need, len(available))):
                    db.session.add(RecommendationLog(
                        user_id=user.user_id,
                        input_context={
                            'message': f"추천 리뷰: {random.choice(REVIEW_POOL)}",
                            'review':  random.choice(REVIEW_POOL),
                            'mode':    'recommend',
                        },
                        recommended_restaurant_id=rest_id,
                        is_liked=True,
                    ))
                    added_logs += 1

        db.session.commit()

        # 결과
        total_users = User.query.count()
        total_logs  = RecommendationLog.query.count()
        total_liked = RecommendationLog.query.filter_by(is_liked=True).count()
        scores = [u.manner_score for u in
                  User.query.filter(User.email.like('test%')).all()]
        liked_counts = []
        for u in User.query.filter(User.email.like('test%')).all():
            liked_counts.append(
                RecommendationLog.query.filter_by(user_id=u.user_id, is_liked=True).count())

        print(f"\n===== seed_users.py 완료 =====")
        print(f"  신규 유저: {added_users}명 / 기존 유저 온도 갱신: {skipped_users}명")
        print(f"  로그 추가: {added_logs}개 / 찜 전환: {updated_logs}개")
        print(f"  전체 유저: {total_users}명 / 전체 로그: {total_logs}개 / 찜: {total_liked}개")
        print(f"  매너온도: {min(scores):.1f}°C ~ {max(scores):.1f}°C (평균 {sum(scores)/len(scores):.1f}°C)")
        print(f"  찜 개수: 최소 {min(liked_counts)}개 ~ 최대 {max(liked_counts)}개")
        print("==============================\n")

if __name__ == '__main__':
    run()
