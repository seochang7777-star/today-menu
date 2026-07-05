#  오늘 뭐먹지?

> AI 기반 메뉴 추천 플랫폼 — 혼밥부터 파티까지, 오늘 뭐먹을지 고민 끝!

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black)](https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-blue)](https://today-menu-backend.onrender.com)
[![Supabase](https://img.shields.io/badge/DB-Supabase-green)](https://supabase.com)
[![UptimeRobot](https://img.shields.io/badge/Uptime-UptimeRobot-brightgreen)](https://uptimerobot.com)

---

##  프로젝트 소개

**오늘 뭐먹지?** 는 10~30대를 주 타겟으로 한 AI 기반 메뉴 추천 서비스입니다.  
비회원도 기본 메뉴 추천이 가능하며, 회원가입 시 개인화된 다양한 기능을 이용할 수 있습니다.

-  **서비스 URL**: https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app
-  **GitHub**: https://github.com/today-menu-ap/today-menu

---

##  주요 기능

###  회원 / 비회원 구분

| 기능 | 비회원 | 회원 |
|---|:---:|:---:|
| 메뉴 추천 | ✅ | ✅ |
| 챗봇 이용 | ❌ | ✅ |
| 찜 목록 관리 | ❌ | ✅ |
| 파티 참여/생성 | ❌ | ✅ |
| 마이페이지 | ❌ | ✅ |
| 리뷰/별점 작성 | ❌ | ✅ |
| 매너온도 투표 | ❌ | ✅ |
| 게임 이용 | ✅ | ✅ |

---

###  AI 챗봇 (회원 전용)

- 마이페이지에 등록된 **찜 목록, 기피 음식, 알러지, 저장 장소** 정보를 기반으로 개인화 추천
- **실시간 위치 ON/OFF** 기능으로 현재 위치 주변 식당 즉시 안내
- 찜/기피 정보가 없으면 **인기순·추천수 기준**으로 안내
- **추천 모드 / Q&A 모드** 분리 운영
  - 추천 모드: 메뉴 및 식당 추천
  - Q&A 모드: 서비스 이용 방법, 자주 묻는 질문 안내

---

###  메뉴 추천

- 카테고리별 필터링 (한식·중식·일식·양식·분식·치킨·피자·카페·술집)
- 별점·추천수·거리 기준 정렬
- 식당 상세 페이지에서 **리뷰 및 별점 작성** 가능
- **영업시간** 표시
- **카카오맵** 위치 연동
- 홈 화면 **오늘의 추천 맛집** 하트 버튼으로 즉시 찜하기

---

###  파티 기능

- **식당 선정 후 파티 구성** 가능 (혼밥 / 소모임)
- 파티 내 **실시간 채팅** 지원 (Socket.IO)
- 파티원 **강퇴 / 신고 / 탈퇴** 기능
- 파티 상태 관리: 모집중 → 마감 → 완료
- **파티 알림**: 참여자 생겼을 때 + 시작 10분/5분 전 알림

---

###  매너온도 시스템

- 당근마켓 방식의 **매너온도** 도입
- 하루 유저당 **2회** 업/다운 투표 가능
- 온도 범위별 이용 제한:

| 온도 | 상태 | 조치 |
|---|---|---|
| 36.5°C 기준 | 정상 | 이용 가능 |
| 일정 온도 이하 | 주의 | 1차 이용 제한 (일정 기간) |
| 누적 3회 | 위험 | 장기 이용 정지 |

- 시간이 지나면 자동 복구 / 누적 3회 시 장기 이용 불가

---

###  카카오맵 연동

- **도보 / 자동차** 경로 안내
- **카카오T 택시** 연동 기준 맵 안내
- 저장 장소(집·직장 등) 등록으로 주변 식당 즉시 안내

---

###  게임 기능

메뉴 선택이 너무 어려울 때! 4가지 게임으로 즐겁게 결정하세요.

| 게임 | 설명 |
|---|---|
|  **룰렛** | 30개 메뉴 중 랜덤 뽑기 — 돌려서 나오는 메뉴로 결정 |
|  **스무고개** | 예/아니오 질문으로 AI가 메뉴 맞추기 |
|  **월드컵** | 32개 메뉴 토너먼트 — 1:1 대결로 최종 메뉴 선택 |
|  **뽑기** | 긁어서 메뉴 확인 — 복권처럼 긁으면 메뉴 공개 |

---

###  마이페이지

- 프로필 수정 (닉네임·성별·주소·음식 취향·알러지)
- 찜 목록 / 활동 내역 / 파티 참여 기록
- 매너온도 상세 내역 확인
- 내가 쓴 리뷰 목록
- 저장 장소 최대 3개 관리

---

###  고객센터

- **FAQ** — 자주 묻는 질문
- **1:1 문의** — 직접 문의 접수 → 관리자 답변 연동
- **공지사항** — 서비스 업데이트 안내 → 관리자 작성/삭제 연동
- 악용 사용자 대처, 업체 등록 안내 포함

---

###  관리자 페이지 (`/admin`)

| 탭 | 기능 |
|---|---|
|  유저 관리 | 전체 유저 목록 (15개씩 페이지네이션), 검색, 강제 탈퇴 |
|  식당 관리 | 식당 목록, 신규 등록, 삭제 |
|  문의 관리 | 1:1 문의 목록, 답변 등록 |
|  공지 관리 | 공지사항 작성, 삭제 |
|  신고 관리 | 신고 목록, 처리 완료, 파티 확인 |
|  리뷰 관리 | 전체 리뷰 조회 (15개씩 페이지네이션), 식당명 검색, 삭제 |

---

##  화면 구성

> 아래 이미지를 클릭하면 크게 볼 수 있습니다.

###  홈 화면
![홈 화면](./docs/screenshots/home.jpeg)
> 오늘의 추천 맛집, 카테고리 필터, 근처 식당 안내

###  로그인 / 회원가입
| 로그인 | 회원가입 |
|---|---|
| ![로그인](./docs/screenshots/login.jpeg) | ![회원가입](./docs/screenshots/register.jpeg) |

###  메뉴 목록 / 상세
| 메뉴 목록 | 메뉴 상세 + 리뷰 |
|---|---|
| ![메뉴 목록](./docs/screenshots/menu.jpeg) | ![메뉴 상세](./docs/screenshots/menu_detail.jpeg) |

###  파티
| 파티 목록 | 파티 상세 + 채팅 |
|---|---|
| ![파티 목록](./docs/screenshots/party.jpeg) | ![파티 상세](./docs/screenshots/party_detail.jpeg) |

###  AI 챗봇
![챗봇](./docs/screenshots/chatbot.png)
> 개인화 메뉴 추천 / Q&A 모드

###  마이페이지
| 마이페이지 | 매너온도 상세 |
|---|---|
| ![마이페이지](./docs/screenshots/mypage.jpeg) | ![매너온도](./docs/screenshots/manner.jpeg) |

###  게임
| 룰렛 | 월드컵 |
|---|---|
| ![룰렛](./docs/screenshots/game_roulette.jpeg) | ![월드컵](./docs/screenshots/game_worldcup.jpeg) |

| 스무고개 | 뽑기 |
|---|---|
| ![스무고개](./docs/screenshots/game_twentyq.jpeg) | ![뽑기](./docs/screenshots/game_scratch.jpeg) |

###  고객센터
![고객센터](./docs/screenshots/support.jpeg)

###  관리자 페이지
![관리자](./docs/screenshots/admin.jpeg)

---

> 📁 스크린샷은 `docs/screenshots/` 폴더에 저장해주세요.

---

##  기술 스택

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

##  프로젝트 구조

```
today-menu/
├── front/                        # React 프론트엔드
│   ├── vite.config.js            # 프록시 설정 (로컬 :5000 연결)
│   ├── src/
│   │   ├── App.jsx               # 라우터 + AuthContext
│   │   ├── api/
│   │   │   ├── axiosInstance.js  # JWT 인터셉터
│   │   │   └── services.js       # API 함수 모음
│   │   ├── components/
│   │   │   ├── Header.jsx        # 헤더 + 파티 알림 벨
│   │   │   ├── Footer.jsx
│   │   │   ├── ChatBot.jsx       # AI 챗봇 FAB
│   │   │   ├── KakaoMap.jsx
│   │   │   ├── ReviewModal.jsx
│   │   │   ├── PartyNotification.jsx
│   │   │   └── Cafeteria.jsx     # 식당 카드
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Menu.jsx
│   │       ├── MenuDetail.jsx
│   │       ├── Party.jsx
│   │       ├── PartyCreate.jsx
│   │       ├── PartyDetail.jsx
│   │       ├── MyPage.jsx
│   │       ├── MyPageEdit.jsx
│   │       ├── MannerHistory.jsx
│   │       ├── Game.jsx
│   │       ├── Notice.jsx
│   │       ├── Support.jsx
│   │       ├── AdminPage.jsx     # 관리자 페이지
│   │       ├── Login.jsx
│   │       └── Register.jsx
│   └── public/                   # 정적 파일 (이미지, 아이콘)
│
└── back/                         # Flask 백엔드
    ├── app/
    │   ├── __init__.py           # CORS + SocketIO + JWT 초기화
    │   ├── models.py             # DB 모델 (12개 테이블)
    │   └── routes.py             # REST API 전체
    ├── config.py                 # DB 연결 + psycopg 설정
    ├── run.py
    └── seed.py                   # 초기 데이터 생성
```

---

##  로컬 실행 방법

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
DATABASE_URL=your-supabase-url
OPENAI_API_KEY=sk-...
KAKAO_REST_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

`front/.env.local` 파일 생성:
```env
VITE_API_URL=
```
> 로컬에서는 빈 값으로 두면 vite proxy가 자동으로 :5000으로 연결합니다.

### 3. 백엔드 실행
```bash
cd back
pip install -r requirements.txt
python run.py
```

### 4. 프론트엔드 실행
```bash
cd front
npm install
npm run dev
```

### 5. 접속
- 프론트: http://localhost:5173
- 백엔드: http://localhost:5000

---

##  데이터베이스 구조

| 테이블 | 설명 |
|---|---|
| `users` | 회원 정보 (역할: USER/ADMIN) |
| `restaurants` | 식당 정보 (영업시간, 위경도, 카테고리) |
| `recommendation_logs` | 추천/찜 로그 |
| `parties` | 파티 정보 (상태: RECRUITING/CLOSED/COMPLETED) |
| `party_members` | 파티 멤버 |
| `chat_messages` | 파티 채팅 |
| `manner_votes` | 매너온도 투표 |
| `reviews` | 식당 리뷰·별점 |
| `favorites` | 찜한 식당 |
| `reports` | 신고 내역 |
| `inquiries` | 고객 문의 |
| `notices` | 공지사항 |

---

##  테스트 계정

| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 일반 | test01@test.com | 1234 |
| 관리자 | asdf@asdf.com | 1234 |
| 시드 유저 | seed_001@test.com ~ seed_100@test.com | test1234 |

---

##  팀원

| 역할 | 담당 |
|---|---|
| PM / 기획 | |
| Frontend | |
| Backend | |
| Design | |

---

##  라이선스

MIT License © 2026 오늘뭐먹지팀

