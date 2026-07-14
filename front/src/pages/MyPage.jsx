// src/pages/MyPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getMyPage, toggleLike, saveFavoriteLocations, searchKakao, getMyFavorites, getSavedLocations, addSavedLocation, deleteSavedLocation } from '../api/services'
import RestaurantImage from '../components/RestaurantImage'
import { useAuth } from '../App'
import { processTags } from '../utils'
import axios from 'axios'

const FAVORITE_LIMIT = 5   // 메뉴 찜목록 기본 표시 개수 (초과 시 '전체보기' 토글)
const likeButtonClass =
  'grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[1.45rem] leading-none text-[#5B4038] shadow-[0_4px_9px_rgba(0,0,0,0.14)] transition hover:scale-105 active:scale-95'
const likedButtonClass = 'text-[var(--color-primary)]'

export default function MyPage() {
  const navigate = useNavigate()
  const { logout: ctxLogout } = useAuth()
  const gauge2Ref = useRef(null)
  const activityTabsRef = useRef(null)
  const location = useLocation();

  const [data, setData] = useState(null)
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const [activeMyActivityTab, setActiveMyActivityTab] = useState('activity')
  const [savedLocs, setSavedLocs] = useState([])
  const [locSearch, setLocSearch] = useState('')
  const [locResults, setLocResults] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [locLoading, setLocLoading] = useState(false)
  const [locMsg, setLocMsg] = useState('')
  const [showMannerModal, setShowMannerModal] = useState(false)


  // 데이터 fetch 공통 로직 추출
  const loadPageData = () => {
    return Promise.all([
      getMyPage(), 
      getMyFavorites().catch(() => []),
      getSavedLocations().catch(() => [])
    ])
    .then(([d, favData, locs]) => {
        console.log("서버에서 받은 전체 데이터:", d);


          // 중요: 서버 데이터 고유의 찜 상태를 존중하되, 없을 때만 기본 true 부여
          const favLogs = (favData || []).map(f => ({
            log_id: null,
            is_liked: f.is_liked !== undefined ? f.is_liked : true,
            restaurant: {
              restaurant_id: f.id,
              id: f.id,
              name: f.name,
              category: f.category,
              address: f.address || '',
              avg_rating: f.avg_rating || 0,
            },
            recommended_restaurant_id: f.id,
          }));

        const merged = {
          ...d,
          liked_logs: [
            ...(d?.liked_logs || []).map(l => ({ ...l, is_liked: l.is_liked !== false })),
            ...favLogs.filter(fav =>
              !(d?.liked_logs || []).find(l =>
                (l.restaurant?.restaurant_id ?? l.restaurant?.id) === fav.restaurant.id
              )
            ),
          ],
        };
        setData(merged);
        setSavedLocs(locs);
        setPageLoading(false);
      })
      .catch((err) => {
        console.error('마이페이지 로드 실패:', err);
        setPageLoading(false);
      });
  };

  const fetchSavedLocations = async () => {
    try {
      const response = await axios.get('/api/saved-locations');
      setSavedLocs(response.data);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
  };

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadPageData();
  }, [location.pathname]);

  useEffect(() => {
    fetchSavedLocations(); 
  }, [])

  // ── 매너 게이지 SVG 애니메이션 ───────────────────────────────────────────
  useEffect(() => {
    if (!data || !gauge2Ref.current) return
    const score = data.user.manner_score
    const r = 40
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - Math.min(score / 50, 1))
    const circle = gauge2Ref.current.querySelector('circle.progress')
    if (circle) {
      circle.style.strokeDasharray = circ
      circle.style.strokeDashoffset = offset
    }
  }, [data])

  useEffect(() => {
    if (!showMannerModal) return
    // 모달을 열 때마다 최신 매너온도를 다시 불러온다 (다른 페이지에서 투표로 변동됐을 수 있으므로)
    loadPageData()
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowMannerModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showMannerModal])

  // ── 카카오 장소 검색 ──────────────────────────────────────────────────────
  const searchPlace = async () => {
    if (!locSearch.trim()) return
    setLocLoading(true)
    setLocResults([])
    setLocMsg('')
    try {
      const json = await searchKakao({ q: locSearch })
      setLocResults(json.places ?? [])
      if (!(json.places?.length)) setLocMsg('검색 결과가 없습니다.')
    } catch {
      setLocMsg('검색에 실패했습니다.')
    } finally {
      setLocLoading(false)
    }
  }

  const addLoc = async (place) => {
    if (savedLocs.length >= 3) {
      setLocMsg('장소는 최대 3개까지 저장 가능합니다.');
      return;
    }
  
    try {
      // 1. 서비스 API 호출 (DB에 저장)
      const newLoc = await addSavedLocation({ 
        name: place.name, 
        address: place.address, 
        lat: place.lat, 
        lng: place.lng 
      });
      
      // 2. 상태 업데이트
      setSavedLocs([...savedLocs, newLoc]);
      setLocResults([]);
      setLocSearch('');
      setLocMsg(`✅ "${newLoc.name}" 저장 완료!`);
    } catch (err) {
      console.error("장소 저장 실패:", err);
      setLocMsg('장소 저장에 실패했습니다.');
    }
  }


  const removeLoc = async (id) => {
    if (!id) return;

    try {
      await deleteSavedLocation(id);
      
      setSavedLocs((prevLocs) => prevLocs.filter((loc) => loc.id !== id));
      setLocMsg('장소가 삭제되었습니다.');
    } catch (err) {
      console.error("장소 삭제 실패:", err);
      setLocMsg('삭제에 실패했습니다.');
    }
  };

  // ── 찜 토글 (낙관적 업데이트 및 즉시 필터링 반영) ──────────────────────────
  const handleLike = async (log) => {
    const logId = log?.log_id
    const currentRestId = log.restaurant?.id ?? log.restaurant?.restaurant_id

    // 1. 상태를 즉시 false로 토글하여 화면에서 즉각 사라지게 만듦
    setData(prev => {
      if (!prev) return prev;

      const toggleIsLiked = (list) =>
        (list || []).map(l => {
          const targetRestId = l.restaurant?.id ?? l.restaurant?.restaurant_id;

          if (logId && l.log_id === logId) {
            return { ...l, is_liked: !l.is_liked };
          }
          if (currentRestId && targetRestId === currentRestId) {
            return { ...l, is_liked: !l.is_liked };
          }
          return l;
          });

        return {
          ...prev,
          rec_logs: toggleIsLiked(prev.rec_logs),
          liked_logs: toggleIsLiked(prev.liked_logs)
        };
      });

    // 2. 백엔드 통신 수행
    try {
      if (logId) {
        await toggleLike(logId)
      } else if (currentRestId) {
        const apiMod = (await import('../api/axiosInstance')).default
        await apiMod.post('/api/favorites', { restaurant_id: currentRestId })
      }

      // 3. 서버 반영 완료 후 상태 재동기화
      await loadPageData();
    } catch (error) {
      console.error("찜 토글 실패, 복구작업 진행:", error);
      loadPageData();
    }
  }

  const handleFavoriteView = () => {
    setShowAllFavorites(true)
    setActiveMyActivityTab('favorites')
    activityTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleReviewView = () => {
    setActiveMyActivityTab('reviews')
    activityTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── 회원 탈퇴 ────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!window.confirm('정말로 회원 탈퇴를 하시겠습니까?\n탈퇴 후 모든 데이터가 삭제됩니다.')) return
    try {
      const apiMod2 = (await import('../api/axiosInstance')).default
      await apiMod2.delete('/api/auth/me')
      ctxLogout()
      alert('회원 탈퇴가 완료되었습니다.')
      navigate('/')
    } catch (e) {
      alert(e?.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  // ── 로딩 상태 처리 ────────────────────────────────────────────────────────
  if (pageLoading || !data) return (
    <div className="py-[60px] text-center text-[var(--text-muted)]">
      로딩 중...
    </div>
  )

  const { user = {}, my_parties = [], rec_logs = [], liked_logs: apiLikedLogs = [], my_reviews = [] } = data || {};
  const visibleMyParties = my_parties.filter((party) => party.status !== 'CANCELLED');

  const likes = processTags(user.preferences?.likes);
  const dislikes = processTags(user.preferences?.dislikes);
  const mannerScore = user.manner_score;

  // 상태 결합 및 최신 찜(is_liked) 플래그 맵핑 처리
  const allLikedLogs = [
    ...apiLikedLogs.map(item => ({
      ...item,
      log_id: item.log_id ?? null,
      restaurant: item.restaurant || null,
    })),
    ...rec_logs.filter(r =>
      r.is_liked &&
      !apiLikedLogs.find(f =>
        (f.restaurant?.id ?? f.restaurant?.restaurant_id) ===
        (r.restaurant?.id ?? r.restaurant?.restaurant_id)
      )
    )
  ];

  // 유일화된 리스트 추출 시, 'is_liked === false'인 데이터를 확실하게 드롭(제거)시킵니다.
  const displayLikedLogs = Array.from(
    new Map(
      allLikedLogs.map(item => [
        item.restaurant?.id ?? item.restaurant?.restaurant_id ?? item.log_id,
        item
      ])
    ).values()
  ).filter(item => item.restaurant && item.is_liked !== false);

  const R = 36
  const circ = 2 * Math.PI * R
  const heroOffset = circ * (1 - Math.min(mannerScore / 50, 1))
  const mannerItems = [
    ['파티 참여', (visibleMyParties.length * 0.5).toFixed(1)],
    ['후기 작성', (displayLikedLogs.length * 0.3).toFixed(1)],
    ['약속 이행', '1.0'],
  ]

  const myActivityTabs = [
    ['activity', '▣', '활동 내역', '활동'],
    ['reviews', '✎', '내가 쓴 리뷰', '리뷰'],
    ['favorites', '♥', '메뉴 찜 목록', '찜'],
    ['locations', '⌖', '나의 맛집 장소', '맛집장소'],
  ];

  const temperatureRanges = [
    [20, 30, '주의 필요', 'bg-[#FC8181]/15 text-[#FC8181]', 'bg-[#FC8181]'],
    [30, 36, '보통', 'bg-[#F6AD55]/15 text-[#F6AD55]', 'bg-[#F6AD55]'],
    [36, 43, '따뜻해요', 'bg-[#68D391]/15 text-[#68D391]', 'bg-[#68D391]'],
    [43, 50, '매우 따뜻해요 🔥', 'bg-[#38A169]/15 text-[#38A169]', 'bg-[#38A169]'],
  ]

  return (
    <>
      {/* ── HERO BANNER ── */}
      <div className="mb-6 grid justify-center gap-5 lg:grid-cols-[minmax(0,740px)_300px]">
        <div className="relative h-[300px] overflow-hidden rounded-[var(--border-radius-xl)] border border-[#f5d2cb] bg-[var(--color-soft)] px-6 py-6 shadow-sm sm:px-8">
          <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-center pr-4">
            <div className="mb-7 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary)] text-lg font-black text-white shadow-sm">
              {user.nickname?.[0] ?? 'U'}
            </div>
            <h2 className="mb-2 text-2xl font-black text-[var(--text-primary)]">
              {user.nickname ?? '회원'}님, 오늘도 맛있는 하루 보내세요!
            </h2>
            <p className="mb-4 text-[.86rem] font-semibold leading-relaxed text-[var(--text-secondary)]">
              좋아하는 음식과 활동 기록을 한눈에 관리해요.
            </p>
            <Link
              to="/mypage/edit"
              className="inline-flex w-fit items-center rounded-md mt-2 bg-white px-4 py-2 text-[.82rem] font-black text-[var(--text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              프로필 수정
            </Link>
          </div>

          <img
            src="/img/icon/character.png"
            alt="마이페이지 캐릭터"
            className="pointer-events-none absolute bottom-0 right-6 h-[250px] object-contain sm:right-10 max-[540px]:h-[200px]"
          />
        </div>

        {/* 매너 온도 서클 */}
        <div className="h-[300px] rounded-[var(--border-radius-xl)] border border-[var(--border-color)] bg-[var(--bg-white)] px-5 py-5 text-center shadow-sm">
          <div className="mb-3 text-left text-[1.1rem] font-black text-[var(--text-primary)]">매너온도</div>

          <div className="mx-auto flex h-[180px] w-[180px] items-center justify-center" ref={gauge2Ref}>
            <div className="relative h-[190px] w-[190px]">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="60" fill="none" stroke="var(--bg-surface)" strokeWidth="18" />
                <circle
                  className="progress"
                  cx="90"
                  cy="90"
                  r="60"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                  style={{ transition: 'stroke-dashoffset 1s' }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black leading-none text-[var(--text-primary)]">{mannerScore}</span>
                <small className="mt-2 text-[.90rem] font-bold text-[var(--text-muted)]">점</small>
              </div>

            </div>
          </div>
          <p className="-mt-3 mb-3 text-[.72rem] font-bold text-[var(--text-muted)]">따뜻한 식사 메이트</p>
          <button
            type="button"
            onClick={() => setShowMannerModal(true)}
            className="-mt-2 inline-flex items-center justify-center rounded-full bg-[var(--color-soft)] px-4 py-1.5 text-[.75rem] font-black text-[var(--color-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow"
          >
            매너 점수 보기
          </button>
        </div>
      </div>

      {/* ── STAT ROW ── */}
      <div className="mx-auto mb-6 grid w-full max-w-[1060px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 max-[540px]:grid-cols-4 max-[540px]:gap-2">
        <button
          type="button"
          onClick={handleFavoriteView}
          className="relative min-h-[112px] w-full rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#FEB95C] hover:shadow-md max-[540px]:min-h-[86px] max-[540px]:px-2 max-[540px]:pb-3 max-[540px]:pt-8 max-[540px]:text-center max-[540px]:[&>span:first-child]:left-1/2 max-[540px]:[&>span:first-child]:top-2 max-[540px]:[&>span:first-child]:h-6 max-[540px]:[&>span:first-child]:w-6 max-[540px]:[&>span:first-child]:-translate-x-1/2 max-[540px]:[&>span:first-child]:text-sm"
        >
          <span className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#FFF5F5] text-lg text-[var(--color-primary)]">♥</span>
          <div className="pl-14 pt-1 max-[540px]:pl-0 max-[540px]:pt-0 max-[540px]:[&>div:first-child]:text-xl max-[540px]:[&>div:nth-child(2)]:mt-1 max-[540px]:[&>div:nth-child(2)]:truncate max-[540px]:[&>div:nth-child(2)]:text-[.68rem]">
            <div className="text-2xl font-black leading-none text-[var(--text-primary)]">{displayLikedLogs.length}</div>
            <div className="mt-2 text-[.82rem] font-bold text-[var(--text-secondary)]">찜한 메뉴</div>
            <div className="mt-1 flex items-center justify-between text-[.70rem] font-semibold text-[var(--text-muted)] max-[540px]:hidden">
              <span>총 {displayLikedLogs.length}개 찜함</span>
            </div>
          </div>
        </button>

        <div className="relative min-h-[112px] w-full rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#3182CE] hover:shadow-md max-[540px]:min-h-[86px] max-[540px]:px-2 max-[540px]:pb-3 max-[540px]:pt-8 max-[540px]:text-center max-[540px]:[&>span:first-child]:left-1/2 max-[540px]:[&>span:first-child]:top-2 max-[540px]:[&>span:first-child]:h-6 max-[540px]:[&>span:first-child]:w-6 max-[540px]:[&>span:first-child]:-translate-x-1/2 max-[540px]:[&>span:first-child]:text-sm max-[540px]:[&>span:first-child_img]:h-4 max-[540px]:[&>span:first-child_img]:w-4">
          <span className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#EBF5FF] text-lg text-[#3182CE]">
            <img src="/img/icon/thumb-up.png" alt="추천 활동" className="h-5 w-5 object-contain" />
          </span>
          <div className="pl-14 pt-1 max-[540px]:pl-0 max-[540px]:pt-0 max-[540px]:[&>div:first-child]:text-xl max-[540px]:[&>div:nth-child(2)]:mt-1 max-[540px]:[&>div:nth-child(2)]:truncate max-[540px]:[&>div:nth-child(2)]:text-[.68rem]">
            <div className="text-2xl font-black leading-none text-[var(--text-primary)]">{rec_logs.length}</div>
            <div className="mt-2 text-[.82rem] font-bold text-[var(--text-secondary)]">추천 활동</div>
            <div className="mt-1 flex items-center justify-between text-[.70rem] font-semibold text-[var(--text-muted)] max-[540px]:hidden">
              <span>최근 추천 {rec_logs.length}회</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="relative min-h-[112px] w-full rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6b6b] hover:shadow-md max-[540px]:min-h-[86px] max-[540px]:px-2 max-[540px]:pb-3 max-[540px]:pt-8 max-[540px]:text-center max-[540px]:[&>span:first-child]:left-1/2 max-[540px]:[&>span:first-child]:top-2 max-[540px]:[&>span:first-child]:h-6 max-[540px]:[&>span:first-child]:w-6 max-[540px]:[&>span:first-child]:-translate-x-1/2 max-[540px]:[&>span:first-child]:text-sm"
          onClick={() => navigate('/party')}
        >
          <span className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#FFF5F5] text-lg text-[var(--color-danger)]">👥</span>
          <div className="pl-14 pt-1 max-[540px]:pl-0 max-[540px]:pt-0 max-[540px]:[&>div:first-child]:text-xl max-[540px]:[&>div:nth-child(2)]:mt-1 max-[540px]:[&>div:nth-child(2)]:truncate max-[540px]:[&>div:nth-child(2)]:text-[.68rem]">
            <div className="text-2xl font-black leading-none text-[var(--text-primary)]">{visibleMyParties.length}</div>
            <div className="mt-2 text-[.82rem] font-bold text-[var(--text-secondary)]">매칭 기록</div>
            <div className="mt-1 flex items-center justify-between text-[.70rem] font-semibold text-[var(--text-muted)] max-[540px]:hidden">

              <span>완료된 파티 {my_parties.length}건</span>

            </div>
          </div>
        </button>

        <button
          type="button"
          className="relative min-h-[112px] w-full rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#FEB95C] hover:shadow-md max-[540px]:min-h-[86px] max-[540px]:px-2 max-[540px]:pb-3 max-[540px]:pt-8 max-[540px]:text-center max-[540px]:[&>span:first-child]:left-1/2 max-[540px]:[&>span:first-child]:top-2 max-[540px]:[&>span:first-child]:h-6 max-[540px]:[&>span:first-child]:w-6 max-[540px]:[&>span:first-child]:-translate-x-1/2 max-[540px]:[&>span:first-child]:text-sm"
          onClick={handleReviewView}
        >
          <span className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[#FFF8E6] text-lg text-[var(--color-accent)]">★</span>
          <div className="pl-14 pt-1 max-[540px]:pl-0 max-[540px]:pt-0 max-[540px]:[&>div:first-child]:text-xl max-[540px]:[&>div:nth-child(2)]:hidden max-[540px]:[&>div:nth-child(3)]:mt-1 max-[540px]:[&>div:nth-child(3)]:truncate max-[540px]:[&>div:nth-child(3)]:text-[.68rem]">
            <div className="text-2xl font-black leading-none text-[var(--text-primary)]">{my_reviews.length}</div>
            <div className="mt-2 text-[.82rem] font-bold text-[var(--text-secondary)]">내가 작성한 리뷰</div>
            <div className="mt-1 hidden truncate text-[.68rem] font-bold text-[var(--text-secondary)] max-[540px]:block">리뷰</div>
            <div className="mt-1 flex items-center justify-between text-[.70rem] font-semibold text-[var(--text-muted)] max-[540px]:hidden">
              <span>리뷰 보러가기</span>
            </div>
          </div>
        </button>
      </div>

      {user?.role?.toLowerCase() === 'admin' && (

        <div className="mb-6 mx-auto w-full max-w-[1060px]">
          <Link to="/admin"
            className="flex items-center gap-2 rounded-[10px] border border-[#FED7D7] bg-[#FFF5F5] px-4 py-3 font-bold text-[var(--color-danger)] no-underline">

            ⚙️ 관리자 페이지로 이동
          </Link>
        </div>
      )}

      {/* ── 프로필 + 음식 취향 ── */}
      <div className="mx-auto mb-4 grid w-full max-w-[1060px] gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-5">
          <h3 className='text-left text-[1.1rem] font-black text-[var(--text-primary)] mb-4'>프로필</h3>
          <div>
            {[
              ['닉네임', user.nickname ?? ''],
              ['이메일', user.email],
              ['성별', user.gender ?? '미설정'],
              ['주소지', user.address ?? '없음'],
              ['선호메뉴', likes.slice(0, 3).join(', ') || '없음'],
              ['알러지', (user.allergies ?? '').split(',').filter(Boolean).slice(0, 2).join(', ') || '없음'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between border-b border-[var(--bg-surface)] py-2 text-[.88rem]">
                <span className="font-semibold text-[var(--text-muted)]">{label}</span>
                <span className="font-bold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className='text-left text-[1.1rem] font-black text-[var(--text-primary)]'>나의 음식 취향</h3>
            <Link to="/mypage/edit#food-preferences" className="inline-flex w-fit items-center rounded-md bg-white px-4 py-2 text-[.82rem] font-black text-[var(--text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow">
              수정
            </Link>
          </div>

          <div className="mb-2 border-b border-[var(--border-color)] pb-4">
            <div className="mb-3 flex items-center gap-2 text-[.95rem] font-bold text-[#1890ff]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EBF5FF]">
                <img src="/img/icon/thumb-up.png" alt="좋아하는 음식" className="h-5 w-5 object-contain" />
              </span>
              <span>좋아하는 음식</span>
            </div>
            {likes.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {likes.map((item, idx) => (
                  <span key={idx} className="rounded-[20px] border border-[#91d5ff] bg-[#e6f7ff] px-3 py-1 text-[.82rem] text-[#1890ff]">{item}</span>
                ))}
              </div>
            ) : (
              <p className="text-[.95rem] text-[var(--text-muted)]">등록된 선호 음식이 없습니다.</p>
            )}
          </div>

          <div className="pt-2">
            <div className="mb-3 flex items-center gap-2 text-[.95rem] font-bold text-[#FF4D4F]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF3F0]">
                <img src="/img/icon/thumbs-down.png" alt="기피하는 음식" className="h-5 w-5 object-contain" />
              </span>
              <span>기피하는 음식</span>
            </div>
            {dislikes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dislikes.map((item, idx) => (
                  <span key={idx} className="rounded-[20px] border border-[#ffa39e] bg-[#fff1f0] px-3 py-1 text-[.82rem] text-[#ff4d4f]">{item}</span>
                ))}
              </div>
            ) : (
              <p className="text-[.95rem] text-[var(--text-muted)]">등록된 기피 음식이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 나의 활동 탭 ── */}
      <div ref={activityTabsRef} id="my-activity-tabs" className="mx-auto mb-4 scroll-mt-28 rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-5 shadow-sm w-full max-w-[1060px]">
        <div className="mb-6 grid grid-cols-4 border-b border-[var(--border-color)]">
          {myActivityTabs.map(([tabKey, icon, label, mobileLabel = label]) => {
            const isActive = activeMyActivityTab === tabKey
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveMyActivityTab(tabKey)}
                className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-[.9rem] font-black transition max-[540px]:gap-1 max-[540px]:px-1 max-[540px]:py-3 max-[540px]:text-[.68rem] ${isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--color-primary)]'
                  }`}
              >
                <span className="text-base leading-none max-[540px]:text-sm">{icon}</span>
                <span className="truncate max-[540px]:hidden">{label}</span>
                <span className="hidden truncate max-[540px]:inline">{mobileLabel}</span>
              </button>
            )
          })}
        </div>

        {/* 탭 내용 - 활동 내역 */}
        {activeMyActivityTab === 'activity' && (
          <div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 max-[540px]:grid-cols-[minmax(0,1fr)]">
              {rec_logs.slice(0, 3).map((log) => (
                <div key={log.log_id ?? log.restaurant?.id ?? log.restaurant?.restaurant_id} className="flex gap-3.5 rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-3.5">
                  <Link to={`/menu/${log.restaurant?.id ?? log.restaurant?.restaurant_id ?? log.recommended_restaurant_id}`} className="flex min-w-0 flex-1 gap-3.5 text-inherit no-underline">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF5F5] text-[1.1rem]">🤖</div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[.72rem] font-bold text-[var(--text-muted)]">추천</div>
                      <div className="text-[.9rem] font-bold">{log.restaurant?.name ?? '식당 추천'}</div>
                      <div className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                        {log.restaurant?.category ?? ''} · {log.is_liked ? '찜함' : '추천만'}
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleLike(log)}
                    className={`${likeButtonClass} ${log.is_liked !== false ? likedButtonClass : ''}`}
                    aria-label={log.is_liked !== false ? '찜 해제' : '찜하기'}
                  >
                    {log.is_liked !== false ? '♥' : '♡'}
                  </button>
                </div>
              ))}
              {visibleMyParties.slice(0, 2).map((p) => (
                <Link to={`/party/${p.party_id}?tab=chat`} key={p.party_id} className="flex gap-3.5 rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-3.5 text-inherit no-underline">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FFF4] text-[1.1rem]">👥</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 text-[.72rem] font-bold text-[var(--text-muted)]">매칭/파티</div>
                    <div className="text-[.9rem] font-bold">{p.title}</div>
                    <div className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                      {p.restaurant?.name ?? ''} · {p.meeting_time ? new Date(p.meeting_time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Link to="/support" state={{ defaultTab: 'inquiry' }} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-[7px] text-[.85rem] font-bold text-white no-underline">
                고객문의
              </Link>
            </div>
          </div>
        )}

        {/* 탭 내용 - 리뷰 */}
        {activeMyActivityTab === 'reviews' && (
          <div>
            {my_reviews.length === 0 ? (
              <p className="py-10 text-center text-[.9rem] text-[var(--text-muted)]">아직 작성한 리뷰가 없습니다</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {my_reviews.map((rv) => (
                  <div key={rv.review_id || rv.id} className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-white)] px-4 py-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[.95rem] font-bold">{rv.restaurant_name || rv.restaurant?.name || '식당'}</span>
                      <span className="font-bold text-[#F6AD55]">{'★'.repeat(rv.rating) + '☆'.repeat(5 - rv.rating)}</span>
                    </div>
                    <p className="mb-1 mt-0 text-[.88rem] text-[var(--text-muted)]">{rv.content}</p>
                    <span className="text-[.78rem] text-[var(--text-light)]">{rv.created_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 내용 - 찜목록 */}
        {activeMyActivityTab === 'favorites' && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">메뉴 찜목록</h3>
              {displayLikedLogs.length > FAVORITE_LIMIT && (
                <span className="text-xs text-gray-400">
                  총 {displayLikedLogs.length}개 중 {showAllFavorites ? displayLikedLogs.length : FAVORITE_LIMIT}개 표시
                </span>
              )}
            </div>

            {displayLikedLogs.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {(showAllFavorites ? displayLikedLogs : displayLikedLogs.slice(0, FAVORITE_LIMIT)).map((log) => (
                    <div className="card rest-card relative border border-[var(--border-color)] rounded-lg overflow-hidden" key={log.log_id ?? log.restaurant?.id ?? log.restaurant?.restaurant_id}>

                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleLike(log) }}
                        className={`absolute right-2 top-2 z-[2] ${likeButtonClass} ${log.is_liked !== false ? likedButtonClass : ''}`}
                        aria-label={log.is_liked !== false ? '찜 해제' : '찜하기'}
                      >
                        {log.is_liked !== false ? '♥' : '♡'}
                      </button>

                      <Link to={`/menu/${log.restaurant?.id ?? log.restaurant?.restaurant_id ?? log.recommended_restaurant_id}`} className="text-inherit no-underline">
                        <RestaurantImage category={log.restaurant?.category} name={log.restaurant?.name} height={120} className="h-[120px] w-full object-cover" />
                        <div className="p-3">
                          <span className="inline-block bg-[var(--color-soft)] text-[var(--color-primary)] text-xs px-2 py-0.5 rounded font-bold">{log.restaurant?.category ?? '기타'}</span>
                          <div className="font-bold text-[.95rem] truncate mt-2">{log.restaurant?.name ?? '식당'}</div>
                          <div className="text-xs text-[var(--text-muted)] truncate mt-1">
                            {log.restaurant?.address ?? ''}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
                {displayLikedLogs.length > FAVORITE_LIMIT && (
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={() => setShowAllFavorites((v) => !v)} className="rounded-md bg-gray-100 px-5 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200">
                      {showAllFavorites ? '접기 ▲' : `전체 ${displayLikedLogs.length}개 보기 ▼`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-[var(--text-muted)] text-sm">아직 찜한 메뉴가 없습니다</p>
                <Link to="/menu" className="inline-block mt-3 bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-2 rounded">메뉴 둘러보기</Link>
              </div>
            )}
          </div>
        )}

        {/* 탭 내용 - 저장 장소 */}
        {activeMyActivityTab === 'locations' && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">📍   맛집 리스트 <span className="text-sm font-normal text-[var(--text-muted)]">({savedLocs.length}/3)</span></h3>
            </div>
            <p className="mb-4 text-xs text-[var(--text-muted)]">자주 가는 장소를 최대 3개 저장하면 근처 맛집을 추천받을 수 있어요.</p>

            <div className="mb-4 flex flex-col gap-2">
              {savedLocs.map((loc, idx) => (
                <div key={loc.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[.75rem] font-extrabold text-white" 
                      style={{ background: ['#E53E3E', '#3182CE', '#38A169'][idx] }}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[.9rem] font-bold">{loc.name}</div>
                    <div className="truncate text-[.75rem] text-[var(--text-muted)]">{loc.address}</div>
                  </div>
                  <button onClick={() => removeLoc(loc.id)} className="shrink-0 border-0 bg-transparent p-1 text-base text-[var(--text-muted)]">✕</button>
                </div>
              ))}
              {savedLocs.length < 3 && Array.from({ length: 3 - savedLocs.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 rounded-lg border-[1.5px] border-dashed border-[var(--border-color)] bg-transparent px-3.5 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[.75rem] text-[var(--text-light)]">
                    {savedLocs.length + i + 1}
                  </div>
                  <div className="text-[.82rem] text-[var(--text-muted)]">장소를 추가하세요</div>
                </div>
              ))}
            </div>

            {savedLocs.length < 3 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
                  placeholder="장소 검색 (예: 수원역)"
                  className="flex-1 px-3 py-2 border border-[var(--border-color)] rounded-md text-sm"
                />
                <button type="button" onClick={searchPlace} className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md">검색</button>
              </div>
            )}

            {locLoading && <div className="text-center py-2 text-xs text-gray-400">장소 검색 중...</div>}
            {locMsg && <div className="text-xs text-blue-500 mt-2 font-semibold">{locMsg}</div>}

            {locResults.length > 0 && (
              <div className="mt-3 border border-[var(--border-color)] rounded-md max-h-[200px] overflow-y-auto bg-white shadow-sm">
                {locResults.map((place) => (
                  <div key={place.id || place.address} onClick={() => addLoc(place)} className="p-2.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm">
                    <div className="font-bold text-gray-800">{place.name}</div>
                    <div className="text-xs text-gray-500 truncate">{place.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달창 페이지 */}
      {showMannerModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manner-modal-title"
          onClick={() => setShowMannerModal(false)}
        >
          <div
            className="relative w-full max-w-[430px] rounded-[18px] bg-white p-6 shadow-[0_18px_50px_rgba(42,29,26,.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-7 flex items-center justify-between gap-4">
              <h2 id="manner-modal-title" className="text-xl font-black text-[var(--text-primary)]">
                매너점수
              </h2>
            </div>

            <button
              type="button"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border-0 bg-[var(--bg-surface)] text-base font-bold text-[var(--text-muted)]"
              aria-label="매너점수 모달 닫기"
              onClick={() => setShowMannerModal(false)}
            >
              ×
            </button>

            <div className="mb-3 flex w-full items-center gap-4">
              {/* 온도 범위 안내 */}
              <div className="mb-4 w-full rounded-[var(--border-radius-lg)] border border-[var(--border-color)] bg-[var(--bg-white)] p-5">
                <h3 className="mb-3.5">온도 범위 안내</h3>
                {temperatureRanges.map(([min, max, label, rangeClass, currentClass]) => (
                  <div key={label} className="mb-2 flex items-center gap-3">
                    <div className={`w-20 rounded-md px-2 py-[3px] text-center text-[.82rem] font-bold ${rangeClass}`}>
                      {min}~{max}°C
                    </div>
                    <span className="text-[.85rem] text-[var(--text-secondary)]">{label}</span>
                    {mannerScore >= min && mannerScore < max && (
                      <span className={`rounded-[10px] px-2 py-0.5 text-[.75rem] font-bold text-white ${currentClass}`}>
                        현재
                      </span>
                    )}
                  </div>
                ))}
              </div>

            </div>

            <hr className="mb-6 border-0 border-t border-[var(--border-color)]" />

            <div className="space-y-5">
              {mannerItems.map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-base">
                  <span className="font-medium text-[var(--text-muted)]">{label}</span>
                  <span className="font-black text-[var(--color-success)]">+{val}°</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 처리 영역 */}
      <div className="mx-auto mt-8 mb-12 w-full max-w-[1060px] text-right">
        <button type="button" onClick={handleWithdraw} className="text-xs font-semibold text-gray-400 underline hover:text-red-500 transition-colors">
          회원 탈퇴하기
        </button>
      </div>
    </>
  )
}
