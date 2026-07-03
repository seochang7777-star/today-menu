// src/pages/MyPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getMyPage, toggleLike, saveFavoriteLocations, searchKakao, toggleFavoriteAction } from '../api/services'
import RestaurantImage from '../components/RestaurantImage'
import { useAuth } from '../App'
import { processTags } from '../utils'

const FAVORITE_LIMIT = 5   // 메뉴 찜목록 기본 표시 개수 (초과 시 '전체보기' 토글)

export default function MyPage() {
  const navigate = useNavigate()
  const { logout: ctxLogout } = useAuth()
  const gauge2Ref = useRef(null)
  const favoriteMenusRef = useRef(null)
  const location = useLocation();

  const [data, setData] = useState(null)
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const [savedLocs, setSavedLocs] = useState([])
  const [locSearch, setLocSearch] = useState('')
  const [locResults, setLocResults] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  useEffect(() => {
  getMyPage()
    .then((d) => {
      console.log("서버에서 받은 전체 데이터:", d);
      setData(d);
      setSavedLocs(d.user.saved_locations ?? []);
    })
    .catch((err) => console.error('마이페이지 로드 실패:', err));
}, [location.pathname]);

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
      setLocMsg('장소는 최대 3개까지 저장 가능합니다.')
      return
    }
    const newLocs = [
      ...savedLocs,
      { name: place.name, address: place.address, lat: place.lat, lng: place.lng },
    ]
    await saveFavoriteLocations(newLocs)
    setSavedLocs(newLocs)
    setLocResults([])
    setLocSearch('')
    setLocMsg(`✅ "${place.name}" 저장됨`)
  }

  const removeLoc = async (idx) => {
    const newLocs = savedLocs.filter((_, i) => i !== idx)
    await saveFavoriteLocations(newLocs)
    setSavedLocs(newLocs)
    setLocMsg('장소가 삭제됐습니다.')
  }

  // ── 찜 토글 ──────────────────────────────────────────────────────────────
  const handleLike = async (logId) => {
    toggleFavoriteAction({
      id: item.id,
      list: trending,
      setter: setTrending,
      type: 'restaurant'
    });
  }

  // 통계 카드 '찜한 메뉴' 클릭 시 찜목록 섹션으로 스크롤
  const handleFavoriteView = () => {
    setShowAllFavorites(true)
    favoriteMenusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── 회원 탈퇴 ────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!window.confirm('정말로 회원 탈퇴를 하시겠습니까?')) return
    try {
      ctxLogout()
      alert('회원 탈퇴가 완료되었습니다.')
      navigate('/')
    } catch {
      alert('탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  // ── 로딩 ─────────────────────────────────────────────────────────────────
  if (!data) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
      로딩 중...
    </div>
  )

  const { user = {}, my_parties = [], rec_logs = [], liked_logs: apiLikedLogs = [] } = data || {};

  const likes = processTags(user.preferences?.likes);
  const dislikes = processTags(user.preferences?.dislikes);
  const mannerScore = user.manner_score;

  const allLikedLogs = [
    ...apiLikedLogs,
    ...rec_logs.filter((r) => r.is_liked && !apiLikedLogs.find(f => f.log_id === r.log_id))
  ];

  const displayLikedLogs = Array.from(
    new Map(
      allLikedLogs.map(item => [item.restaurant?.id ?? item.log_id, item])
    ).values()
  );

  const R = 36
  const circ = 2 * Math.PI * R
  const heroOffset = circ * (1 - Math.min(mannerScore / 50, 1))

  return (
    <>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 24 }}>마이페이지</h1>

      {/* ── HERO BANNER ── */}
      <div className="mypage-hero">
        <div className="mypage-hero-inner">
          <div className="profile-avatar">{user.nickname?.[0]}</div>
          <div className="mypage-hero-text" style={{ flex: 1 }}>
            <div style={{ fontSize: '.78rem', opacity: .55, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
              MY PAGE
            </div>
            <h2>나의 메뉴 취향과 활동을 한눈에 확인하세요.</h2>
            <p>찜한 메뉴, 프로필, 추천 기록, 매칭 내역을 관리하는 마이페이지입니다.</p>
            <Link
              to="/mypage/edit"
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
            >
              프로필 수정 →
            </Link>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                <circle cx="45" cy="45" r={R} fill="none" stroke="#F6AD55" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={heroOffset}
                  transform="rotate(-90 45 45)"
                  style={{ transition: 'stroke-dashoffset 1s' }}
                />
              </svg>
              <div className="manner-num" style={{ color: '#fff' }}>
                <span className="manner-val">{mannerScore}</span>
                <small>°C</small>
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '.75rem', marginTop: 4 }}>매너온도</div>
          </div>
        </div>
      </div>

      {/* ── STAT ROW ── */}
      <div className="stat-row">
        <button
          type="button"
          className="stat-card cursor-pointer text-center transition hover:-translate-y-0.5 hover:border-[#ff6b6b] hover:shadow-md"
          onClick={handleFavoriteView}
        >
          <div className="stat-num">{displayLikedLogs.length}</div>
          <div className="stat-label">찜한 메뉴</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            총 {displayLikedLogs.length}개 찜함
          </div>
        </button>
        <div className="stat-card">
          <div className="stat-num">{rec_logs.length}</div>
          <div className="stat-label">추천 활동</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            최근 추천 {rec_logs.length}회
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{my_parties.length}</div>
          <div className="stat-label">매칭 기록</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            완료된 파티 {my_parties.length}건
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--color-accent)' }}>{mannerScore}</div>
          <div className="stat-label">매너점수</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {mannerScore}점
          </div>
        </div>
      </div>

      {/* ── 프로필 + 매너점수 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>
        <div className="profile-section">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3>프로필</h3>
            <Link to="/mypage/edit" className="btn btn-sm btn-secondary">수정</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
            <div className="profile-avatar">{user.nickname?.[0]}</div>
            <div>
              {[
                ['닉네임', user.nickname ?? ''],
                ['이메일', user.email],
                ['성별', user.gender ?? '미설정'],
                ['주소지', user.address ?? '없음'],
                ['선호메뉴', likes.slice(0, 3).join(', ') || '없음'],
                ['알러지', (user.allergies ?? '').split(',').filter(Boolean).slice(0, 2).join(', ') || '없음'],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bg-surface)', fontSize: '.88rem' }}
                >
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3>매너점수</h3>
            <Link to="/mypage/manner-history" className="btn btn-sm btn-secondary">상세 내역 →</Link>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div ref={gauge2Ref} style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface)" strokeWidth="8" />
                <circle
                  className="progress"
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{mannerScore}</span>
                <small style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>점</small>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>따뜻한 식사 메이트</div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                약속, 공감, 후기 기반으로 쌓아두는 점수
              </p>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />
          {[
            ['파티 참여', (my_parties.length * 0.5).toFixed(1)],
            ['후기 작성', (displayLikedLogs.length * 0.3).toFixed(1)],
            ['약속 이행', '1.0'],
          ].map(([label, val]) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '.82rem', color: 'var(--text-muted)' }}
            >
              <span>{label}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+{val}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 음식 취향 ── */}
      <div className="profile-section">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>🍽️ 나의 음식 취향</h3>
          <Link to="/mypage/edit#food-preferences" className="btn btn-sm btn-secondary">수정 →</Link>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#1890ff', marginBottom: 8 }}>👍 좋아하는 음식</div>
          {likes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {likes.map((item, idx) => (
                <span key={idx} style={{ background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff', padding: '4px 12px', borderRadius: 20, fontSize: '.82rem' }}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>등록된 선호 음식이 없습니다.</p>
          )}
        </div>
        <div>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#ff4d4f', marginBottom: 8 }}>👎 기피하는 음식</div>
          {dislikes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {dislikes.map((item, idx) => (
                <span key={idx} style={{ background: '#fff1f0', color: '#ff4d4f', border: '1px solid #ffa39e', padding: '4px 12px', borderRadius: 20, fontSize: '.82rem' }}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>등록된 기피 음식이 없습니다.</p>
          )}
        </div>
      </div>

      {/* ── 메뉴 찜목록 (탭 없이 좋아요 목록만 표시) ── */}
      <div className="profile-section scroll-mt-28" ref={favoriteMenusRef} id="favorite-menus">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>메뉴 찜목록</h3>
          {displayLikedLogs.length > FAVORITE_LIMIT && (
            <span className="text-xs text-gray-400">
              총 {displayLikedLogs.length}개 중 {showAllFavorites ? displayLikedLogs.length : FAVORITE_LIMIT}개 표시
            </span>
          )}
        </div>

        {displayLikedLogs.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(showAllFavorites ? displayLikedLogs : displayLikedLogs.slice(0, FAVORITE_LIMIT)).map((log) => (
                <Link
                  to={`/menu/${log.restaurant?.id ?? log.recommended_restaurant_id}`}
                  className="card rest-card"
                  key={log.log_id}
                >
                  <RestaurantImage
                    category={log.restaurant?.category}
                    name={log.restaurant?.name}
                    style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                  />
                  <div className="card-body">
                    <span className="badge badge-primary">{log.restaurant?.category ?? '기타'}</span>
                    <div className="card-title mt-8">{log.restaurant?.name ?? '식당'}</div>
                    <div className="rest-addr" style={{ marginTop: 4 }}>
                      {(log.restaurant?.address ?? '').slice(0, 20)}
                      {(log.restaurant?.address?.length ?? 0) > 20 ? '...' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {displayLikedLogs.length > FAVORITE_LIMIT && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowAllFavorites((v) => !v)}
                  className="px-5 py-1.5 rounded-md text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {showAllFavorites ? '접기 ▲' : `전체 ${displayLikedLogs.length}개 보기 ▼`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <p>아직 찜한 메뉴가 없습니다</p>
            <Link to="/menu" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              메뉴 둘러보기
            </Link>
          </div>
        )}
      </div>

      {/* ── 활동내역 ── */}
      <div className="profile-section">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>활동내역</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {rec_logs.slice(0, 3).map((log) => (
            <div
              key={log.log_id}
              style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)' }}
            >
              <Link
                to={`/menu/${log.restaurant?.id ?? log.recommended_restaurant_id}`}
                style={{ display: 'flex', gap: 14, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  🤖
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>추천</div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{log.restaurant?.name ?? '식당 추천'}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {log.restaurant?.category ?? ''} · {log.is_liked ? '찜함' : '추천만'}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleLike(log.log_id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                {log.is_liked ? '❤️' : '🤍'}
              </button>
            </div>
          ))}
          {my_parties.slice(0, 2).map((p) => (
            <Link
              to={`/party/${p.party_id}?tab=chat`}
              key={p.party_id}
              style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FFF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                👥
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>매칭/파티</div>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{p.title}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {p.restaurant?.name ?? ''} · {p.meeting_time
                    ? new Date(p.meeting_time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </div>
              </div>
            </Link>
          ))}
          {rec_logs.length === 0 && my_parties.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">📋</div>
              <p>아직 활동 내역이 없습니다</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Link
            to="/support"
            state={{ defaultTab: 'inquiry' }}
            style={{
              background: 'var(--color-primary)', color: '#fff',
              borderRadius: 8, padding: '7px 16px',
              fontSize: '.85rem', fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            💬 고객문의
          </Link>
        </div>
      </div>

      {/* ── 저장 장소 ── */}
      <div className="profile-section">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>
            📍 저장 장소{' '}
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({savedLocs.length}/3)
            </span>
          </h3>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          자주 가는 장소를 최대 3개 저장하면 챗봇에서 선택해 근처 맛집을 추천받을 수 있어요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {savedLocs.map((loc, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-color)' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: ['#E53E3E', '#3182CE', '#38A169'][idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{loc.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {loc.address}
                </div>
              </div>
              <button
                onClick={() => removeLoc(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: 4, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
          {savedLocs.length < 3 && Array.from({ length: 3 - savedLocs.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', borderRadius: 8, padding: '10px 14px', border: '1.5px dashed var(--border-color)' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: 'var(--text-light)', flexShrink: 0 }}>
                {savedLocs.length + i + 1}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>장소를 추가하세요</div>
            </div>
          ))}
        </div>

        {savedLocs.length < 3 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="form-control"
                style={{ flex: 1 }}
                placeholder="장소명 검색 (예: 우리집, 회사, 학교...)"
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={searchPlace}
                disabled={locLoading}
                style={{ flexShrink: 0 }}
              >
                {locLoading ? '...' : '🔍 검색'}
              </button>
            </div>
            {locMsg && (
              <div style={{ fontSize: '.8rem', padding: '6px 10px', borderRadius: 6, marginBottom: 8, background: locMsg.startsWith('✅') ? '#F0FFF4' : '#FFF5F5', color: locMsg.startsWith('✅') ? '#276749' : '#C53030' }}>
                {locMsg}
              </div>
            )}
            {locResults.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {locResults.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--bg-surface)', background: 'var(--bg-white)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{p.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.address}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '.75rem', flexShrink: 0 }}
                      onClick={() => addLoc(p)}
                    >
                      + 저장
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 회원 탈퇴 ── */}
      <div style={{ marginTop: 56, borderTop: '1px solid var(--border-color)', paddingTop: 24, textAlign: 'right' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 8 }}>
          더 이상 서비스를 이용하고 싶지 않으신가요?
        </p>
        <button
          onClick={handleWithdraw}
          style={{ background: '#E53E3E', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}
        >
          🚨 회원 탈퇴하기
        </button>
      </div>
    </>
  )
}
