"""
import_csv.py  —  수원지역 상가 CSV → DB 일괄 등록
실행: cd back && python import_csv.py 수원지역_상가_정보.csv

옵션:
  --limit N    최대 N개만 등록 (기본: 전체)
  --clear      기존 Restaurant 테이블 초기화 후 등록
"""
import sys
import os
import csv
import argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from run import app
from app import db
from app.models import Restaurant

# ── CSV 컬럼 → DB 컬럼 매핑 ──────────────────────────────────────────────────
# 우리 앱 카테고리: ['전체','한식','일식','중식','양식','분식','치킨','피자','카페','술집']
# CSV 카테고리:    ['한식','일식','중식','양식','분식','치킨','카페','술집','기타']
# '기타' → '양식' fallback (피자 포함 기타 업종)
OUR_CATEGORIES = {'한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '술집'}

def map_category(csv_cat: str) -> str:
    cat = csv_cat.strip()
    if cat in OUR_CATEGORIES:
        return cat
    return '양식'   # '기타' 등 매핑 불가 → '양식'으로 fallback


def run(csv_path: str, limit: int | None, clear: bool):
    with open(csv_path, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))

    print(f"\n총 {len(rows)}개 행 읽음")

    # 위도·경도 있고 카테고리가 우리 앱 기준인 것만 사용
    valid = []
    for r in rows:
        lat = r.get('위도', '').strip()
        lng = r.get('경도', '').strip()
        cat = r.get('카테고리', '').strip()
        if not lat or not lng:
            continue
        if cat not in OUR_CATEGORIES:
            continue   # 기타는 제외
        valid.append(r)

    if limit:
        valid = valid[:limit]

    print(f"등록 대상: {len(valid)}개 (위도/경도 있고 카테고리 매핑 가능한 것)")

    with app.app_context():
        if clear:
            deleted = db.session.query(Restaurant).delete()
            db.session.commit()
            print(f"기존 데이터 {deleted}개 삭제")

        added   = 0
        skipped = 0

        for i, r in enumerate(valid, 1):
            name    = r['사업장명'].strip()
            address = r.get('소재지도로명주소', '').strip() or r.get('소재지지번주소', '').strip()
            lat     = float(r['위도'])
            lng     = float(r['경도'])
            cat     = map_category(r['카테고리'])
            phone   = r.get('소재지시설전화번호', '').strip()

            # 이름 + 주소 중복 체크
            exists = Restaurant.query.filter_by(name=name, address=address).first()
            if exists:
                skipped += 1
                continue

            rest = Restaurant(
                name=name,
                address=address,
                latitude=lat,
                longitude=lng,
                category=cat,
                phone=phone,
                description='',
                avg_rating=0.0,
            )
            db.session.add(rest)

            # 500개마다 중간 commit (메모리 절약)
            if i % 500 == 0:
                db.session.commit()
                print(f"  {i}/{len(valid)} 처리 중...")

            added += 1

        db.session.commit()

        print(f"\n===== import_csv.py 완료 =====")
        print(f"  ✅ 등록됨  : {added}개")
        print(f"  ⏭️  중복 건너뜀: {skipped}개")
        print("==============================\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='수원 상가 CSV → DB 등록')
    parser.add_argument('csv', nargs='?', default='수원지역_상가_정보.csv',
                        help='CSV 파일 경로 (기본: 수원지역_상가_정보.csv)')
    parser.add_argument('--limit', type=int, default=None,
                        help='최대 등록 수 (기본: 전체)')
    parser.add_argument('--clear', action='store_true',
                        help='기존 식당 데이터 초기화 후 등록')
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        # 스크립트 위치 기준으로 경로 계산
        csv_path = Path(__file__).parent / csv_path

    if not csv_path.exists():
        print(f"[오류] 파일을 찾을 수 없습니다: {csv_path}")
        sys.exit(1)

    run(str(csv_path), args.limit, args.clear)
