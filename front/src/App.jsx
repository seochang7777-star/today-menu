import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { fetchMe } from './api/services'
import { TokenStore } from './api/axiosInstance'

import Header  from './components/Header'
import ChatBot from './components/ChatBot'
import Home    from './pages/Home'
import Login   from './pages/Login'
import Register from './pages/Register'
import Menu    from './pages/Menu'
import MenuDetail from './pages/MenuDetail'
import Party   from './pages/Party'
import PartyDetail from './pages/PartyDetail'
import PartyCreate from './pages/PartyCreate'
import MyPage  from './pages/MyPage'
import MyPageEdit from './pages/MyPageEdit'
import Game from './pages/Game'
import NaverCallback from './pages/NaverCallback'

// ── Auth Context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!TokenStore.getAccess()) { setLoading(false); return }
    fetchMe()
      .then(setUser)
      .catch(() => { TokenStore.clear(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading,
      login:  (u) => setUser(u),
      logout: ()  => { TokenStore.clear(); setUser(null) },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex-center" style={{ minHeight: '60vh', color: 'var(--text-muted)' }}>로딩 중...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div id="naverIdLogin"></div>
          <main className="page-wrap" style={{ flex: 1 }}>
            <div className="container">
              <Routes>
                <Route path="/"               element={<Home />} />
                <Route path="/login"          element={<Login />} />
                <Route path="/register"       element={<Register />} />
                <Route path="/menu"           element={<Menu />} />
                <Route path="/menu/:restId"   element={<MenuDetail />} />
                <Route path="/party"          element={<Party />} />
                <Route path="/party/create"   element={<PrivateRoute><PartyCreate /></PrivateRoute>} />
                <Route path="/party/:partyId" element={<PartyDetail />} />
                <Route path="/mypage"         element={<PrivateRoute><MyPage /></PrivateRoute>} />
                <Route path="/mypage/edit"    element={<PrivateRoute><MyPageEdit /></PrivateRoute>} />
                <Route path="/game"                   element={<Game />} />
                <Route path="/auth/naver/callback"    element={<NaverCallback />} />
                <Route path="*"              element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
          <ChatBot />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
