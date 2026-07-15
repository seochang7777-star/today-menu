#  오늘 뭐먹지?

> AI 기반 메뉴 추천 플랫폼 — 혼밥부터 파티까지, 오늘 뭐먹을지 고민 끝!

[![Cloudflare](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020?logo=cloudflare)](https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://today-menu-backend.onrender.com)
[![Supabase](https://img.shields.io/badge/DB-Supabase_PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![UptimeRobot](https://img.shields.io/badge/Uptime-UptimeRobot-brightgreen)](https://uptimerobot.com)
[![PWA](https://img.shields.io/badge/PWA-Capacitor-119EFF?logo=capacitor)](https://capacitorjs.com)

---

## 프로젝트 소개

**오늘 뭐먹지?** 는 10~30대를 주 타겟으로 한 AI 기반 메뉴 추천 서비스입니다.  
비회원도 기본 메뉴 탐색이 가능하며, 회원가입 시 개인화된 다양한 기능을 이용할 수 있습니다.

- **서비스 URL**: https://today-menu-git-main-sdhuen01-3018s-projects.vercel.app
- **GitHub**: https://github.com/today-menu-ap/today-menu

---

## 주요 기능

### 회원 / 비회원 구분

| 기능 | 비회원 | 회원 |
|---|:---:|:---:|
| 메뉴 탐색 | ✅ | ✅ |
| 게임 이용 | ✅ | ✅ |
| 공지사항 / 고객센터 | ✅ | ✅ |
| AI 챗봇 (개인화 추천) | ❌ | ✅ |
| 찜 목록 관리 | ❌ | ✅ |
| 파티 참여 / 생성 | ❌ | ✅ |
| 마이페이지 | ❌ | ✅ |
| 리뷰 / 별점 작성 | ❌ | ✅ |
| 매너온도 투표 | ❌ | ✅ |

---

### AI 챗봇 (회원 전용)

- 마이페이지에 등록된 **찜 목록, 기피 음식, 알러지, 저장 장소** 정보를 기반으로 개인화 추천
- **실시간 위치 ON/OFF** — 현재 위치 반경 1km 내 식당 즉시 안내
- **주소지 기반 검색** — 저장된 주소를 카카오 API로 좌표 변환 후 주변 식당 추천
- **추천 모드 / Q&A 모드** 분리 운영
- Q&A 모드: 이용약관·개인정보처리방침·공지사항(DB 실시간) 기반 답변
- 답변 내 키워드 감지 → **ACTION_LINKS** 자동 버튼 생성 (비밀번호찾기·마이페이지 등)
- OpenAI **GPT-4o-mini** 기반 자연어 처리

---

### 메뉴 탐색

- 카테고리별 필터링 (한식·중식·일식·양식·분식·치킨·피자·카페·술집)
- 별점·찜 많은 순·이름순·최신순 정렬
- 식당 상세 페이지에서 **리뷰 및 별점 작성** 가능
- **영업시간** 표시 및 **카카오맵** 위치 연동
- 홈 화면 **실시간 인기 검색어** (서버 DB 기반) + 오늘의 추천 맛집

---

### 파티 기능

- 식당·시간·인원 설정 후 파티 생성
- 파티 내 **실시간 채팅** (Socket.IO)
- 파티원 **강퇴 / 신고 / 탈퇴** 기능
- **파티 상태 관리**: 모집중 → 마감 → 완료 (1분마다 APScheduler 자동 종료)
- 모집 인원 미달 시 마감 → 탈퇴 발생 시 **자동 재모집** 전환
- **파티 알림**: 소켓 기반 참여·퇴장 알림 + 시작 10분/5분 전 알림
- 파티 상세에서 파티원 **매너온도 투표** 가능

---

### 매너온도 시스템

| 온도 | 상태 |
|---|---|
| 36.5°C 기준 | 정상 이용 |
| ↑ 상승 | 긍정 투표 +1.0°C |
| ↓ 하락 | 부정 투표 -1.0°C |
| 범위 | 20°C ~ 50°C |

- 하루 유저당 **2회** 투표 가능 (같은 대상 하루 1회)
- 자신에게 투표 불가
- 매너온도 상세 내역 (받은·준 투표 / 통계 포함)

---

### 게임 기능 (5종)

| 게임 | 설명 | 결과 |
|---|---|---|
| 룰렛 | 30개 메뉴 중 랜덤 뽑기 | 해당 카테고리 메뉴 목록 이동 |
| 스무고개 | 예/아니오 10문답으로 메뉴 추론 | 정답 카테고리 메뉴 목록 이동 |
| 월드컵 | 32개 메뉴 토너먼트 1:1 대결 | 우승 카테고리 메뉴 목록 이동 |
| 뽑기 | 긁어서 메뉴 확인 | 당첨 카테고리 메뉴 목록 이동 |
| 사다리 | 사다리 타고 메뉴 확인 | 결과 카테고리 메뉴 목록 이동 |

---

### 마이페이지 (4탭)

| 탭 | 기능 |
|---|---|
| 활동 내역 | 파티 참여 기록, 최근 추천 로그 |
| 내가 쓴 리뷰 | 작성한 리뷰 목록 |
| 메뉴 찜 목록 | 찜한 식당 목록 / 찜 해제 |
| 나의 맛집 장소 | 자주 가는 장소 최대 3개 관리 (챗봇 위치 기반 추천 연동) |

- 프로필 수정: 닉네임·성별·주소·음식 취향·알러지·보안질문
- 비밀번호 변경 (현재 비밀번호 확인 → 새 비밀번호 설정)
- 매너온도 상세 내역 (통계 포함)
- 회원 탈퇴 (관련 데이터 전체 삭제)

---

### 이메일 / 비밀번호 찾기

- **이메일 찾기**: 닉네임 + 보안질문 + 답변으로 이메일 조회
- **비밀번호 찾기**: 이메일 + 닉네임 인증 후 새 비밀번호 설정

---

### 고객센터

- **FAQ** — 자주 묻는 질문
- **1:1 문의** — 직접 문의 접수 → 관리자 답변 등록 → 고객센터 실시간 반영
- **공지사항** — 관리자 작성/삭제 → 게시판 즉시 반영 (없을 시 기본 공지 표시)

---

### 관리자 페이지 (`/admin`)

| 탭 | 기능 |
|---|---|
| 유저 관리 | 전체 유저 목록 (15개씩 페이지네이션), 검색, 강제 탈퇴 (관련 데이터 전체 삭제) |
| 식당 관리 | 카테고리별 드롭다운, 15개씩 페이지네이션, 신규 등록 (영업시간 포함), 삭제 |
| 문의 관리 | 1:1 문의 목록, 답변 등록 (관리자 전용), 답변완료/대기 상태 표시 |
| 공지 관리 | 공지사항 작성 (카테고리 선택), 삭제 |
| 신고 관리 | 신고 목록, 처리 완료, 파티 바로가기 |
| 리뷰 관리 | 전체 리뷰 조회 (15개씩 페이지네이션), 식당명 검색, 삭제 |

---

## 화면 구성

### 홈 화면
![홈 화면](./docs/screenshots/Home.png) | ![홈(모바일)](./docs/screenshots/mobile_Home.png) |

### 로그인 / 회원가입
| 로그인 | 회원가입 |
|---|---|
| ![로그인](./docs/screenshots/login.jpeg) | ![회원가입](./docs/screenshots/register.jpeg) |
| ![로그인(모바일)](./docs/screenshots/login_m.png) | ![회원가입(모바일)](./docs/screenshots/register_m.png) |

### 메뉴 목록 / 상세
| 메뉴 목록 | 메뉴 상세 + 리뷰 |
|---|---|
| ![메뉴 목록](./docs/screenshots/Menu.png) | ![메뉴 상세](./docs/screenshots/MenuDetail.png) |
| ![메뉴 목록(모바일)](./docs/screenshots/mobile_menu.png) | ![메뉴 목록(모바일)](./docs/screenshots/mobile_menuDetail.png) |

### 파티
| 파티 목록 | 파티 상세 + 채팅 |
|---|---|
| ![파티 목록](./docs/screenshots/party.png) | ![파티 상세](./docs/screenshots/party_detail.png) |
| ![파티 목록(모바일)](./docs/screenshots/party_m.png) | ![파티 상세](./docs/screenshots/party_detail_m.png) |

### AI 챗봇
| 메뉴 추천 | Q & A |
|---|---|
| ![챗봇 추천](./docs/screenshots/chatbot_rec(2).png) | ![챗봇 QnA 1](./docs/screenshots/chatbot_qna1.png)<br><br>![챗봇 QnA 2](./docs/screenshots/chatbot_qna2.png) | ![챗봇 추천(모바일)](./docs/screenshots/mobile_menu.png) |

### 마이페이지
| 마이페이지 | 프로필 수정 |
|---|---|
| ![마이페이지](./docs/screenshots/mypage.png) | ![프로필수정](./docs/screenshots/mypageedit.png) |
| ![마이페이지(모바일)](./docs/screenshots/mypage_m.png) | ![프로필수정(모바일)](./docs/screenshots/mypageedit_m.png) |

### 게임
| 룰렛 | 월드컵 |
|---|---|
| ![룰렛](./docs/screenshots/game_roulette(1).png) | ![월드컵](./docs/screenshots/game_worldcup1.png) |
| ![룰렛(모바일)](./docs/screenshots/mobile_rullet.png) | ![월드컵(모바일)](./docs/screenshots/mobile_worldcup.png) |

| 스무고개 | 뽑기 |
|---|---|
| ![스무고개](./docs/screenshots/game_20tree.png) | ![뽑기](./docs/screenshots/game_ticket.png) |
| ![스무고개(모바일)](./docs/screenshots/mobile_20tree.png) | ![뽑기(모바일)](./docs/screenshots/mobile_game_ticket.png) |

| 사다리 |
|---|
| ![사다리](./docs/screenshots/gmae_ladder.png) | ![사다리(모바일)](./docs/screenshots/mobile_ladder.png) |

### 고객센터 / 관리자
| 고객센터 | 관리자 |
|---|---|
| ![고객센터](./docs/screenshots/support.jpeg) | ![관리자](./docs/screenshots/admin.jpeg) |
| ![고객센터(모바일)](./docs/screenshots/support_m.png) | ![관리자(모바일)](./docs/screenshots/admin_m.png) |

---

## 기술 스택

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss)
![SocketIO](https://img.shields.io/badge/Socket.IO-Client-010101?logo=socketdotio)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios)
![Capacitor](https://img.shields.io/badge/Capacitor-PWA%2FAndroid-119EFF?logo=capacitor)

### Backend
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask)
![SocketIO](https://img.shields.io/badge/Flask--SocketIO-실시간채팅-010101)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens)
![APScheduler](https://img.shields.io/badge/APScheduler-파티자동종료-FF6B6B)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00)

### Database & Infra
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Render](https://img.shields.io/badge/Render-Backend-46E3B7?logo=render)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-Frontend-F38020?logo=cloudflare)
![UptimeRobot](https://img.shields.io/badge/UptimeRobot-Monitoring-brightgreen)

### AI & API
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)
![Kakao](https://img.shields.io/badge/Kakao-Map%20%2F%20Login%20%2F%20Local-FFCD00?logo=kakao)
![Naver](https://img.shields.io/badge/Naver-Login-03C75A?logo=naver)

---

## 프로젝트 구조

```
today-menu/
├── front/
│   ├── index.html                     ← Vite 진입점 + PWA 메타태그 + SW 등록
│   ├── vite.config.js                 ← 프록시 + manualChunks 분리
│   ├── package.json                   ← React 19 + Tailwind v4 + Axios + SocketIO + Capacitor
│   ├── capacitor.config.json          ← Capacitor (PWA/Android WebView) 설정
│   ├── vercel.json                    ← Vercel/Cloudflare 배포 설정
│   ├── .env                           ← VITE_API_URL
│   └── src/
│       ├── App.jsx                    ← 라우터 + AuthContext + PrivateRoute + useAuth
│       ├── api/
│       │   ├── axiosInstance.js       ← JWT 인터셉터 (401 → refresh 자동 재발급)
│       │   └── services.js            ← API 엔드포인트 함수 모음 (54개)
│       ├── components/
│       │   ├── ChatBot.jsx            ← AI 챗봇 FAB (추천/Q&A + ACTION_LINKS)
│       │   ├── PartyNotification.jsx  ← 파티 알림 (소켓 + 10분/5분 전 알림)
│       │   ├── RestaurantSearch.jsx   ← 카카오 로컬 API 식당 검색
│       │   ├── RandomBanner.jsx       ← 홈 랜덤 배너 (chatbot/party/game/menu)
│       │   ├── ReviewModal.jsx        ← 리뷰/별점 작성 모달
│       │   ├── Header.jsx / Footer.jsx
│       │   └── ...
│       ├── pages/
│       │   ├── Home.jsx               ← 슬라이더 + AI챗봇 + 실시간 인기검색어 + 내주변
│       │   ├── Menu.jsx               ← 카테고리 필터 + 검색 + 페이지네이션
│       │   ├── MenuDetail.jsx         ← 영업시간 + 카카오맵 + 리뷰
│       │   ├── Party.jsx / PartyCreate.jsx / PartyDetail.jsx
│       │   ├── MyPage.jsx             ← 4탭 (활동/리뷰/찜/장소) + 탈퇴
│       │   ├── MyPageEdit.jsx         ← 프로필 수정 + 비밀번호 변경
│       │   ├── Game.jsx               ← 5종 게임 (룰렛/스무고개/월드컵/뽑기/사다리)
│       │   ├── MannerHistory.jsx      ← 매너온도 상세 + 통계
│       │   ├── AdminPage.jsx          ← 관리자 6탭
│       │   ├── Support.jsx / Notice.jsx
│       │   ├── Login.jsx / Register.jsx
│       │   ├── FindPassword.jsx / FindId.jsx
│       │   └── ...
│       └── data/
│           ├── termsContent.js        ← 이용약관 (챗봇 Q&A 컨텍스트 활용)
│           └── privacyContent.js      ← 개인정보처리방침
└── back/
    ├── .env                           ← DATABASE_URL, SECRET_KEY, OPENAI_API_KEY 등
    ├── run.py / main.py / config.py
    ├── seed.py                        ← DB 초기화 + 시드 (유저 102명, 찜/리뷰 5개씩)
    ├── requirements.txt
    ├── render.yaml                    ← Render 배포 설정
    ├── install.bat / setup.bat        ← 로컬 설치/실행 스크립트
    └── app/
        ├── __init__.py                ← CORS + SocketIO + JWT + APScheduler (파티 자동 종료)
        ├── models.py                  ← DB 모델 (16개 테이블)
        ├── routes.py                  ← REST API (87개 함수)
        ├── constants.py
        └── utils.py
```

---

## 데이터베이스 구조 (16개 테이블)

| 테이블 | 설명 |
|---|---|
| `users` | 회원 (역할: USER/ADMIN, 보안질문, 매너온도, 저장장소) |
| `restaurants` | 식당 (영업시간, 위경도, 카테고리, 이미지) |
| `parties` | 파티 (RECRUITING / CLOSED / COMPLETED) |
| `party_members` | 파티 멤버 (is_host 포함) |
| `chat_messages` | 파티 실시간 채팅 |
| `recommendation_logs` | 추천 / 찜 로그 |
| `manner_votes` | 매너온도 투표 |
| `favorites` | 찜한 식당 |
| `reviews` | 식당 리뷰·별점 |
| `reports` | 신고 내역 (reporter_id / target_id) |
| `inquiries` | 1:1 고객 문의 |
| `notices` | 공지사항 |
| `categories` | 게임 메뉴 카테고리 |
| `menus` | 게임용 메뉴 목록 (45개) |
| `search_log` | 실시간 검색어 로그 |
| `saved_locations` | 저장 장소 (최대 3개, 챗봇 위치 기반 추천 연동) |

---

## 로컬 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/today-menu-ap/today-menu.git
cd today-menu
```

### 2. 환경변수 설정

**`back/.env`**
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

**`front/.env.local`**
```env
VITE_API_URL=
```
> 로컬에서는 빈 값으로 두면 Vite proxy가 자동으로 `:5000`으로 연결합니다.

### 3. 자동 실행 (Windows)
```bash
install.bat   # 가상환경 + 패키지 + DB 초기화
setup.bat     # 백엔드 + 프론트 동시 실행
```

### 4. 수동 실행
```bash
# 백엔드
cd back
pip install -r requirements.txt
python seed.py
python run.py

# 프론트엔드 (새 터미널)
cd front
npm install
npm run dev
```

### 5. 접속
| 구분 | URL |
|---|---|
| 프론트 | http://localhost:5173 |
| 백엔드 | http://localhost:5000 |

---

## 배포 환경

| 구분 | 서비스 | 비고 |
|---|---|---|
| Frontend | Cloudflare Pages | GitHub 자동 배포, 무제한 동시접속 |
| Backend | Render | Python 3.11 |
| Database | Supabase PostgreSQL | 포트 5432 Session mode |
| Uptime | UptimeRobot | 5분마다 ping (슬립 방지) |
| 스케줄러 | APScheduler | 1분마다 만료 파티 자동 종료 |

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
