// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getRestaurants, getNearby } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantSearch from '../components/RestaurantSearch'

const CAT_ICON = { 한식: '🍚', 일식: '🍣', 중식: '🥟', 양식: '🥩', 분식: '🍜', 치킨: '🍗', 피자: '🍕', 카페: '☕' }
const TREND_FOODS = ['삼겹살', '치킨', '짜장면', '순대국', '초밥', '파스타', '비빔밥', '떡볶이']
const POPULAR = [['🍚', '김치찌개'], ['🍜', '짬뽕'], ['🥩', '스테이크'], ['🍣', '초밥'], ['🍗', '치킨'], ['🍕', '피자']]
const NEWS = ['AI 기반 메뉴 추천 서비스 시작', '밥친구 매칭 기능 출시', '신규 식당 300곳 추가', '이벤트 진행 중']

function catIcon(c) { return CAT_ICON[c] ?? '🍴' }

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
      .then((d) => setTrending(d.items ?? []))
      .catch((err) => console.error('trending 로드 실패:', err))
  }, [])

  // 배너 자동 슬라이드
  useEffect(() => {
    bannerTimer.current = setInterval(() => setBannerIdx((i) => (i + 1) % 2), 4500)
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
        setNearby(data); setLocStatus('done')
      } catch { setLocStatus('error') }
    }, () => setLocStatus('error'))
  }

  return (
    <div className="container" style={{ marginTop: '24px', paddingBottom: '60px' }}>
      {/* TITLE BAR */}
      <div className="flex-between mb-16">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h2 style={{
            fontSize: '2.2rem',            /* 글자 크기를 이미지처럼 시원하게 키움 */
            fontWeight: 900,               /* 가장 두꺼운 폰트 두께 */
            color: '#111111',              /* 이미지 특유의 진한 블랙 컬러 */
            letterSpacing: '-0.05em',      /* 이미지처럼 글자 자간을 쫀쫀하게 압축 */
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.15em',                 /* 단어 사이의 미세한 간격 */
            fontFamily: '"Arial Black", "Impact", "Noto Sans KR", sans-serif' /* 굵은 영문 전용 폰트 지정 */
          }}>
            HAVE A G
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '1.05em',          /* 시계 이모지가 글자 높이와 딱 맞게 미세 조절 */
              margin: '0 -0.07em',         /* 이모지 좌우 공백을 줄여 자연스럽게 연결 */
              verticalAlign: 'middle'
            }}>
              🕒
            </span>
            OD TIME
          </h2>
          {/* <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>AI가 추천하는 오늘의 최적 식사</span> */}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button id="locBtn" className="btn btn-sm btn-secondary"
            disabled={locStatus === 'loading'} onClick={findNearby}>
            {locStatus === 'loading' ? '📡 확인 중...' : '📍 내 주변 찾기'}
          </button>
          {user && <Link to="/party/create" className="btn btn-sm btn-primary">+ 파티 만들기</Link>}
        </div>
      </div>

      {/* TREND + MAIN BANNER */}
      <div className="top-section">
        <div className="trend-card">
          <h4>🔥 TREND</h4>
          <div className="trend-list">
            {TREND_FOODS.map((food, i) => (
              <div className="trend-item" key={food}>
                <span className="trend-rank">{i + 1}</span>
                <span className="trend-name">{food}</span>
                {i < 3 && <span style={{ color: 'var(--color-primary)', fontSize: '.75rem', fontWeight: 'bold' }}>↑</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="main-banner">
          <div className={`banner-slide${bannerIdx === 0 ? ' active' : ''}`}
            style={{ background: 'linear-gradient(135deg, #D9383A, #B8292B)', color: '#fff' }}>
            <div style={{ fontSize: '2.5rem' }}>🍽️</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>오늘의 특가 식당</div>
            <div style={{ fontSize: '.9rem', opacity: .9 }}>AI가 추천하는 오늘의 베스트 맛집</div>
            <Link to="/menu" className="btn btn-sm" style={{ background: '#fff', color: 'var(--color-primary)', marginTop: 8 }}>더 보기 →</Link>
          </div>
          <div className={`banner-slide${bannerIdx === 1 ? ' active' : ''}`}
            style={{ background: 'linear-gradient(135deg, #332B2A, #4A3E3D)', color: '#fff' }}>
            <div style={{ fontSize: '2.5rem' }}>👥</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>밥친구 매칭</div>
            <div style={{ fontSize: '.9rem', opacity: .9 }}>혼밥은 이제 그만! 함께 먹어요</div>
            <Link to="/party" className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>파티 찾기 →</Link>
          </div>
        </div>
      </div>

      {/* INDEX i1~i8 */}
      <div className="index-scroll mb-16">
        {Object.entries(CAT_ICON).map(([name, icon]) => (
          <Link to={`/menu?cat=${name}`} className="index-item" key={name}>
            <div className="index-thumb">{icon}</div>
            <div className="index-label">{name}</div>
          </Link>
        ))}
      </div>

      {/* POPULAR + CATEGORY */}
      <div className="popular-section mb-16">
        <div className="popular-left">
          <h3>음식 인기순위</h3>
          <p>실시간 주문 데이터<br />기반 인기 메뉴</p>
          <Link to="/menu">+ 메뉴카테고리</Link>
        </div>
        <div className="popular-right">
          {POPULAR.map(([icon, name]) => (
            <Link to={`/menu?q=${name}`} className="popular-food-card" key={name}>
              <div className="popular-food-thumb">{icon}</div>
              <div className="popular-food-name">{name}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 인기 맛집 TOP 8 */}
      <section style={{ marginBottom: 32 }}>
        <div className="section-title">
          <span>🔥 인기 맛집 TOP 8</span>
          <Link to="/menu">전체보기 →</Link>
        </div>
        <div className="grid-4">
          {trending.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">🍴</div>
              <p>등록된 식당이 없습니다. 관리자에게 문의하세요.</p>
            </div>
          ) : trending.slice(0, 8).map((r) => (
            <Link to={`/menu/${r.id}`} className="card rest-card" key={r.id}>
              <div className="card-img">{catIcon(r.category)}</div>
              <div className="card-body">
                <span className="badge badge-primary">{r.category || '기타'}</span>
                <div className="card-title mt-8">{r.name}</div>
                <div className="rest-meta">
                  <span className="stars">★★★★</span>
                  <span className="rest-rating">{(r.avg_rating ?? 0).toFixed(1)}</span>
                </div>
                <div className="rest-addr">{r.address}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* NEARBY GRID */}
      {user && (
        <section style={{ marginBottom: 32 }}>
          <div className="section-title">
            <span>📍 내 주변 추천</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowSearch((s) => !s)}>
                {showSearch ? '❌ 패널 닫기' : '🔍 식당 검색/등록'}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={findNearby}>
                {locStatus === 'loading' ? '📡 확인 중...' : '위치 불러오기'}
              </button>
            </div>
          </div>

          {/* 카카오 식당 검색 패널 */}
          {showSearch && (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 20, marginBottom: 16 }}>
              <h4 style={{ marginBottom: 14, fontSize: '.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>🔍 카카오 식당 검색 & DB 등록</h4>
              <RestaurantSearch
                userLoc={userLoc}
                onRegister={() => {
                  if (userLoc) findNearby()
                }}
              />
            </div>
          )}

          {/* 위치 기반 카카오맵 + 카드 */}
          {locStatus === 'error' && (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <p>위치 권한을 허용해주세요</p>
            </div>
          )}
          {locStatus === 'done' && (
            <>
              {userLoc && (
                <div style={{ marginBottom: 16, borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <KakaoMap
                    center={userLoc}
                    markers={nearby.map((r) => ({ lat: r.latitude ?? r.lat, lng: r.longitude ?? r.lng, name: r.name, category: r.category, dist: r.dist, id: r.id }))}
                    height="280px"
                  />
                </div>
              )}
              {nearby.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📍</div>
                  <p>주변 500m 내 식당이 없습니다</p>
                </div>
              ) : (
                <div className="grid-4" id="nearbyGrid">
                  {nearby.slice(0, 4).map((r) => (
                    <Link to={`/menu/${r.id}`} className="card rest-card" key={r.id}>
                      <div className="card-img">{catIcon(r.category)}</div>
                      <div className="card-body">
                        <span className="badge badge-primary">{r.category || '기타'}</span>
                        <div className="card-title mt-8">{r.name}</div>
                        <div className="rest-meta">
                          <span className="stars">★</span>
                          <span className="rest-rating">{(r.avg_rating ?? 0).toFixed(1)}</span>
                          <span className="rest-dist">🚶 {r.dist}m</span>
                        </div>
                        <div className="rest-addr">{r.address}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
          {locStatus === 'idle' && !showSearch && (
            <div className="empty-state">
              <div className="empty-icon">📍</div>
              <p>위치를 불러오면 주변 식당을 보여드려요</p>
            </div>
          )}
        </section>
      )}

      {/* PROMO BANNER */}
      <div className="promo-banner">
        🎉 신규 가입 시 AI 추천 쿠폰 증정! —{' '}
        <Link to="/register" style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>지금 가입하기 →</Link>
      </div>

      {/* NEWS */}
      <div className="section-title mt-24">
        <span>📰 최신 소식</span>
        <a href="#">전체보기 →</a>
      </div>
      <div className="news-grid">
        <div className="news-card news-main">
          <div className="news-thumb-main">📰</div>
          <div className="news-body">
            <div className="news-tag">STATUS</div>
            <div className="news-title">오늘의 메뉴 앱 업데이트 소식 — AI 추천 알고리즘 개선</div>
            <div className="news-date">2026.06.24</div>
          </div>
        </div>
        <div className="news-sub-container">
          {NEWS.map((title, i) => (
            <div className="news-card" key={i}>
              <div className="news-thumb">Document</div>
              <div className="news-body">
                <div className="news-tag">NEWS {i + 1}</div>
                <div className="news-title">{title}</div>
                <div className="news-date">2026.06.{24 - i}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
