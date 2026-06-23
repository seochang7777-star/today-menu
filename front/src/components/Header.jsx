import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { logout } from '../api/services'

export default function Header() {
  const { user, logout: ctxLogout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    ctxLogout()
    navigate('/')
  }

  const navCls = ({ isActive }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gray-100 text-gray-900 font-bold'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
    }`

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* 로고 */}
        <Link to="/" className="text-lg font-black text-gray-900 flex items-center gap-1.5 flex-shrink-0">
          🍽️ <span>오늘의 메뉴</span>
        </Link>

        {/* 네비 */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          <NavLink to="/"      end className={navCls}>홈</NavLink>
          <NavLink to="/menu"     className={navCls}>메뉴 찾기</NavLink>
          <NavLink to="/party"    className={navCls}>밥친구</NavLink>
        </nav>

        {/* 유저 */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {user ? (
            <>
              <NavLink to="/mypage" className={navCls}>
                <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] flex items-center justify-center font-black mr-1">
                  {user.nickname?.[0]}
                </span>
                {user.nickname}
              </NavLink>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn-secondary text-sm py-1.5 px-3">로그인</Link>
              <Link to="/register" className="btn-primary  text-sm py-1.5 px-3">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
