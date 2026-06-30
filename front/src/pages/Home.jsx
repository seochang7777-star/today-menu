// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getRestaurants, getNearby } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantSearch from '../components/RestaurantSearch'

const CAT_ICON = { 한식: '🍚', 일식: '🍣', 중식: '🥡', 양식: '🥩', 분식: '🍜', 치킨: '🍗', 피자: '🍕', 카페: '☕' }
const TREND_FOODS = ['삼겹살', '치킨', '짜장면', '순대국', '초밥', '파스타', '비빔밥', '떡볶이']

const SAMPLE_RESTAURANTS = [
  {
    id: 'sample-1',
    name: '홍대 고기집',
    category: '한식',
    address: '서울 마포구 홍대입구',
    avg_rating: 4.8,
    review_count: 128,
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=80',
    tags: ['#홍대', '#데이트', '#고기맛집'],
  },
  {
    id: 'sample-2',
    name: '연남 파스타',
    category: '양식',
    address: '서울 마포구 연남동',
    avg_rating: 4.6,
    review_count: 96,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80',
    tags: ['#연남동', '#파스타', '#데이트'],
  },
  {
    id: 'sample-3',
    name: '중화루',
    category: '중식',
    address: '서울 중구 명동',
    avg_rating: 4.5,
    review_count: 78,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80',
    tags: ['#중식', '#짜장면', '#가성비'],
  },
  {
    id: 'sample-4',
    name: '카페 모먼트',
    category: '카페',
    address: '서울 성동구 성수동',
    avg_rating: 4.7,
    review_count: 54,
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
    tags: ['#카페', '#디저트', '#분위기'],
  },
]

const heroLayoutClass = 'mb-[30px] grid grid-cols-[minmax(0,1fr)_400px] gap-7 max-lg:grid-cols-1'
const mainBannerClass = 'relative h-[290px] overflow-hidden rounded-[var(--border-radius-lg)] shadow-[var(--shadow-sm)]'
const slideBaseClass = 'absolute left-0 top-0 z-[1] flex h-full w-full items-center justify-between gap-6 px-10 py-8 text-white opacity-0 transition-opacity duration-[600ms] ease-in-out max-md:items-start max-md:px-6'
const slideActiveClass = 'z-[2] opacity-100'
const slideBackgrounds = [
  '[background:radial-gradient(circle_at_85%_22%,rgba(255,255,255,0.26),transparent_26%),linear-gradient(135deg,#FF6970,var(--color-primary))]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(135deg,#FEB95C,#F46C6F)]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,238,127,0.35),transparent_25%),linear-gradient(135deg,#F1B8AE,#F46C6F)]',
]
const bannerCopyClass = 'relative z-[2] max-w-[430px]'
const bannerTitleClass = 'mb-4 text-[clamp(1.65rem,3vw,2.35rem)] font-black leading-[1.12] tracking-[-0.02em]'
const bannerTitleAccentClass = 'mx-0.5 inline-flex translate-y-0.5'
const bannerTextClass = 'mb-6 text-[1rem] font-extrabold leading-[1.7]'
const bannerActionsClass = 'flex flex-wrap gap-[14px]'
const bannerFoodClass = 'relative z-[1] aspect-square w-[min(34%,220px)] flex-none rounded-full border-[10px] border-white/70 object-cover shadow-[0_18px_30px_rgba(85,34,26,0.2)] max-md:hidden'
const bannerDotsClass = 'absolute bottom-[22px] left-1/2 flex -translate-x-1/2 gap-[9px]'
const bannerDotClass = 'h-3 w-3 rounded-full border-2 border-white'
const bannerDotActiveClass = 'bg-white'
const trendCardClass = 'h-[290px] overflow-hidden rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-[18px] shadow-[var(--shadow-sm)]'
const trendTitleClass = 'mb-3 text-[1.05rem] font-black text-[var(--text-primary)]'
const trendListClass = 'flex flex-col gap-2'
const trendItemClass = 'flex items-center gap-2.5 text-[0.9rem] font-medium'
const trendRankClass = 'w-5 font-black text-[var(--color-primary)]'
const trendNameClass = 'flex-1 text-[var(--text-secondary)]'
const trendUpClass = 'text-[var(--color-primary)]'

export default function Home() {
  const { user } = useAuth()
  const [trending, setTrending] = useState([])
  const [nearby, setNearby] = useState([])
  const [userLoc, setUserLoc] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')
  const [bannerIdx, setBannerIdx] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const bannerTimer = useRef(null)

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 })
      .then((d) => setTrending(d.items?.length ? d.items : SAMPLE_RESTAURANTS))
      .catch((err) => {
        console.error('trending 로드 실패:', err)
        setTrending(SAMPLE_RESTAURANTS)
      })
  }, [])

  useEffect(() => {
    bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 3), 4500)
    return () => clearInterval(bannerTimer.current)
  }, [])

  const findNearby = () => {
    if (!navigator.geolocation) return alert('위치 서비스 미지원')
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const loc = { lat: coords.latitude, lng: coords.longitude }
      setUserLoc(loc)
      try {
        const data = await getNearby({ lat: loc.lat, lng: loc.lng })
        setNearby(data)
        setLocStatus('done')
      } catch {
        setLocStatus('error')
      }
    }, () => setLocStatus('error'))
  }

  const visibleRestaurants = trending.length ? trending : SAMPLE_RESTAURANTS

  return (
    <div className="home-page">
      <main className="home-container">
        <section className={heroLayoutClass}>
          <div className={mainBannerClass}>
            <div className={`${slideBaseClass} ${slideBackgrounds[0]} ${bannerIdx === 0 ? slideActiveClass : ''}`}>
              <div className={bannerCopyClass}>
                <h1 className={bannerTitleClass}>
                  HAVE A G<span className={bannerTitleAccentClass}>🕘</span>OD TIME
                </h1>
                <p className={bannerTextClass}>AI가 추천하는 오늘의 베스트 맛집<br />지금, 당신의 취향을 찾아보세요!</p>
                <div className={bannerActionsClass}>
                  <Link to="/menu" className="btn btn-light">추천 맛집 보기 →</Link>
                  <Link to="/game" className="btn btn-yellow">랜덤 메뉴 추천 🎲</Link>
                </div>
              </div>
              <img
                className={bannerFoodClass}
                src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80"
                alt="파스타"
              />
              <div className={bannerDotsClass}>
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className={`${bannerDotClass} ${bannerIdx === dot ? bannerDotActiveClass : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className={`${slideBaseClass} ${slideBackgrounds[1]} ${bannerIdx === 1 ? slideActiveClass : ''}`}>
              <div className={bannerCopyClass}>
                <h1 className={bannerTitleClass}>오늘의 밥친구</h1>
                <p className={bannerTextClass}>혼밥 말고 같이 먹는 즐거움<br />가까운 맛집에서 바로 만나요.</p>
                <div className={bannerActionsClass}>
                  <Link to="/party" className="btn btn-light">밥친구 찾기 →</Link>
                  <button type="button" className="btn btn-yellow" onClick={findNearby}>내 주변 찾기 📍</button>
                </div>
              </div>
              <img
                className={bannerFoodClass}
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80"
                alt="브런치"
              />
            </div>

            <div className={`${slideBaseClass} ${slideBackgrounds[2]} ${bannerIdx === 2 ? slideActiveClass : ''}`}>
              <div className={bannerCopyClass}>
                <h1 className={bannerTitleClass}>AI 메뉴 추천</h1>
                <p className={bannerTextClass}>날씨, 시간, 취향을 분석해서<br />오늘 먹기 좋은 메뉴를 골라드려요.</p>
                <div className={bannerActionsClass}>
                  <Link to="/game" className="btn btn-light">추천 받기 →</Link>
                </div>
              </div>
              <img
                className={bannerFoodClass}
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80"
                alt="피자"
              />
            </div>
          </div>

          <aside className={trendCardClass}>
            <h4 className={trendTitleClass}>🔥 실시간 인기 검색어</h4>
            <div className={trendListClass}>
              {TREND_FOODS.map((food, i) => (
                <Link to={`/menu?q=${food}`} className={trendItemClass} key={food}>
                  <span className={trendRankClass}>{i + 1}</span>
                  <span className={trendNameClass}>{food}</span>
                  <span className={trendUpClass}>↑</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="index-scroll">
          {Object.entries(CAT_ICON).map(([name, icon]) => (
            <Link to={`/menu?cat=${name}`} className="index-item" key={name}>
              <div className="index-thumb">{icon}</div>
              <div className="index-label">{name}</div>
            </Link>
          ))}
        </section>

        <section className="recommend-section">
          <div className="section-title">
            <span>오늘의 추천 맛집</span>
            <Link to="/menu">더보기 →</Link>
          </div>
          <div className="grid-4 restaurant-grid">
            {visibleRestaurants.slice(0, 4).map((r, index) => (
              <Link to={`/menu/${r.id}`} className="card rest-card" key={r.id}>
                <div className="card-img">
                  <img src={r.image ?? SAMPLE_RESTAURANTS[index % SAMPLE_RESTAURANTS.length].image} alt={r.name} />
                  <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                  <span className="heart-btn">♡</span>
                </div>

                <div className="card-body">
                  <div className="card-title">{r.name}</div>
                  <div className="rest-meta">
                    <span className="stars">★</span>
                    <span className="rest-rating">{(r.avg_rating ?? 0).toFixed(1)}</span>
                    <span className="review-count">({r.review_count ?? 0})</span>
                  </div>
                  <div className="rest-addr">{r.category || '기타'} · {r.address || '오늘 뭐먹지 추천 맛집'}</div>
                  <div className="tag-row">
                    {(r.tags ?? [`#${r.category || '맛집'}`, '#추천', '#오늘뭐먹지']).slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="quick-panels">
          <div className="quick-card map-card">
            <div>
              <h3>📍 내 인생 맛집 찾기</h3>
              <p>지금 위치를 기반으로<br />인생맛집을 찾아보세요!</p>
              <Link to="/menu" className="btn btn-light">맛집 찾기 →</Link>
            </div>
            <div className="map-illust">📍</div>
          </div>

          <div className="quick-card ai-card">
            <div>
              <h3>오늘 뭐먹지?</h3>
              <p>예산, 시간, 내 취향을 분석해서<br />오늘의 메뉴를 추천해드려요!</p>
              <Link to="/game" className="btn btn-light">추천 받기 →</Link>
            </div>
            <div className="robot-illust">🤖</div>
          </div>
        </section>

        {user && (
          <section className="nearby-section">
            <div className="section-title">
              <span>📍 내 주변 추천</span>
              <div className="nearby-actions">
                <button className="btn btn-secondary" onClick={() => setShowSearch((s) => !s)}>
                  {showSearch ? '패널 닫기' : '식당 검색/등록'}
                </button>
                <button className="btn btn-secondary" onClick={findNearby}>
                  {locStatus === 'loading' ? '확인 중...' : '위치 불러오기'}
                </button>
              </div>
            </div>

            {showSearch && (
              <div className="search-panel">
                <h4>카카오 식당 검색 & DB 등록</h4>
                <RestaurantSearch
                  userLoc={userLoc}
                  onRegister={() => {
                    if (userLoc) findNearby()
                  }}
                />
              </div>
            )}

            {locStatus === 'error' && <div className="empty-state">위치 권한을 허용해주세요.</div>}
            {locStatus === 'idle' && !showSearch && <div className="empty-state">위치를 불러오면 주변 식당을 보여드려요.</div>}
            {locStatus === 'done' && (
              <>
                {userLoc && (
                  <div className="map-wrap">
                    <KakaoMap
                      center={userLoc}
                      markers={nearby.map((r) => ({ lat: r.latitude ?? r.lat, lng: r.longitude ?? r.lng, name: r.name, category: r.category, dist: r.dist, id: r.id }))}
                      height="280px"
                    />
                  </div>
                )}
                {nearby.length === 0 && <div className="empty-state">주변 500m 내 식당이 없습니다.</div>}
              </>
            )}
          </section>
        )}

        <section className="ad-banner">
          <Link to="/party" className="ad-banner-link" aria-label="파티 페이지로 이동">
            <img src="/img/banner/banner1.png" alt="파티 만들기 배너" />
          </Link>
        </section>
      </main>
    </div>
  )
}
