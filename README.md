#  오늘 뭐먹지?

> AI 기반 메뉴 추천 플랫폼 — 혼밥부터 파티까지, 오늘 뭐먹을지 고민 끝!

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black)](https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-blue)](https://today-menu-backend.onrender.com)
[![Supabase](https://img.shields.io/badge/DB-Supabase-green)](https://supabase.com)
[![UptimeRobot](https://img.shields.io/badge/Uptime-UptimeRobot-brightgreen)](https://uptimerobot.com)

---

## 프로젝트 소개

**오늘 뭐먹지?** 는 10~30대를 주 타겟으로 한 AI 기반 메뉴 추천 서비스입니다.  
비회원도 기본 메뉴 추천이 가능하며, 회원가입 시 개인화된 다양한 기능을 이용할 수 있습니다.

- **서비스 URL**: https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app
- **GitHub**: https://github.com/today-menu-ap/today-menu

---

## 주요 기능

### 회원 / 비회원 구분

| 기능 | 비회원 | 회원 |
|---|:---:|:---:|
| 메뉴 추천 | ✅ | ✅ |
| 게임 이용 | ✅ | ✅ |
| AI 챗봇 | ❌ | ✅ |
| 찜 목록 관리 | ❌ | ✅ |
| 파티 참여/생성 | ❌ | ✅ |
| 마이페이지 | ❌ | ✅ |
| 리뷰/별점 작성 | ❌ | ✅ |
| 매너온도 투표 | ❌ | ✅ |

---

### AI 챗봇 (회원 전용)

- 마이페이지에 등록된 **찜 목록, 기피 음식, 알러지, 저장 장소** 정보를 기반으로 개인화 추천
- **실시간 위치 ON/OFF** 기능으로 현재 위치 주변 식당 즉시 안내
- **추천 모드 / Q&A 모드** 분리 운영
- OpenAI **GPT-4o-mini** 기반 자연어 처리

---

### 메뉴 추천

- 카테고리별 필터링 (한식·중식·일식·양식·분식·치킨·피자·카페·술집)
- 별점·추천수·거리 기준 정렬
- 식당 상세 페이지에서 **리뷰 및 별점 작성** 가능
- **영업시간** 표시 및 **카카오맵** 위치 연동
- 홈 화면 **실시간 인기 검색어** + 오늘의 추천 맛집 찜하기

---

### 파티 기능

- 식당 선정 후 파티 구성 (혼밥 / 소모임)
- 파티 내 **실시간 채팅** 지원 (Socket.IO)
- 파티원 **강퇴 / 신고 / 탈퇴** 기능
- 파티 상태 관리: 모집중 → 마감 → 완료
- **파티 알림**: 참여자 생겼을 때 + 시작 10분/5분 전 알림
- 파티 리뷰 탭 — 해당 식당 실제 리뷰 표시

---

### 매너온도 시스템

| 온도 | 상태 | 조치 |
|---|---|---|
| 36.5°C 기준 | 정상 | 이용 가능 |
| 일정 온도 이하 | 주의 | 1차 이용 제한 |
| 누적 3회 | 위험 | 장기 이용 정지 |

- 하루 유저당 **2회** 업/다운 투표 가능
- 시간이 지나면 자동 복구

---

### 게임 기능 (4종)

| 게임 | 설명 |
|---|---|
| 룰렛 | 30개 메뉴 중 랜덤 뽑기 |
| 스무고개 | 예/아니오 질문으로 AI가 메뉴 맞추기 |
| 월드컵 | 32개 메뉴 토너먼트 1:1 대결 |
| 뽑기 | 긁어서 메뉴 확인 |

---

### 마이페이지

- 프로필 수정 (닉네임·성별·주소·음식 취향·알러지)
- 찜 목록 / 활동 내역 / 파티 참여 기록
- **내가 쓴 리뷰** 목록
- 매너온도 상세 내역 확인
- 저장 장소 최대 3개 관리 (집·직장 등)

---

### 이메일 / 비밀번호 찾기

- **이메일 찾기**: 닉네임 + 보안질문 + 답변으로 이메일 조회
- **비밀번호 찾기**: 이메일 + 닉네임 인증 후 새 비밀번호 설정

---

### 고객센터

- **FAQ** — 자주 묻는 질문
- **1:1 문의** — 직접 문의 접수 → 관리자 답변 연동
- **공지사항** — 관리자 작성/삭제 → 실시간 반영

---

### 관리자 페이지 (`/admin`)

| 탭 | 기능 |
|---|---|
| 유저 관리 | 전체 유저 목록 (15개씩 페이지네이션), 검색, 강제 탈퇴 |
| 식당 관리 | 식당 목록, 신규 등록, 삭제 |
| 문의 관리 | 1:1 문의 목록, 답변 등록 |
| 공지 관리 | 공지사항 작성, 삭제 |
| 신고 관리 | 신고 목록, 처리 완료, 파티 확인 |
| 리뷰 관리 | 전체 리뷰 조회 (15개씩 페이지네이션), 식당명 검색, 삭제 |

---

## 화면 구성

> 스크린샷은 `docs/screenshots/` 폴더에 저장해주세요.

### 홈 화면
![홈 화면](./docs/screenshots/home.jpeg)

### 로그인 / 회원가입
| 로그인 | 회원가입 |
|---|---|
| ![로그인](./docs/screenshots/login.jpeg) | ![회원가입](./docs/screenshots/register.jpeg) |

### 메뉴 목록 / 상세
| 메뉴 목록 | 메뉴 상세 + 리뷰 |
|---|---|
| ![메뉴 목록](./docs/screenshots/menu.jpeg) | ![메뉴 상세](./docs/screenshots/menu_detail.jpeg) |

### 파티
| 파티 목록 | 파티 상세 + 채팅 |
|---|---|
| ![파티 목록](./docs/screenshots/party.jpeg) | ![파티 상세](./docs/screenshots/party_detail.jpeg) |

### AI 챗봇
![챗봇](./docs/screenshots/chatbot.png)

### 마이페이지
| 마이페이지 | 매너온도 상세 |
|---|---|
| ![마이페이지](./docs/screenshots/mypage.jpeg) | ![매너온도](./docs/screenshots/manner.jpeg) |

### 게임
| 룰렛 | 월드컵 |
|---|---|
| ![룰렛](./docs/screenshots/game_roulette.jpeg) | ![월드컵](./docs/screenshots/game_worldcup.jpeg) |

| 스무고개 | 뽑기 |
|---|---|
| ![스무고개](./docs/screenshots/game_twentyq.jpeg) | ![뽑기](./docs/screenshots/game_scratch.jpeg) |

### 고객센터 / 관리자
| 고객센터 | 관리자 |
|---|---|
| ![고객센터](./docs/screenshots/support.jpeg) | ![관리자](./docs/screenshots/admin.jpeg) |

---

## 기술 스택

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss)
![SocketIO](https://img.shields.io/badge/Socket.IO-Client-010101?logo=socketdotio)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios)

### Backend
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask)
![SocketIO](https://img.shields.io/badge/Flask--SocketIO-5.6-010101)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00)

### Database & Infra
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Render](https://img.shields.io/badge/Render-Backend-46E3B7?logo=render)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel)
![UptimeRobot](https://img.shields.io/badge/UptimeRobot-Monitoring-brightgreen)

### AI & API
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)
![Kakao](https://img.shields.io/badge/Kakao-Map%20%2F%20Login-FFCD00?logo=kakao)
![Naver](https://img.shields.io/badge/Naver-Login-03C75A?logo=naver)

---

## 프로젝트 구조

```
today-menu/
├── front/
│   ├── index.html
│   ├── vite.config.js              ← 프록시 (Flask :5000 자동 연결)
│   ├── vercel.json                 ← Vercel 배포 설정
│   └── src/
│       ├── App.jsx                 ← 라우터 + AuthContext + PrivateRoute
│       ├── utils.js
│       ├── api/
│       │   ├── axiosInstance.js    ← JWT 인터셉터
│       │   └── services.js         ← API 함수 모음
│       ├── components/
│       │   ├── Header.jsx          ← 헤더 + 파티 알림 벨
│       │   ├── Footer.jsx
│       │   ├── ChatBot.jsx         ← AI 챗봇 FAB
│       │   ├── KakaoMap.jsx
│       │   ├── Cafeteria.jsx       ← 식당 카드 (홈 트렌딩)
│       │   ├── RestaurantCard.jsx
│       │   ├── RestaurantImage.jsx
│       │   ├── RestaurantSearch.jsx
│       │   ├── ReviewModal.jsx
│       │   ├── PartyNotification.jsx ← 파티 알림 (10분/5분 전)
│       │   └── ScrollToTop.jsx
│       └── pages/
│           ├── Home.jsx            ← 홈 (트렌딩 + 실시간 인기 검색어)
│           ├── Login.jsx
│           ├── FindPassword.jsx    ← 비밀번호 찾기
│           ├── FindId.jsx          ← 이메일 찾기
│           ├── Register.jsx
│           ├── Menu.jsx
│           ├── MenuDetail.jsx
│           ├── Party.jsx
│           ├── PartyCreate.jsx
│           ├── PartyDetail.jsx     ← 실시간 채팅 + 리뷰
│           ├── MyPage.jsx          ← 찜/리뷰/활동내역
│           ├── MyPageEdit.jsx
│           ├── MannerHistory.jsx
│           ├── Game.jsx            ← 룰렛/스무고개/월드컵/뽑기
│           ├── Notice.jsx
│           ├── Support.jsx
│           ├── AdminPage.jsx       ← 관리자 (6탭)
│           ├── Company.jsx
│           ├── Terms.jsx
│           ├── Terms2.jsx
│           └── NotFound.jsx
└── back/
    ├── run.py
    ├── seed.py                     ← DB 초기화 + 시드 데이터
    ├── config.py                   ← psycopg prepare_threshold 설정
    ├── requirements.txt
    ├── render.yaml                 ← Render 배포 설정
    └── app/
        ├── __init__.py             ← CORS + SocketIO + JWT 초기화
        ├── models.py               ← DB 모델 (14개 테이블)
        ├── routes.py               ← REST API 전체
        ├── constants.py
        └── utils.py
```

---

## 데이터베이스 구조 (14개 테이블)

| 테이블 | 설명 |
|---|---|
| `users` | 회원 (역할: USER/ADMIN, 보안질문 포함) |
| `restaurants` | 식당 (영업시간, 위경도, 카테고리, 이미지) |
| `recommendation_logs` | 추천/찜 로그 |
| `parties` | 파티 (상태: RECRUITING/CLOSED/COMPLETED) |
| `party_members` | 파티 멤버 (is_host 포함) |
| `chat_messages` | 파티 실시간 채팅 |
| `manner_votes` | 매너온도 투표 |
| `reviews` | 식당 리뷰·별점 |
| `favorites` | 찜한 식당 |
| `reports` | 신고 내역 |
| `inquiries` | 고객 문의 |
| `notices` | 공지사항 |
| `categories` | 게임 메뉴 카테고리 |
| `menus` | 게임용 메뉴 목록 |

---

## 로컬 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/today-menu-ap/today-menu.git
cd today-menu
```

### 2. 환경변수 설정

`back/.env` 파일 생성:
```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-key
DATABASE_URL=postgresql+psycopg://...
OPENAI_API_KEY=sk-...
KAKAO_REST_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
ALLOWED_ORIGINS=http://localhost:5173
```

`front/.env.local` 파일 생성:
```env
VITE_API_URL=
```
> 로컬에서는 빈 값으로 두면 vite proxy가 자동으로 :5000으로 연결합니다.

### 3. 자동 설치 (Windows)
```bash
setup.bat   # 가상환경 + 패키지 + DB 초기화 한번에
start.bat   # 백엔드 + 프론트 동시 실행
```

### 4. 수동 실행
```bash
# 백엔드
cd back
pip install -r requirements.txt
python seed.py
python run.py

# 프론트엔드
cd front
npm install
npm run dev
```

### 5. 접속
- 프론트: http://localhost:5173
- 백엔드: http://localhost:5000

---

## 배포 환경

| 구분 | 서비스 | 비고 |
|---|---|---|
| Frontend | Vercel | GitHub 자동 배포 |
| Backend | Render | Python 3.11 |
| Database | Supabase PostgreSQL | 포트 5432 Session mode |
| Uptime | UptimeRobot | 5분마다 ping (슬립 방지) |

---

## 테스트 계정

| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 일반 | test01@test.com | 1234 |
| 관리자 | asdf@asdf.com | 1234 |
| 시드 유저 | seed_001@test.com ~ seed_100@test.com | test1234 |

---

## 팀원

| 역할 | 이름 |
|---|---|
| PM / 기획 | |
| Frontend | |
| Backend | |
| Design | |
| Full-Stack | |

---

## 라이선스

MIT License © 2026 오늘뭐먹지팀
