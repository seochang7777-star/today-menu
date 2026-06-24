import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'
import { useState } from 'react'

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const handleLogout = () => { logout(); ctxLogout(); navigate('/') }
  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/menu?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      {/* ── 헤더 ── */}
      <header className="site-header">
        <div className="container">
          <Link to="/" className="site-logo">
            🍽️ <span>오늘의 메뉴</span>
          </Link>

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

          <div className="header-actions">
            {user ? (
              <>
                <Link to="/mypage" className="header-user-btn">
                  <div className="avatar-sm">{user.nickname?.[0]}</div>
                  {user.nickname}
                </Link>
                <button onClick={handleLogout} className="btn btn-sm btn-secondary">로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn btn-sm btn-secondary">로그인</Link>
                <Link to="/register" className="btn btn-sm btn-primary">회원가입</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 네비 ── */}
      <nav className="site-nav">
        <div className="container">
          <NavLink to="/"      end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>≡ 전체</NavLink>
          <NavLink to="/menu"     className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>직식솔루션</NavLink>
          <NavLink to="/menu"     className="nav-link">글식솔루션</NavLink>
          <NavLink to="/menu"     className="nav-link">솔루션제품</NavLink>
          <NavLink to="/"         className="nav-link">메뉴서비지치</NavLink>
          <NavLink to="/"         className="nav-link">서포트</NavLink>
          <NavLink to="/party"    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>이벤트/기획전</NavLink>
          <NavLink to="/game"     className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700 }}>
            🎲 게임창
          </NavLink>
          {user && (
            <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
              🌿 {user.nickname}
            </span>
          )}
        </div>
      </nav>
    </>
  )
}
