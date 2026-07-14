import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { createLikeLog, toggleLike, getNearby, getRestaurants, getTrending, getTrendingClicks, getRealtimeTrending } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantSearch from '../components/RestaurantSearch'
import Cafeteria from '../components/Cafeteria'
import RandomBanner from '../components/RandomBanner'
import api from '../api/axiosInstance'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import { Pagination } from 'swiper/modules'


const adBannerClass =
   'w-full overflow-hidden rounded-[12px] bg-white max-[540px]:mt-2 max-[540px]:mb-0'
const adBannerLinkClass = 'block h-full w-full'
const adBannerImageClass =
  'h-full w-full object-contain object-center'

const CAT_ICON = {
  한식: './img/category/korean.png',
  일식: './img/category/japanese.webp',
  중식: './img/category/chinese.webp',
  양식: './img/category/steak.webp',
  분식: './img/category/snack.webp',
  치킨: './img/category/chicken.webp',
  카페: './img/category/coffee.webp',
  술집: './img/category/beer.webp'
};
const TREND_FOODS = ['삼겹살', '치킨', '짜장면', '순대국', '초밥', '파스타', '비빔밥', '떡볶이']

// ❌ SAMPLE_RESTAURANTS 변수가 완벽하게 삭제되었습니다.

const heroLayoutClass = 'mb-[26px] grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-5 max-lg:grid-cols-1'
const mainBannerClass = 'relative h-[400px] overflow-hidden rounded-[10px] shadow-[0_8px_22px_rgba(42,29,26,0.08)] max-md:h-[360px]'
const slideBaseClass = 'absolute left-0 top-0 z-[1] flex h-full w-full items-center px-8 py-9 text-white opacity-0 transition-opacity duration-[600ms] ease-in-out sm:px-8 md:px-9 lg:px-8 xl:px-10'
const slideActiveClass = 'z-[2] opacity-100'
const slideBackgrounds = [
  '[background:radial-gradient(circle_at_83%_35%,rgba(255,255,255,0.28),transparent_29%),linear-gradient(135deg,#FFEE7F,var(--color-accent))]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(135deg,#FEB95C,#F46C6F)]',
  '[background:radial-gradient(circle_at_85%_25%,rgba(255,238,127,0.35),transparent_25%),linear-gradient(135deg,#F1B8AE,#F46C6F)]',
]
const bannerCopyClass = 'relative z-[2] max-w-[470px] pb-2 mb-0'
const bannerTitleClass = 'ml-5 mb-4 text-[clamp(2rem,3.4vw,2.55rem)] font-black leading-[1.05] text-white'
const bannerTitleAccentClass = 'mx-0.5 inline-flex translate-y-0.5'
const bannerTextClass = 'ml-5 mb-9 text-[1.08rem] font-extrabold leading-[1.65]'
const bannerActionsClass = 'flex flex-wrap gap-[5px]'
const heroButtonLightClass = 'ml-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-4 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 max-[540px]:ml-5 max-[540px]:min-h-8 max-[540px]:gap-1.5 max-[540px]:rounded-[8px] max-[540px]:px-3 max-[540px]:text-[0.74rem]'
const heroButtonYellowClass = 'ml-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,var(--color-secondary),var(--color-accent))] px-3 text-[0.94rem] font-black text-[#4B2D07] shadow-[0_10px_18px_rgba(254,185,92,0.25)] transition-transform hover:-translate-y-0.5 max-[540px]:ml-2 max-[540px]:min-h-8 max-[540px]:gap-1.5 max-[540px]:rounded-[8px] max-[540px]:px-3 max-[540px]:text-[0.74rem]'

const pinkButtonClass='ml-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,#f8888a,var(--color-primary))] px-3 text-[0.94rem] font-bold text-[#ffff] shadow-[0_10px_18px_rgba(254,185,92,0.25)] transition-transform hover:-translate-y-0.5 max-[540px]:ml-2 max-[540px]:min-h-8 max-[540px]:gap-1.5 max-[540px]:rounded-[8px] max-[540px]:px-3 max-[540px]:text-[0.74rem]'

const bannerFoodClass = 'absolute right-0 top-0 bottom-0 z-[1] h-full w-[52%] rounded-l-[999px] rounded-r-none object-cover object-center shadow-[0_18px_30px_rgba(85,34,26,0.2)] max-md:hidden xl:w-[51%]'

const bannerDoodleClass = 'absolute right-8 top-10 z-[2] text-4xl font-black text-white/95 max-md:hidden'
const bannerDotsClass = 'absolute bottom-[17px] left-1/2 z-[3] flex -translate-x-1/2 gap-[8px]'
const bannerDotClass = 'h-3 w-3 rounded-full border-2 border-white'
const bannerDotActiveClass = 'bg-white'
const trendCardClass = 'h-[400px] overflow-hidden rounded-[10px] border border-[var(--border-color)] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(42,29,26,0.08)] max-md:h-auto'
const trendTitleClass = 'mb-[30px] text-[1.05rem] font-black text-[var(--text-primary)]'
const trendListClass = 'flex flex-col gap-[18px]'
const trendItemClass = 'flex items-center gap-2.5 text-[0.9rem] font-medium'
const trendRankClass = 'w-5 font-black text-[#ff5f24]'
const trendNameClass = 'flex-1 text-[var(--text-primary)]'
const trendUpClass = 'text-[1.35rem] leading-none text-[var(--color-primary)]'
const categoryGridClass = 'mb-11 grid grid-cols-8 gap-3 max-lg:grid-cols-4 max-sm:grid-cols-2'
const categoryItemClass = 'flex min-h-[90px] flex-col items-center justify-center gap-0 rounded-[10px] border border-[var(--border-color)] bg-white shadow-[0_8px_18px_rgba(42,29,26,0.07)] transition-all hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow)]'
const categoryIconClass = 'grid h-13 w-13 place-items-center text-[1.75rem] -mt-1'
const categoryLabelClass = 'text-[0.86rem] font-black text-[var(--text-primary)]'
const recommendSectionClass =
  'mb-[38px]'

const recommendTitleWrapClass =
  'mb-[18px] flex items-center justify-between font-black max-[540px]:items-end'

const recommendTitleClass =
  'relative text-[1.55rem] after:absolute after:left-0 after:bottom-[-8px] after:h-[3px] after:w-[34px] after:rounded-full after:bg-[var(--color-primary)] max-[540px]:text-[1.28rem]'

const recommendMoreClass =
  'text-[0.9rem] text-[#7D4213]'

const cafeteriaGridClass =
  'grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-[540px]:grid-cols-2'

const rankBadgeBaseClass =
  'absolute left-0 top-0 z-10 grid h-[52px] w-[52px] place-items-center bg-[var(--color-primary)] text-[1.35rem] font-black text-white transition-transform duration-200 group-hover:-translate-y-1'

const rankBadgeAccentClass =
  'bg-[var(--color-accent)]'
const quickPanelsClass = 'mb-[18px] grid grid-cols-2 gap-[18px] max-md:grid-cols-1'
const quickCardBaseClass = 'flex min-h-[230px] items-center justify-between gap-[18px] overflow-hidden rounded-[10px] px-[38px] py-8 max-md:px-[22px] max-md:py-7'
const quickMapCardClass = '[background:radial-gradient(circle_at_82%_70%,rgba(255,255,255,0.68),transparent_30%),linear-gradient(135deg,#FFF4A8,#FFE67C)]'
const quickAiCardClass = '[background:radial-gradient(circle_at_88%_50%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(135deg,#FFE1E0,#FFD3D6)]'
const quickTitleClass = 'mb-[14px] text-[1.55rem] font-black'
const quickTextClass = 'mb-[22px] text-[1rem] font-bold leading-[1.7] text-[#2B1D18]'
const quickIllustClass = 'grid h-[150px] w-[150px] flex-none place-items-center rounded-full bg-white/50 text-[5.2rem] [filter:drop-shadow(0_12px_18px_rgba(116,62,38,0.16))] max-md:h-[104px] max-md:w-[104px] max-md:text-[3.6rem]'
const nearbyTitleWrapClass = 'section-title items-center justify-between gap-3 max-[540px]:flex-row max-[540px]:items-center max-[540px]:justify-start max-[540px]:gap-2'
const nearbyActionsClass = 'nearby-actions flex flex-wrap justify-end gap-2 max-[540px]:shrink-0 max-[540px]:justify-start max-[540px]:gap-1.5 max-[540px]:text-[0.60rem]'
const nearbyActionButtonClass = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-4 text-[0.70rem] font-black shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 max-[540px]:h-8 max-[540px]:rounded-[8px] max-[540px]:px-2.5 max-[540px]:text-[0.60rem]'
const DESKTOP_TREND_KEYWORD_LIMIT = 7
const MOBILE_TREND_KEYWORD_LIMIT = 9
const TREND_KEYWORDS_PER_SLIDE = 3

const chunkItems = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  )

export default function Home() {
  const nearbyRef = useRef(null)
  const { user } = useAuth()
  const [trending, setTrending] = useState([])
  const [nearby, setNearby] = useState([])
  const [userLoc, setUserLoc] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')
  const [bannerIdx, setBannerIdx] = useState(0)
  const [trendKeywords, setTrendKeywords] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [likedCafeteriaIds, setLikedCafeteriaIds] = useState(() => new Set())
  const bannerTimer = useRef(null)

  // 🚀 2. 새로 추가: 진짜 백엔드 24시간 실시간 트렌드 키워드를 로드하는 함수
  const fetchTrendingKeywords = async () => {
  try {
    const data = await getRealtimeTrending()

    if (Array.isArray(data.items)) {
      setTrendKeywords(data.items)
    }

  } catch (err) {
    console.error('실시간 인기 데이터 로드 실패:', err)
    setTrendKeywords([])
  }
}

  // 🚀 3. 새로 추가: 인기 검색어판의 키워드를 직접 클릭했을 때도 점수 반영하는 함수
  const handleKeywordClick = async (keyword) => {
    try {
      await api.post('/api/menu/search/log', { keyword }) // DB에 로그 전송
      await fetchTrendingKeywords() // 화면 순위 즉시 리프레시
    } catch (err) {
      console.error("키워드 클릭 로그 적재 오류:", err)
    }
  }

  // 🔄 4. 기존 데이터 로드 useEffect (원형을 완전히 유지하되 가짜 랭킹 연산만 걷어냄)
  useEffect(() => {
    getTrending().then((d) => {
      const rawItems = d.items || [];

      // 기존 맛집 랭킹 렌더링 세팅 (백엔드가 RecommendationLog 기준으로 계산해 준 is_liked를 그대로 사용)
      setTrending(rawItems.map(r => ({
        ...r,
        id: String(r.id),
        image: r.image || r.image_url || '',
      })));
      setLikedCafeteriaIds(new Set(rawItems.filter(r => r.is_liked).map(r => String(r.id))));

      // 🌟 [개편 구역]: 로컬스토리지 파싱 및 카테고리 누적 연산(mergedMap) 껍데기 로직을
      // 완벽하게 청소하고, 백엔드가 제공하는 진짜 순수 데이터를 로드하도록 직접 이어 붙입니다.
      fetchTrendingKeywords();

    }).catch((err) => {
      console.error('trending 로드 실패:', err);
      setTrending([]);
    });
  }, [user]);

  useEffect(() => {
    bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 3), 4500)
    return () => clearInterval(bannerTimer.current)
  }, [])

  const scrollToMapSection = () => {
    if (!nearbyRef.current) return
    const offset = 140
    const top = nearbyRef.current.getBoundingClientRect().top + window.scrollY - offset


    window.scrollTo({
      top,
      behavior: 'smooth',
    })
  }
  // 버튼을 누르자마자 사용자가 작동 여부를 인지할 수 있도록 스크롤 먼저 이동시킵니다.
  const findNearby = () => {
    if (!navigator.geolocation) return alert('위치 서비스 미지원')
    setLocStatus('loading')

    scrollToMapSection();

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const loc = { lat: coords.latitude, lng: coords.longitude }
      setUserLoc(loc)
      setTimeout(() => {
        nearbyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      try {
        const data = await getNearby({ lat: loc.lat, lng: loc.lng })
        setNearby(data)
        setLocStatus('done')
      } catch {
        setLocStatus('error')
      }
    }, () => setLocStatus('error'))
  }

  const visibleRestaurants = trending.length ? trending : []


  const handleCafeteriaLike = async (r) => {
    const isLiked = Boolean(r.is_liked) || likedCafeteriaIds.has(r.id)
    setLikedCafeteriaIds(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(r.id)
      else next.add(r.id)
      return next
    })
    try {
      if (r.log_id) {
        const res = await toggleLike(r.log_id)
        setTrending((prev) => prev.map((item) => item.id === r.id ? { ...item, is_liked: res.liked } : item))
      } else {
        const res = await createLikeLog(r.id)
        setTrending((prev) => prev.map((item) => item.id === r.id ? { ...item, is_liked: true, log_id: res.log_id } : item))
      }
    } catch (err) {
      console.error('찜하기 실패:', err)
    }
  };

  const handleOpenChatBot = (e) => {
    e.preventDefault();

    const chatBtn = document.querySelector('.chatbot-toggle-btn') ||
      document.querySelector('#chatbot-button') ||
      document.querySelector('.chatbot-container button');

    if (chatBtn) {
      chatBtn.click();
    } else {
      alert('챗봇 창은 화면 우측 하단의 아이콘을 통해서도 상시 이용하실 수 있습니다!');
    }
  };
  const desktopTrendKeywords = trendKeywords.slice(0, DESKTOP_TREND_KEYWORD_LIMIT)
  const mobileTrendKeywords = trendKeywords.slice(0, MOBILE_TREND_KEYWORD_LIMIT)
  const trendKeywordSlides = chunkItems(mobileTrendKeywords, TREND_KEYWORDS_PER_SLIDE)

  return (

    <main className="mx-auto w-full max-w-7xl px-4  lg:py-6">

      <div className="home-page">
        <section className={heroLayoutClass}>
          <div className={mainBannerClass}>
            <div className={`${slideBaseClass} ${slideBackgrounds[0]} ${bannerIdx === 0 ? slideActiveClass : ''}`}>
              <div className={bannerCopyClass}>
                <h1 className={bannerTitleClass}>
                  랜덤도 실력이다.
                  {/* HAVE A G<span className={bannerTitleAccentClass}>😍</span>OD TIME */}
                </h1>
                <p className={bannerTextClass}>
                  뭐 먹을지 고민할 시간에,
                  <br />
                  맛있게 먹자
                </p>

                <div className={bannerActionsClass}>
                  <Link to="/menu" className={heroButtonLightClass}>추천 맛집 보기 <span>›</span></Link>
                  <Link to="/game" className={pinkButtonClass}>랜덤 메뉴 추천 <span>›</span></Link>
                </div>
              </div>

              <img
                className={bannerFoodClass}
                src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80"
                alt="파스타"
              />
            </div>

            <div className={`${slideBaseClass} ${slideBackgrounds[1]} ${bannerIdx === 1 ? slideActiveClass : ''}`}>
              <div className={bannerCopyClass}>
                <h1 className={bannerTitleClass}>오늘의 밥친구</h1>
                <p className={bannerTextClass}>
                  혼밥 말고 같이 먹는 즐거움
                  <br />
                  가까운 맛집에서 바로 만나요
                </p>
                <div className={bannerActionsClass}>
                  <Link to="/party" className={heroButtonLightClass}>밥친구 찾기<span>›</span></Link>
                  <button type="button" className={heroButtonYellowClass} onClick={findNearby}>내 주변 찾기 <span>›</span></button>
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
                <h1 className={bannerTitleClass}>AI가 고른 찐맛집</h1>
                <p className={bannerTextClass}>
                  고민은 AI에게,
                  <br />
                  맛있는 건 당신에게
                </p>
                <div className={bannerActionsClass}>
                  <button
                    className={heroButtonLightClass}
                    onClick={() => {
                      if (!user) { alert('로그인 후 이용 가능합니다.'); return }
                      window.dispatchEvent(new CustomEvent('open-chatbot'))
                    }}
                  ><span>AI 추천 받기</span><span>›</span></button>
                </div>
              </div>
              <img
                className={bannerFoodClass}
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80"
                alt="피자"
              />
            </div>
            <button
              onClick={() => { setBannerIdx((i) => (i + 2) % 3); clearInterval(bannerTimer.current); bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 3), 4500) }}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.20)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="이전 슬라이드"
            >‹</button>
            <button
              onClick={() => { setBannerIdx((i) => (i + 1) % 3); clearInterval(bannerTimer.current); bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 3), 4500) }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(0,0,0,0.20)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="다음 슬라이드"
            >›</button>
            <div className={bannerDotsClass}>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  onClick={() => { setBannerIdx(dot); clearInterval(bannerTimer.current); bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 3), 4500) }}
                  className={`${bannerDotClass} ${bannerIdx === dot ? bannerDotActiveClass : ''}`}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>

          <aside className={trendCardClass}>
            <h4 className={trendTitleClass}>🔥 실시간 인기 키워드</h4>
            
            <div className={`${trendListClass} max-md:hidden`}>
              {desktopTrendKeywords.map((item, i) => (
                <Link
                  to={`/menu?q=${item.name}`}
                  className={trendItemClass}
                  key={item.name}
                  onClick={() => handleKeywordClick(item.name)}
                >
                  <span className={trendRankClass}>{i + 1}</span>
                  <span className={trendNameClass}>{item.name}</span>
                </Link>
              ))}
            </div>

            <div className="hidden max-md:block">
              <Swiper pagination={true} modules={[Pagination]} className="pb-8">
                {trendKeywordSlides.map((slideItems, slideIndex) => (
                  <SwiperSlide key={`trend-slide-${slideIndex}`}>
                    <div className="flex flex-col gap-[14px] pb-7">
                      {slideItems.map((item, itemIndex) => {
                        const rank = slideIndex * TREND_KEYWORDS_PER_SLIDE + itemIndex + 1

                        return (
                          <Link
                            to={`/menu?q=${item.name}`}
                            className={trendItemClass}
                            key={item.name}
                            onClick={() => handleKeywordClick(item.name)}
                          >
                            <span className={trendRankClass}>{rank}</span>
                            <span className={trendNameClass}>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </aside>
        </section>

        <section className={categoryGridClass}>
          {Object.entries(CAT_ICON).map(([name, iconPath]) => (
            <Link to={`/menu?cat=${name}`} className={categoryItemClass} key={name}>
              <div className={categoryIconClass}>
                <img
                  src={iconPath}
                  alt={name}
                  className="h-full w-full object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              <div className={categoryLabelClass}>{name}</div>
            </Link>
          ))}
        </section>

        <section className={recommendSectionClass}>
          <div className={recommendTitleWrapClass}>
            <span className={recommendTitleClass}>오늘의 추천 맛집</span>
            <Link to="/menu" className={recommendMoreClass}>
              더보기 →
            </Link>
          </div>

          <div className={cafeteriaGridClass}>
            {visibleRestaurants.slice(0, 4).map((r, index) => (
              <div className="group relative transition-transform duration-200 hover:-translate-y-1" key={r.id}>
                <Cafeteria
                  item={r}
                  to={`/menu/${r.id}`}
                  liked={Boolean(r.is_liked) || likedCafeteriaIds.has(r.id)}
                  onToggleLike={() => handleCafeteriaLike(r)}
                />

                <span
                  className={`${rankBadgeBaseClass} ${index === 1 || index === 3 ? rankBadgeAccentClass : ''
                    }`}
                >
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={quickPanelsClass}>

          {/* ⭕ 내 인생 맛집 찾기 노란색 패널을 눌러도 하단 지도로 스크롤되도록 onClick 핸들러 연동 */}
          <div
            className={`${quickCardBaseClass} ${quickMapCardClass} cursor-pointer`}
            onClick={scrollToMapSection}
          >
            <div>
              <h3 className={quickTitleClass}>📍 내 인생 맛집 찾기</h3>
              <p className={quickTextClass}>
                지금 위치를 기반으로
                <br />
                인생맛집을 찾아보세요
              </p>

              <button type="button" onClick={scrollToMapSection} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5">
                맛집 찾기 <span>›</span>
              </button>
            </div>
            <div className={quickIllustClass}>📍</div>
          </div>

          <div className={`${quickCardBaseClass} ${quickAiCardClass}`}>
            <div>
              <h3 className={quickTitleClass}>오늘 뭐먹지?</h3>
              <p className={quickTextClass}>
                예산, 시간, 내 취향을 분석해서
                <br />
                오늘의 메뉴를 추천해드려요!
              </p>
              <button onClick={handleOpenChatBot} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5">
                추천 받기 <span>›</span>
              </button>
            </div>
            <div className={quickIllustClass}>🎲</div>
          </div>
        </section>

        {user && (
          <section ref={nearbyRef} className="nearby-section mb-[45px] mt-[12px] max-[540px]:mb-4 ">

            <div className={nearbyTitleWrapClass}>
              <span>📍 내 주변 추천</span>
              <div className={nearbyActionsClass}>
                <button className={`${nearbyActionButtonClass} text-[var(--color-primary)]`} onClick={() => setShowSearch((s) => !s)}>
                  <span className="max-[540px]:hidden">{showSearch ? '패널 닫기' : '식당 검색/등록'}</span>
                  <span className="hidden max-[540px]:inline">{showSearch ? '닫기' : '식당 검색'}</span>
                </button>
                <button className={`${nearbyActionButtonClass} text-[var(--color-black)]`} onClick={findNearby}>
                  <span className="max-[540px]:hidden">{locStatus === 'loading' ? '확인 중...' : '위치 불러오기'}</span>
                  <span className="hidden max-[540px]:inline">{locStatus === 'loading' ? '확인중' : '위치'}</span>
                </button>
              </div>
            </div>

            {showSearch && (
              <div className="search-panel">
                
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
                {nearby.length === 0 && <div className="empty-state">주변 500m 안에 식당이 없습니다.</div>}
              </>
            )}
          </section>
        )}

        <section className={adBannerClass}>
          <RandomBanner />
        </section>
      </div>
    </main>
  )
}
