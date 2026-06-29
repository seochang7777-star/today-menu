import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'

const NAV_LINKS = [
  { to: '/',      label: '홈', end: true },
  { to: '/menu',  label: '맛집 찾기' },
  { to: '/party', label: '밥친구' },
  { to: '/game',  label: '게임창' },
]

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [q, setQ] = useState('')

  const handleLogout = () => {
    logout(); ctxLogout(); navigate('/'); setMobileOpen(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (q.trim()) { navigate(`/menu?q=${encodeURIComponent(q)}`); setMobileOpen(false) }
  }

  const navCls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '')

  return (
    <>
      <header className="site-header">
        <div className="container header-container">
          <Link to="/" className="site-logo" onClick={() => setMobileOpen(false)}>
            <span>오늘 뭐먹지?</span>
            <span className="logo-clock">⏰</span>
          </Link>

          <div className="header-search">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="식당명, 메뉴 검색..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="search-submit" aria-label="검색">⌕</button>
            </form>
          </div>

          <div className="header-actions">
            {user ? (
              <>
                <button onClick={handleLogout} className="header-icon-link">
                  <img src="/img/logout.png" className="h-xl" alt="logout" />
                  {/* <span>로그아웃</span> */}
                </button>
              </>
            ) : (
              <>
                <Link to="/mypage" className="header-icon-link">
                  
                </Link>
                <Link to="/login" className="header-icon-link">
                  <img src="/img/login.png" alt="login" />
                  {/* <span>로그인</span> */}
                </Link>
              </>
            )}

            <button className="show-mobile mobile-menu-btn" onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      <nav className="site-nav">
        <div className="container nav-container">
          <div className="nav-links">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navCls}>{label}</NavLink>
            ))}
          </div>

          
            <Link to="/mypage" className="header-icon-link">
            <div className="nav-welcome">
            {user ? (
              <span>{user.nickname}님 환영합니다</span>
            ) : null}
            
          </div></Link>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} className="mobile-overlay" />
          <div className="mobile-drawer">
            <div className="mobile-drawer-head">
              <span>오늘 뭐먹지? ⏰</span>
              <button onClick={() => setMobileOpen(false)}>✕</button>
            </div>

            {user && (
              <div className="mobile-profile">
                <div className="profile-avatar">{user.nickname?.[0] ?? '?'}</div>
                <div>
                  <div>{user.nickname}님 환영합니다</div>
                  <small>{user.email}</small>
                </div>
              </div>
            )}

            <div className="mobile-links">
              {NAV_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                  {label}
                </Link>
              ))}
              <Link to="/mypage" onClick={() => setMobileOpen(false)}>
                ♡ 마이페이지
              </Link>
            </div>

            <div className="mobile-auth">
              {user ? (
                <button onClick={handleLogout} className="btn btn-secondary btn-block">로그아웃</button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary btn-block">로그인</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary btn-block">회원가입</Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
