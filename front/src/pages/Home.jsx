// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getRestaurants, getNearby } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantSearch from '../components/RestaurantSearch'

const adBannerClass =
  'w-full overflow-hidden rounded-[12px] bg-white max-md:h-[70px]'
const adBannerLinkClass = 'block h-full w-full'
const adBannerImageClass =
  'h-full w-full object-contain object-center'

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

const heroLayoutClass = 'mb-[26px] grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-5 max-lg:grid-cols-1'
const mainBannerClass = 'relative h-[400px] overflow-hidden rounded-[10px] shadow-[0_8px_22px_rgba(42,29,26,0.08)] max-md:h-[360px]'
const slideBaseClass = 'absolute left-0 top-0 z-[1] flex h-full w-full items-center px-8 py-9 text-white opacity-0 transition-opacity duration-[600ms] ease-in-out sm:px-8 md:px-9 lg:px-8 xl:px-10'
const slideActiveClass = 'z-[2] opacity-100'
const slideBackgrounds = [
  '[background:radial-gradient(circle_at_83%_35%,rgba(255,255,255,0.28),transparent_29%),linear-gradient(135deg,#FF6970,var(--color-primary))]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(135deg,#FEB95C,#F46C6F)]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,238,127,0.35),transparent_25%),linear-gradient(135deg,#F1B8AE,#F46C6F)]',
]
const bannerCopyClass = 'relative z-[2] max-w-[470px] pb-2 mb-0'
const bannerTitleClass = 'mb-4 text-[clamp(2rem,3.4vw,2.55rem)] font-black leading-[1.05] text-white'
const bannerTitleAccentClass = 'mx-0.5 inline-flex translate-y-0.5'
const bannerTextClass = 'mb-9 text-[1.08rem] font-extrabold leading-[1.65]'
const bannerActionsClass = 'flex flex-wrap gap-[5px]'
const heroButtonLightClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5'
const heroButtonYellowClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,var(--color-secondary),var(--color-accent))] px-6 text-[0.94rem] font-black text-[#4B2D07] shadow-[0_10px_18px_rgba(254,185,92,0.25)] transition-transform hover:-translate-y-0.5'

const bannerFoodClass = 'absolute right-0 top-0 bottom-0 z-[1] h-full w-[52%] rounded-l-[999px] rounded-r-none object-cover object-center shadow-[0_18px_30px_rgba(85,34,26,0.2)] max-md:hidden xl:w-[51%]'

const bannerDoodleClass = 'absolute right-8 top-10 z-[2] text-4xl font-black text-white/95 max-md:hidden'
const bannerDotsClass = 'absolute bottom-[17px] left-1/2 z-[3] flex -translate-x-1/2 gap-[8px]'
const bannerDotClass = 'h-3 w-3 rounded-full border-2 border-white'
const bannerDotActiveClass = 'bg-white'
const trendCardClass = 'h-[400px] overflow-hidden rounded-[10px] border border-[var(--border-color)] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(42,29,26,0.08)] max-md:h-auto'
const trendTitleClass = 'mb-[14px] text-[1.05rem] font-black text-[var(--text-primary)]'
const trendListClass = 'flex flex-col gap-[18px]'
const trendItemClass = 'flex items-center gap-2.5 text-[0.9rem] font-medium'
const trendRankClass = 'w-5 font-black text-[#ff5f24]'
const trendNameClass = 'flex-1 text-[var(--text-primary)]'
const trendUpClass = 'text-[1.35rem] leading-none text-[var(--color-primary)]'
const categoryGridClass = 'mb-11 grid grid-cols-8 gap-3 max-lg:grid-cols-4 max-sm:grid-cols-2'
const categoryItemClass = 'flex min-h-[90px] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border-color)] bg-white shadow-[0_8px_18px_rgba(42,29,26,0.07)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow)]'
const categoryIconClass = 'grid h-10 w-10 place-items-center text-[1.75rem]'
const categoryLabelClass = 'text-[0.86rem] font-black text-[var(--text-primary)]'
const recommendSectionClass = 'mb-[38px]'
const recommendTitleWrapClass = 'mb-[18px] flex items-center justify-between font-black max-[540px]:items-end'
const recommendTitleClass = 'relative text-[1.55rem] after:absolute after:left-0 after:bottom-[-8px] after:h-[3px] after:w-[34px] after:rounded-full after:bg-[var(--color-primary)] max-[540px]:text-[1.28rem]'
const recommendMoreClass = 'text-[0.9rem] text-[#7D4213]'
const restaurantGridClass = 'grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-[540px]:grid-cols-2'
const restaurantCardClass = 'group overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-white shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow)]'
const restaurantImageWrapClass = 'relative h-[154px] overflow-hidden bg-[#FFF4EA] max-[540px]:h-[130px]'
const restaurantImageClass = 'h-full w-full object-cover transition-transform duration-[280ms] group-hover:scale-105'
const rankBadgeBaseClass = 'absolute left-0 top-0 grid h-[52px] w-[52px] place-items-center bg-[var(--color-primary)] text-[1.35rem] font-black text-white'
const rankBadgeAccentClass = 'bg-[var(--color-accent)]'
const restaurantBodyClass = 'px-[18px] pb-[18px] pt-4 max-[540px]:p-[14px]'
const restaurantTitleClass = 'mb-1.5 text-[1.08rem] font-black text-[var(--text-primary)]'
const restaurantMetaClass = 'mb-[5px] flex items-center gap-1 text-[0.88rem] text-[var(--text-secondary)]'
const restaurantScoreClass = 'font-black text-[var(--color-primary)]'
const restaurantReviewClass = 'text-[var(--text-secondary)]'
const restaurantAddressClass = 'mb-[14px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] text-[var(--text-secondary)]'
const restaurantTagRowClass = 'flex flex-wrap gap-[7px]'
const restaurantTagClass = 'rounded-[7px] bg-[#FFF0E4] px-2 py-[5px] text-[0.78rem] font-extrabold text-[var(--color-primary)] max-[540px]:text-[0.72rem]'
const quickPanelsClass = 'mb-[18px] grid grid-cols-2 gap-[18px] max-md:grid-cols-1'
const quickCardBaseClass = 'flex min-h-[230px] items-center justify-between gap-[18px] overflow-hidden rounded-[10px] px-[38px] py-8 max-md:px-[22px] max-md:py-7'
const quickMapCardClass = '[background:radial-gradient(circle_at_82%_70%,rgba(255,255,255,0.68),transparent_30%),linear-gradient(135deg,#FFF4A8,#FFE67C)]'
const quickAiCardClass = '[background:radial-gradient(circle_at_88%_50%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(135deg,#FFE1E0,#FFD3D6)]'
const quickTitleClass = 'mb-[14px] text-[1.55rem] font-black'
const quickTextClass = 'mb-[22px] text-[1rem] font-bold leading-[1.7] text-[#2B1D18]'
const quickIllustClass = 'grid h-[150px] w-[150px] flex-none place-items-center rounded-full bg-white/50 text-[5.2rem] [filter:drop-shadow(0_12px_18px_rgba(116,62,38,0.16))] max-md:h-[104px] max-md:w-[104px] max-md:text-[3.6rem]'

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
      <section className={heroLayoutClass}>
        <div className={mainBannerClass}>
          <div className={`${slideBaseClass} ${slideBackgrounds[0]} ${bannerIdx === 0 ? slideActiveClass : ''}`}>
            <div className={bannerCopyClass}>
              <h1 className={bannerTitleClass}>
                HAVE A G<span className={bannerTitleAccentClass}>🕘</span>OD TIME
              </h1>
              <p className={bannerTextClass}>AI가 추천하는 오늘의 베스트 맛집<br />지금, 당신의 취향을 찾아보세요!</p>
              <div className={bannerActionsClass}>
                <Link to="/menu" className={heroButtonLightClass}>추천 맛집 보기 →</Link>
                <Link to="/game" className={heroButtonYellowClass}>랜덤 메뉴 추천 🎲</Link>
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
                <Link to="/party" className={heroButtonLightClass}>밥친구 찾기 →</Link>
                <button type="button" className={heroButtonYellowClass} onClick={findNearby}>내 주변 찾기 📍</button>
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
                <Link to="/game" className={heroButtonLightClass}>추천 받기 →</Link>
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

      <section className={categoryGridClass}>
        {Object.entries(CAT_ICON).map(([name, icon]) => (
          <Link to={`/menu?cat=${name}`} className={categoryItemClass} key={name}>
            <div className={categoryIconClass}>{icon}</div>
            <div className={categoryLabelClass}>{name}</div>
          </Link>
        ))}
      </section>

      <section className={recommendSectionClass}>
        <div className={recommendTitleWrapClass}>
          <span className={recommendTitleClass}>오늘의 추천 맛집</span>
          <Link to="/menu" className={recommendMoreClass}>더보기 →</Link>
        </div>
        <div className={restaurantGridClass}>
          {visibleRestaurants.slice(0, 4).map((r, index) => (
            <Link to={`/menu/${r.id}`} className={restaurantCardClass} key={r.id}>
              <div className={restaurantImageWrapClass}>
                <img
                  className={restaurantImageClass}
                  src={r.image ?? SAMPLE_RESTAURANTS[index % SAMPLE_RESTAURANTS.length].image}
                  alt={r.name}
                />
                <span className={`${rankBadgeBaseClass} ${index === 1 || index === 3 ? rankBadgeAccentClass : ''}`}>
                  {index + 1}
                </span>
                <span
                  className="
    absolute top-3 right-3
    grid place-items-center
    w-[30px] h-[30px]
    rounded-full
    bg-white/90
    text-[#5B4038]
    text-[1.7rem]
    leading-none
    shadow-[0_4px_12px_rgba(0,0,0,0.14)]
  "
                >
                  ♡
                </span>

              </div>

              <div className={restaurantBodyClass}>
                <div className={restaurantTitleClass}>{r.name}</div>
                <div className={restaurantMetaClass}>
                  <span className={restaurantScoreClass}>★</span>
                  <span className={restaurantScoreClass}>{(r.avg_rating ?? 0).toFixed(1)}
                  {r.like_count > 0 && <span style={{fontSize:".72rem",color:"var(--color-primary)",marginLeft:4}}>❤️ {r.like_count}</span>}</span>
                  <span className={restaurantReviewClass}>({r.review_count ?? 0})</span>
                </div>
                <div className={restaurantAddressClass}>{r.category || '기타'} · {r.address || '오늘 뭐먹지 추천 맛집'}</div>
                <div className={restaurantTagRowClass}>
                  {(r.tags ?? [`#${r.category || '맛집'}`, '#추천', '#오늘뭐먹지']).slice(0, 3).map((tag) => (
                    <span className={restaurantTagClass} key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={quickPanelsClass}>
        <div className={`${quickCardBaseClass} ${quickMapCardClass}`}>
          <div>
            <h3 className={quickTitleClass}>📍 내 인생 맛집 찾기</h3>
            <p className={quickTextClass}>지금 위치를 기반으로<br />인생맛집을 찾아보세요!</p>
            <Link to="/menu" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5">
              맛집 찾기 →</Link>

          </div>
          <div className={quickIllustClass}>📍</div>
        </div>

        <div className={`${quickCardBaseClass} ${quickAiCardClass}`}>
          <div>
            <h3 className={quickTitleClass}>오늘 뭐먹지?</h3>
            <p className={quickTextClass}>예산, 시간, 내 취향을 분석해서<br />오늘의 메뉴를 추천해드려요!</p>
            <Link to="/game" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5">
              추천 받기 →</Link>
          </div>
          <div className={quickIllustClass}>🤖</div>
        </div>
      </section>

      {user && (
        <section className="nearby-section">
          <div className="section-title">
            <span>📍 내 주변 추천</span>
            <div className="nearby-actions">
              <button className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5" onClick={() => setShowSearch((s) => !s)}>
                {showSearch ? '패널 닫기' : '식당 검색/등록'}
              </button>
              <button className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-black)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5" onClick={findNearby}>
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

      <section className={adBannerClass}>
        <Link
          to="/party"
          className={adBannerLinkClass}
          aria-label="파티 페이지로 이동"
        >
          <img
            src="/img/banner/banner2.png"
            alt="파티 만들기 배너"
            className={adBannerImageClass}
          />
        </Link>
      </section>
    </div>
  )
}
