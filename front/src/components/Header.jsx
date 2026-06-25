import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'
import { useState } from 'react'

const NAV_LINKS = [
  { to: '/', label: '홈', end: true },
  { to: '/menu', label: '메뉴 찾기' },
  { to: '/party', label: '밥친구' },
  { to: '/game', label: '🎲 게임창' },
]

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [writeMenuOpen, setWriteMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    ctxLogout()
    navigate('/')
    setMobileOpen(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/menu?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      {/* ── 헤더 ── */}
      <header className="site-header">

        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <Link to="/" className="site-logo" style={{ textDecoration: 'none' }}>
            <h2 style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#111111',
              letterSpacing: '-0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15em',
              margin: 0
            }}>
              오늘 뭐먹지? 🕒
            </h2>
          </Link>

          {/* 검색 */}
          <div className="header-search" style={{ flex: 1, maxWidth: 420 }}>
            <span className="search-icon">🔍</span>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="식당명, 메뉴 검색..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>
          </div>

          {/* 액션 */}
          <div className="header-actions" style={{ display: 'flex', gap: '24px' }}>
            {user ? (
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                🔓 로그아웃
              </button>
            ) : (
              <Link to="/login">로그인</Link>
            )}
            <Link to="/mypage">마이페이지</Link>
            <Link to="/cart">장바구니</Link>
          </div>

        </div>
      </header>

      {/* ── 네비 ── */}
      <nav className="site-nav">
        <div className="container" style={{ display: 'flex' }}>

          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                'nav-link' + (isActive ? ' active' : '')
              }
            >
              {link.label}
            </NavLink>
          ))}

          {/* 글쓰기 */}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button onClick={() => setWriteMenuOpen(!writeMenuOpen)}>
              #글쓰기
            </button>

            {writeMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                background: '#fff',
                border: '1px solid #ddd'
              }}>
                <Link to="/write/online">온라인메뉴</Link><br />
                <Link to="/write/tikitaka">티키타카</Link><br />
                <Link to="/write/today">요즘아워홈</Link>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* ✅ 모바일 */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)' }}
          />
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: 260,
            height: '100%',
            background: '#fff'
          }}>
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}