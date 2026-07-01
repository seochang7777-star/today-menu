// src/pages/MyPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyPage, toggleLike, saveFavoriteLocations, searchKakao } from '../api/services'
import { useAuth } from '../App'
import { processTags } from '../utils'

const FAVORITE_LIMIT = 5   // 메뉴 찜목록 기본 표시 개수 (초과 시 '전체보기' 토글)

export default function MyPage() {
  const navigate = useNavigate()
  const { logout: ctxLogout } = useAuth()
  const gauge2Ref = useRef(null)
  const favoriteMenusRef = useRef(null)

  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('liked')
  const [showAllFavorites, setShowAllFavorites] = useState(false)   // 찜목록 전체보기 토글
  const [savedLocs, setSavedLocs] = useState([])
  const [locSearch, setLocSearch] = useState('')
  const [locResults, setLocResults] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  useEffect(() => {
    getMyPage()
      .then((d) => {
        setData(d)
        setSavedLocs(d.user.saved_locations ?? [])
      })
      .catch((err) => console.error('마이페이지 로드 실패:', err))
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

  // ── 카카오 장소 검색 (searchKakao 서비스 함수 사용) ──────────────────────
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
    const res = await toggleLike(logId)
    setData((d) => ({
      ...d,
      rec_logs: d.rec_logs.map((r) =>
        r.log_id === logId ? { ...r, is_liked: res.liked } : r
      ),
    }))
  }

  // 통계 카드 '찜한 메뉴' 클릭 시 찜목록 섹션으로 스크롤 + 좋아요 탭 활성화 + 전체보기
  const handleFavoriteView = () => {
    setActiveTab('liked')
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
    <div className="text-center py-[60px] text-[var(--text-muted)]">
      로딩 중...
    </div>
  )

  const { user, my_parties, rec_logs } = data
  const likes = processTags(user.preferences?.likes)
  const dislikes = processTags(user.preferences?.dislikes)
  const liked_logs = rec_logs.filter((r) => r.is_liked)
  const mannerScore = user.manner_score

  const R = 36
  const circ = 2 * Math.PI * R
  const heroOffset = circ * (1 - Math.min(mannerScore / 50, 1))

  return (
    <>
      <h1 className="text-[2.4rem] font-black mb-6">마이페이지</h1>

      {/* ── HERO BANNER ── */}
      <div className="mypage-hero">
        <div className="mypage-hero-inner">
          <div className="profile-avatar">{user.nickname?.[0]}</div>
          <div className="mypage-hero-text flex-1">
            <div className="text-[.78rem] opacity-55 uppercase tracking-wider mb-1">
              MY PAGE
            </div>
            <h2>나의 메뉴 취향과 활동을 한눈에 확인하세요.</h2>
            <p>찜한 메뉴, 프로필, 추천 기록, 매칭 내역을 관리하는 마이페이지입니다.</p>
            <Link
              to="/mypage/edit"
              className="btn btn-sm bg-white/15 text-white border border-white/30"
            >
              프로필 수정 →
            </Link>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="relative w-[90px] h-[90px]">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                <circle cx="45" cy="45" r={R} fill="none" stroke="#F6AD55" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={heroOffset}
                  transform="rotate(-90 45 45)"
                  className="transition-[stroke-dashoffset] duration-1000"
                />
              </svg>
              <div className="manner-num text-white">
                <span className="manner-val">{mannerScore}</span>
                <small>°C</small>
              </div>
            </div>
            <div className="text-white/65 text-xs mt-1">매너온도</div>
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
          <div className="stat-num">{likes.length}</div>
          <div className="stat-label">찜한 메뉴</div>
          <div className="text-[.72rem] text-[var(--text-muted)] mt-0.5">
            좋아요 {likes.length}개 · 싫어요 {dislikes.length}개
          </div>
        </button>
        <div className="stat-card">
          <div className="stat-num">{rec_logs.length}</div>
          <div className="stat-label">추천 활동</div>
          <div className="text-[.72rem] text-[var(--text-muted)] mt-0.5">
            최근 추천 {rec_logs.length}회
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{my_parties.length}</div>
          <div className="stat-label">매칭 기록</div>
          <div className="text-[.72rem] text-[var(--text-muted)] mt-0.5">
            완료된 파티 {my_parties.length}건
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num text-[var(--color-accent)]">{mannerScore}</div>
          <div className="stat-label">매너점수</div>
          <div className="text-[.72rem] text-[var(--text-muted)] mt-0.5">
            당근처럼 {mannerScore}점
          </div>
        </div>
      </div>

      {/* ── 프로필 + 매너점수 ── */}
      <div className="grid grid-cols-[1fr_360px] gap-4 mb-4">
        <div className="profile-section">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3>프로필</h3>
            <Link to="/mypage/edit" className="btn btn-sm btn-secondary">수정</Link>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
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
                  className="flex justify-between py-2 border-b border-[var(--bg-surface)] text-[.88rem]"
                >
                  <span className="text-[var(--text-muted)] font-semibold">{label}</span>
                  <span className="font-bold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3>매너점수</h3>
          </div>
          <div className="flex gap-4 items-center">
            <div ref={gauge2Ref} className="relative w-[100px] h-[100px] flex-shrink-0">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold leading-none">{mannerScore}</span>
                <small className="text-[.65rem] text-[var(--text-muted)]">점</small>
              </div>
            </div>
            <div>
              <div className="font-bold text-base mb-1.5">따뜻한 식사 메이트</div>
              <p className="text-[.82rem] text-[var(--text-muted)] leading-relaxed">
                약속, 공감, 후기 기반으로 쌓아두는 점수
              </p>
            </div>
          </div>
          <hr className="border-0 border-t border-[var(--border-color)] my-4" />
          {[
            ['파티 참여', (my_parties.length * 0.5).toFixed(1)],
            ['후기 작성', (liked_logs.length * 0.3).toFixed(1)],
            ['약속 이행', '1.0'],
          ].map(([label, val]) => (
            <div
              key={label}
              className="flex justify-between py-1.5 text-[.82rem] text-[var(--text-muted)]"
            >
              <span>{label}</span>
              <span className="font-bold text-[var(--color-success)]">+{val}°</span>
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
        <div className="mb-4">
          <div className="text-[.82rem] font-bold text-[#1890ff] mb-2">👍 좋아하는 음식</div>
          {likes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {likes.map((item, idx) => (
                <span key={idx} className="bg-[#e6f7ff] text-[#1890ff] border border-[#91d5ff] px-3 py-1 rounded-full text-[.82rem]">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[.82rem] text-[var(--text-muted)]">등록된 선호 음식이 없습니다.</p>
          )}
        </div>
        <div>
          <div className="text-[.82rem] font-bold text-[#ff4d4f] mb-2">👎 기피하는 음식</div>
          {dislikes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dislikes.map((item, idx) => (
                <span key={idx} className="bg-[#fff1f0] text-[#ff4d4f] border border-[#ffa39e] px-3 py-1 rounded-full text-[.82rem]">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[.82rem] text-[var(--text-muted)]">등록된 기피 음식이 없습니다.</p>
          )}
        </div>
      </div>

      {/* ── 메뉴 찜목록 (기본 FAVORITE_LIMIT개, 펼치기로 전체보기) ── */}
      <div className="profile-section scroll-mt-28" ref={favoriteMenusRef} id="favorite-menus">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>메뉴 찜목록</h3>
          {liked_logs.length > FAVORITE_LIMIT && activeTab === 'liked' && (
            <span className="text-xs text-gray-400">총 {liked_logs.length}개 중 {showAllFavorites ? liked_logs.length : FAVORITE_LIMIT}개 표시</span>
          )}
        </div>
        <div className="flex gap-1.5 mb-4">
          {[['liked', '좋아요'], ['disliked', '싫어요']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-1.5 rounded-md text-sm font-bold transition-colors ${
                activeTab === key
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'liked' && (
          liked_logs.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(showAllFavorites ? liked_logs : liked_logs.slice(0, FAVORITE_LIMIT)).map((log) => (
                  <Link
                    to={`/menu/${log.restaurant?.id ?? log.recommended_restaurant_id}`}
                    className="card rest-card"
                    key={log.log_id}
                  >
                    <div className="card-img text-3xl">🍴</div>
                    <div className="card-body">
                      <span className="badge badge-primary">{log.restaurant?.category ?? '기타'}</span>
                      <div className="card-title mt-8">{log.restaurant?.name ?? '식당'}</div>
                      <div className="rest-addr mt-1">
                        {(log.restaurant?.address ?? '').slice(0, 20)}
                        {(log.restaurant?.address?.length ?? 0) > 20 ? '...' : ''}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {liked_logs.length > FAVORITE_LIMIT && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllFavorites((v) => !v)}
                    className="px-5 py-1.5 rounded-md text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {showAllFavorites ? '접기 ▲' : `전체 ${liked_logs.length}개 보기 ▼`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">❤️</div>
              <p>아직 찜한 메뉴가 없습니다</p>
              <Link to="/menu" className="btn btn-primary btn-sm mt-3">
                메뉴 둘러보기
              </Link>
            </div>
          )
        )}

        {activeTab === 'disliked' && (
          dislikes.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-4">
              {dislikes.map((d) => (
                <span key={d} className="px-3 py-1 rounded-2xl bg-[#FFF5F5] text-[var(--color-danger)] text-[.78rem] font-semibold">
                  {d}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👎</div>
              <p>싫어하는 음식이 없습니다</p>
            </div>
          )
        )}
      </div>

      {/* ── 활동내역 ── */}
      <div className="profile-section">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>활동내역</h3>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {rec_logs.slice(0, 3).map((log) => (
            <div
              key={log.log_id}
              className="flex gap-3.5 p-3.5 bg-[var(--bg-white)] border border-[var(--border-color)] rounded-[var(--border-radius-lg)]"
            >
              <Link
                to={`/menu/${log.restaurant?.id ?? log.recommended_restaurant_id}`}
                className="flex gap-3.5 flex-1 min-w-0 no-underline text-inherit"
              >
                <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center text-lg flex-shrink-0">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[.72rem] font-bold text-[var(--text-muted)] mb-0.5">추천</div>
                  <div className="font-bold text-[.9rem]">{log.restaurant?.name ?? '식당 추천'}</div>
                  <div className="text-[.8rem] text-[var(--text-muted)] mt-0.5">
                    {log.restaurant?.category ?? ''} · {log.is_liked ? '찜함' : '추천만'}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleLike(log.log_id)}
                className="bg-transparent border-0 cursor-pointer text-lg"
              >
                {log.is_liked ? '❤️' : '🤍'}
              </button>
            </div>
          ))}
          {my_parties.slice(0, 2).map((p) => (
            <Link
              to={`/party/${p.party_id}?tab=chat`}
              key={p.party_id}
              className="flex gap-3.5 p-3.5 bg-[var(--bg-white)] border border-[var(--border-color)] rounded-[var(--border-radius-lg)] text-inherit no-underline"
            >
              <div className="w-10 h-10 rounded-full bg-[#F0FFF4] flex items-center justify-center text-lg flex-shrink-0">
                👥
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[.72rem] font-bold text-[var(--text-muted)] mb-0.5">매칭/파티</div>
                <div className="font-bold text-[.9rem]">{p.title}</div>
                <div className="text-[.8rem] text-[var(--text-muted)] mt-0.5">
                  {p.restaurant?.name ?? ''} · {p.meeting_time
                    ? new Date(p.meeting_time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </div>
              </div>
            </Link>
          ))}
          {rec_logs.length === 0 && my_parties.length === 0 && (
            <div className="empty-state col-span-full">
              <div className="empty-icon">📋</div>
              <p>아직 활동 내역이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 저장 장소 ── */}
      <div className="profile-section">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3>
            📍 저장 장소{' '}
            <span className="text-[.8rem] text-[var(--text-muted)] font-normal">
              ({savedLocs.length}/3)
            </span>
          </h3>
        </div>
        <p className="text-[.82rem] text-[var(--text-muted)] mb-3.5">
          자주 가는 장소를 최대 3개 저장하면 챗봇에서 선택해 근처 맛집을 추천받을 수 있어요.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {savedLocs.map((loc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-lg px-3.5 py-2.5 border border-[var(--border-color)]"
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 text-white flex items-center justify-center text-[.75rem] font-extrabold"
                style={{ background: ['#E53E3E', '#3182CE', '#38A169'][idx] }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[.9rem]">{loc.name}</div>
                <div className="text-[.75rem] text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
                  {loc.address}
                </div>
              </div>
              <button
                onClick={() => removeLoc(idx)}
                className="bg-transparent border-0 cursor-pointer text-[var(--text-muted)] text-base p-1 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          {savedLocs.length < 3 && Array.from({ length: 3 - savedLocs.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 bg-transparent rounded-lg px-3.5 py-2.5 border-[1.5px] border-dashed border-[var(--border-color)]"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[.75rem] text-[var(--text-light)] flex-shrink-0">
                {savedLocs.length + i + 1}
              </div>
              <div className="text-[.82rem] text-[var(--text-muted)]">장소를 추가하세요</div>
            </div>
          ))}
        </div>

        {savedLocs.length < 3 && (
          <div>
            <div className="flex gap-2 mb-2">
              <input
                className="form-control flex-1"
                placeholder="장소명 검색 (예: 우리집, 회사, 학교...)"
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlace()}
              />
              <button
                className="btn btn-secondary btn-sm flex-shrink-0"
                onClick={searchPlace}
                disabled={locLoading}
              >
                {locLoading ? '...' : '🔍 검색'}
              </button>
            </div>
            {locMsg && (
              <div className={`text-[.8rem] px-2.5 py-1.5 rounded-md mb-2 ${locMsg.startsWith('✅') ? 'bg-[#F0FFF4] text-[#276749]' : 'bg-[#FFF5F5] text-[#C53030]'}`}>
                {locMsg}
              </div>
            )}
            {locResults.length > 0 && (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                {locResults.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[var(--bg-surface)] bg-[var(--bg-white)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[.88rem]">{p.name}</div>
                      <div className="text-[.75rem] text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
                        {p.address}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm text-[.75rem] flex-shrink-0"
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
      <div className="mt-14 border-t border-[var(--border-color)] pt-6 text-right">
        <p className="text-[var(--text-muted)] text-[.85rem] mb-2">
          더 이상 서비스를 이용하고 싶지 않으신가요?
        </p>
        <button
          onClick={handleWithdraw}
          className="bg-[#E53E3E] text-white border-0 rounded px-3 py-1.5 text-[.85rem] font-bold cursor-pointer"
        >
          🚨 회원 탈퇴하기
        </button>
      </div>
    </>
  )
}
