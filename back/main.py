from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

app = FastAPI()

# ✅ CORS (프론트 연결 필수)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 요청 데이터 구조
class RecommendRequest(BaseModel):
    message: str
    preferences: list[str] = []
    allergies: str = ""

# ✅ 임시 메뉴 DB
menus = [
    {"name": "삼겹살", "type": "한식"},
    {"name": "마라탕", "type": "중식"},
    {"name": "초밥", "type": "일식"},
    {"name": "파스타", "type": "양식"},
    {"name": "떡볶이", "type": "분식"},
]

# ✅ 추천 API
@app.post("/recommend")
def recommend(req: RecommendRequest):
    
    # ✅ 선호 메뉴 있으면 우선 추천
    if req.preferences:
        menu = random.choice(req.preferences)
    else:
        menu = random.choice(menus)["name"]

    return {
        "menu": menu,
        "comment": f"{menu} 추천합니다 🍽"
    }

restaurants = [
    {"name": "맛있는 삼겹살집", "lat": 37.5665, "lng": 126.9780},
    {"name": "마라탕 맛집", "lat": 37.5651, "lng": 126.9895},
    {"name": "스시집", "lat": 37.5700, "lng": 126.9820},
]


@app.get("/restaurants")
def get_restaurants(lat: float = Query(None), lng: float = Query(None)):

    # 실제는 거리 계산해야 하지만 → 지금은 그냥 반환
    return [
        {"name": "삼겹살집", "lat": lat or 37.5665, "lng": lng or 126.9780},
        {"name": "마라탕집", "lat": 37.5651, "lng": 126.9895},
        {"name": "초밥집", "lat": 37.5700, "lng": 126.9820},
    ]
