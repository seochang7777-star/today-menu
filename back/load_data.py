import csv
import os
from app import create_app, db
from app.models import Restaurant

app = create_app()

def import_csv_to_db():
    csv_file_path = os.path.join(os.path.dirname(__file__), 'data', 'clean_restaurants.csv')
    
    with app.app_context():
        db.session.query(Restaurant).delete()
        
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                if '수원' in row['소재지도로명주소']:
                    # 위도/경도가 비어있거나 공백이면 None으로 처리
                    lat_val = row['위도'].strip()
                    lng_val = row['경도'].strip()
                    
                    restaurant = Restaurant(
                        name=row['사업장명'],
                        address=row['소재지도로명주소'],
                        category=row['업태구분명정보'],
                        phone=row['소재지시설전화번호'],
                        latitude=float(lat_val) if lat_val else None,
                        longitude=float(lng_val) if lng_val else None
                    )
                    db.session.add(restaurant)
                    count += 1
            db.session.commit()
            print(f"적재 완료! 총 {count}개의 수원시 식당이 저장되었습니다.")

if __name__ == "__main__":
    import_csv_to_db()