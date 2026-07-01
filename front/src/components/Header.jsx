import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'

const NAV_LINKS = [
  { to: '/', label: '홈', end: true },
  { to: '/menu', label: '맛집 찾기' },
  { to: '/party', label: '밥친구' },
  { to: '/game', label: '게임찾기' },
]

const pageContainer = 'container'
const headerIconLink = 'inline-flex min-w-[70px] flex-col items-center justify-center gap-[5px] border-0 bg-transparent text-[0.78rem] font-black leading-none text-[#161211]'
const navLinkBase = 'flex h-full min-w-[82px] items-center justify-center rounded-b-lg px-[18px] text-[0.94rem] font-extrabold text-[#191210] transition duration-200 hover:bg-[linear-gradient(135deg,var(--color-primary),#F98385)] hover:text-white'
const navLinkActive = 'bg-[linear-gradient(135deg,var(--color-primary),#F98385)] text-white'
const mobileButton = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-0 px-6 text-[0.94rem] font-black transition duration-200'

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [q, setQ] = useState('')

  const handleLogout = () => {
    logout()
    ctxLogout()
    navigate('/')
    setMobileOpen(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (q.trim()) {
      navigate(`/menu?q=${encodeURIComponent(q)}`)
      setMobileOpen(false)
    }
  }

  const navCls = ({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[500] h-[var(--header-h)] border-b border-[rgba(243,231,221,0.9)] bg-white/95 backdrop-blur-2xl">
        <div className={`${pageContainer} grid h-full grid-cols-[minmax(220px,1fr)_minmax(340px,420px)_minmax(220px,1fr)] items-center gap-6 max-lg:grid-cols-[auto_minmax(240px,1fr)_auto] max-md:grid-cols-[1fr_auto]`}>
          <Link
            to="/"
            className="inline-flex justify-self-start items-center gap-2 text-[1.72rem] font-black tracking-[-0.04em] text-[#0E0C0B] max-md:text-[1.35rem]"
            onClick={() => setMobileOpen(false)}
          >
            <span className='text-{balack}'>오늘 뭐먹지?</span>
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--color-primary)] bg-white text-[1.05rem]">⏰</span>
          </Link>

          <div className="max-md:hidden">
            <form
              onSubmit={handleSearch}
              className="flex h-12 overflow-hidden rounded-[10px] border-[1.5px] border-[rgba(244,108,111,0.8)] bg-white shadow-[0_4px_18px_rgba(244,108,111,0.08)]"
            >
              <input
                type="text"
                placeholder="식당명, 메뉴 검색..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-w-0 flex-1 border-0 px-[18px] text-[0.92rem] font-semibold text-[var(--text-primary)] outline-0 placeholder:text-[#9D8C86]"
              />
              <button
                type="submit"
                className="w-12 border-0 bg-[linear-gradient(135deg,var(--color-primary),#F98082)] text-[1.8rem] font-bold text-white"
                aria-label="검색"
              >
                <span className="relative -top-[2px] leading-none">⌕</span>
              </button>
            </form>
          </div>

          <div className="flex items-center justify-end gap-[26px] text-[0.9rem] font-extrabold">
            {user ? (
              <button onClick={handleLogout} className={`${headerIconLink} max-md:hidden`}>
                <img src="/img/icon/logout.png" className="h-[35px] w-[35px] object-contain" alt="logout" />
              </button>
            ) : (
              <>
                <Link to="/mypage" className={`${headerIconLink} max-md:hidden`} />
                <Link to="/login" className={`${headerIconLink} max-md:hidden`}>
                  <img src="/img/icon/login.png" className="h-[35px] w-[35px] object-contain" alt="login" />
                </Link>
              </>
            )}

            <button
              className="hidden border-0 bg-transparent text-2xl max-md:inline-flex"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="모바일 메뉴"
            >
              {mobileOpen ? '×' : '☰'}
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 top-[var(--header-h)] z-[490] h-[var(--nav-h)] border-b border-[var(--border-color)] bg-white/95 shadow-[0_6px_18px_rgba(42,29,26,0.05)] max-md:hidden">
        <div className={`${pageContainer} flex h-full items-center justify-between gap-5`}>
          <div className="flex h-full items-center gap-[22px]">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navCls}>
                {label}
              </NavLink>
            ))}
          </div>

          <Link to="/mypage" className={`${headerIconLink} justify-self-end`}>
            <div className="inline-flex min-h-[42px] min-w-[178px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-secondary),var(--color-accent))] px-[22px] text-[0.92rem] font-black text-[#5A3507] shadow-[0_8px_18px_rgba(254,185,92,0.25)] empty:invisible">
              {user ? <span>{user.nickname}님 환영합니다</span> : null}
            </div>
          </Link>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[800] bg-black/40"
          />
          <div className="fixed bottom-0 right-0 top-0 z-[810] flex w-[min(320px,86vw)] flex-col bg-white shadow-[-18px_0_34px_rgba(0,0,0,0.14)]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-[18px] font-black">
              <span>오늘 뭐먹지?</span>
              <button className="border-0 bg-transparent text-xl" onClick={() => setMobileOpen(false)}>×</button>
            </div>

            {user && (
              <div className="flex items-center gap-3 border-b border-[var(--border-color)] bg-[#FFF8EF] px-5 py-[18px] font-black">
                <div className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--color-primary)] font-black text-white">
                  {user.nickname?.[0] ?? '?'}
                </div>
                <div>
                  <div>{user.nickname}님 환영합니다</div>
                  <small className="text-[var(--text-muted)]">{user.email}</small>
                </div>
              </div>
            )}

            <div className="flex-1 py-2">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-[#FFF0E9] px-5 py-[15px] font-black"
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/mypage"
                onClick={() => setMobileOpen(false)}
                className="block border-b border-[#FFF0E9] px-5 py-[15px] font-black"
              >
                마이페이지
              </Link>
            </div>

            <div className="flex flex-col gap-2 border-y border-[var(--border-color)] px-5 py-[18px]">
              {user ? (
                <button
                  onClick={handleLogout}
                  className={`${mobileButton} bg-[var(--bg-surface)] text-[var(--text-primary)]`}
                >
                  로그아웃
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className={`${mobileButton} bg-[var(--bg-surface)] text-[var(--text-primary)]`}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className={`${mobileButton} bg-[var(--color-primary)] text-white`}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
