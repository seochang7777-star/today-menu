import pandas as pd
from app import db
from app import create_app
from app.models import Menu
# 1. CSV 파일 불러오기


# 2. Flask 컨텍스트 안에서 작업 수행
app = create_app()
with app.app_context():

    db.create_all()

    df = pd.read_csv('메뉴목록.csv', encoding='utf-8-sig') 

    for index, row in df.iterrows():
        # menu_name을 기준으로 중복 체크
        existing_menu = Menu.query.filter_by(menu_name=row['menu_name']).first()
        
        if not existing_menu:
            # CSV의 열 이름(menu_name, category, category_id)과 맞춤
            new_menu = Menu(
                menu_name=row['menu_name'],
                category=row['category'],
                category_id=row['category_id'] # 추가된 필드 반영
            )
            db.session.add(new_menu)
    
    db.session.commit()
    print("모든 데이터가 성공적으로 입력되었습니다!")