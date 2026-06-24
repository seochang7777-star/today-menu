// src/components/Header.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'
import { useState } from 'react'

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [writeMenuOpen, setWriteMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    ctxLogout()
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/menu?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      {/* ── 헤더 ── */}
      <header className="site-header">
        <div className="container">
          {/* 아워홈 TFS 스타일의 위트 있는 시계 타이틀 로고 */}
          <Link to="/" className="site-logo" style={{ textDecoration: 'none' }}>
            <h2 style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#111111',
              letterSpacing: '-0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15em',
              fontFamily: '"Arial Black", "Impact", "Noto Sans KR", sans-serif',
              margin: 0
            }}>
              오늘 뭐먹지?
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '1.05em',
                margin: '0 -0.05em',
                verticalAlign: 'middle'
              }}>
              </span>

            </h2>
          </Link>

          {/* 검색창 영역 */}
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="매번 같은 메뉴, 더 새로운 음식을 찾아봐"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>
          </div>

          {/* 우측 메뉴 액션 영역 (수직 정렬 아이콘 형태) */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {user ? (
              /* ── 1) 로그인 상태일 때 (로그아웃 함수 실행 버튼) ── */
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ fontSize: '1.4rem', color: '#222', lineHeight: 1 }}>🔓</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>로그아웃</span>
              </button>
            ) : (
              /* ── 2) 로그아웃 상태일 때 (회원가입은 로그인 창에서 유도하므로 제외) ── */
              <Link
                to="/login"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <span style={{ fontSize: '1.4rem', color: '#222', lineHeight: 1 }}>↪️</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>로그인</span>
              </Link>
            )}

            {/* ── 3) 마이페이지 ── */}
            <Link
              to="/mypage"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span style={{ fontSize: '1.4rem', color: '#222', lineHeight: 1 }}>🤍</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>마이페이지</span>
            </Link>

            {/* ── 4) 장바구니 ── */}
            <Link
              to="/cart"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span style={{ fontSize: '1.4rem', color: '#222', lineHeight: 1 }}>👜</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#555' }}>장바구니</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ── 네비게이션 바 ── */}
      <nav className="site-nav" style={{ position: 'fixed', top: 'var(--header-h)', left: 0, right: 0, height: 'var(--nav-h)', background: 'var(--bg-surface)', border_bottom: '1px solid var(--border-color)', zIndex: 490 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: '100%', position: 'relative' }}>
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>≡ 전체</NavLink>
          <NavLink to="/menu" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>직식솔루션</NavLink>
          <NavLink to="/menu" className="nav-link">글식솔루션</NavLink>
          <NavLink to="/menu" className="nav-link">솔루션제품</NavLink>
          <NavLink to="/" className="nav-link">메뉴서비지치</NavLink>
          <NavLink to="/" className="nav-link">서포트</NavLink>
          <NavLink to="/party" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>이벤트/기획전</NavLink>

          {/* ── ✍️ #글쓰기 커스텀 옵션 드롭다운 버튼 (오른쪽 끝 정렬) ── */}
          <div className="write-dropdown-container" style={{ marginLeft: 'auto', position: 'relative', zIndex: 600 }}>
            <button
              onClick={() => setWriteMenuOpen(!writeMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                background: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ color: '#4A62D7', fontSize: '1rem' }}>💬</span>
              <span>#글쓰기</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', transform: writeMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>

            {/* ── 드롭다운 메뉴 창 (클릭 시 오픈) ── */}
            {writeMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '8px 0',
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                {/* 항목 1: 온라인메뉴 */}
                <Link
                  to="/write/online"
                  onClick={() => setWriteMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #F1F5F9' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                    <span>#온라인메뉴 🍽️</span>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>&gt;</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', fontWeight: 400 }}>검색해도 안나오는 메뉴가 다 여기에!</div>
                </Link>

                {/* 항목 2: 티키타카 */}
                <Link
                  to="/write/tikitaka"
                  onClick={() => setWriteMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #F1F5F9' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                    <span>#티키타카 📷</span>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>&gt;</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', fontWeight: 400 }}>사부작사부작, 공유하고 놀아요!</div>
                </Link>

                {/* 항목 3: 요즘아워홈 */}
                <Link
                  to="/write/today"
                  onClick={() => setWriteMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 16px', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                    <span>#요즘아워홈 💁🏽‍♀️</span>
                    <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>&gt;</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', fontWeight: 400 }}>아워홈이 뭐하는지 와서 구경하세요</div>
                </Link>
              </div>
            )}
          </div>

          {/* 기존에 존재하던 단순 닉네임 표시는 드롭다운 공간 확보를 위해 뒤로 배치하거나 유지 */}
          {user && (
            <span style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginLeft: '12px' }}>
              🌿 {user.nickname}
            </span>
          )}
        </div>
      </nav>
    </>
  )
}