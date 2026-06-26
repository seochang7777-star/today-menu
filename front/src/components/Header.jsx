import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'

const NAV_LINKS = [
  { to: '/',      label: '홈',         end: true },
  { to: '/menu',  label: '메뉴 찾기' },
  { to: '/party', label: '밥친구' },
  { to: '/game',  label: '🎲 게임창' },
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
        <div className="container">
          {/* 로고 */}
          <Link to="/" className="site-logo" onClick={() => setMobileOpen(false)}>
            🍽️ <span>오늘의 메뉴</span>
          </Link>

          {/* 검색 (데스크탑) */}
          <div className="header-search" style={{ flex: 1, maxWidth: 420 }}>
            <span className="search-icon">🔍</span>
            <form onSubmit={handleSearch} style={{ width: '100%' }}>
              <input type="text" placeholder="식당명, 메뉴 검색..."
                value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
            </form>
          </div>

          {/* 유저 영역 (데스크탑) */}
          <div className="header-actions">
            {user ? (
              // ── 로그인 상태 ──────────────────────────────────────────────
              <>
                <Link to="/mypage" className="header-user-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-primary)' }}>
                  <div className="avatar-sm">{user.nickname?.[0] ?? '?'}</div>
                  <span className="hide-mobile" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                    {user.nickname}
                  </span>
                </Link>
                <button onClick={handleLogout}
                  className="btn btn-sm btn-secondary hide-mobile">
                  로그아웃
                </button>
              </>
            ) : (
              // ── 비로그인 상태 ─────────────────────────────────────────────
              <>
                <Link to="/login"    className="btn btn-sm btn-secondary hide-mobile">로그인</Link>
                <Link to="/register" className="btn btn-sm btn-primary  hide-mobile">회원가입</Link>
              </>
            )}
            {/* 햄버거 (모바일) */}
            <button className="show-mobile"
              onClick={() => setMobileOpen((o) => !o)}
              style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: 4, color: 'var(--text-primary)' }}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* ── 네비 (데스크탑) ── */}
      <nav className="site-nav">
        <div className="container">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navCls}>{label}</NavLink>
          ))}
          {user && (
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '.82rem' }}>
              👤 {user.nickname}님 환영합니다
            </span>
          )}
        </div>
      </nav>

      {/* ── 모바일 드로어 ── */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 400 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 260,
            background: 'var(--bg-white)', zIndex: 410,
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>🍽️ 오늘의 메뉴</span>
              <button onClick={() => setMobileOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* 유저 정보 */}
            {user && (
              <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="profile-avatar" style={{ width: 40, height: 40, fontSize: '1.1rem' }}>
                  {user.nickname?.[0] ?? '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user.nickname}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>
            )}

            {/* 네비 링크 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {NAV_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                  style={{ display: 'block', padding: '14px 20px', fontWeight: 600, fontSize: '.95rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-surface)', textDecoration: 'none' }}>
                  {label}
                </Link>
              ))}
              {user && (
                <Link to="/mypage" onClick={() => setMobileOpen(false)}
                  style={{ display: 'block', padding: '14px 20px', fontWeight: 600, fontSize: '.95rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-surface)', textDecoration: 'none' }}>
                  👤 마이페이지
                </Link>
              )}
            </div>

            {/* 로그인/로그아웃 */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
              {user ? (
                <button onClick={handleLogout} className="btn btn-secondary btn-block">로그아웃</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>로그인</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary  btn-block" style={{ textDecoration: 'none' }}>회원가입</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
