import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { fetchMe } from './api/services'
import { TokenStore } from './api/axiosInstance'

import Header        from './components/Header'
import ChatBot       from './components/ChatBot'
import Footer        from './components/Footer'
import Home          from './pages/Home'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Menu          from './pages/Menu'
import MenuDetail    from './pages/MenuDetail'
import Party         from './pages/Party'
import PartyDetail   from './pages/PartyDetail'
import PartyCreate   from './pages/PartyCreate'
import MyPage        from './pages/MyPage'
import MyPageEdit    from './pages/MyPageEdit'
import Game          from './pages/Game'
import NaverCallback from './pages/NaverCallback'
import NotFound      from './pages/NotFound'
import ScrollToTop   from './components/ScrollToTop'
import Company       from './pages/Company'
import Terms         from './pages/Terms'
import Support       from './pages/Support'
import Notice        from './pages/Notice'
import MannerHistory from './pages/MannerHistory'
import AdminPage    from './pages/AdminPage'
import FindPassword from './pages/FindPassword'

import FindId from './pages/FindId'

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
      login: (data) => {
        if (!data || !data.access_token) return
        TokenStore.setTokens(data.access_token, data.refresh_token ?? null)
        const { access_token, refresh_token, ...userInfo } = data
        setUser(Object.keys(userInfo).length ? userInfo : data)
      },
      logout: ()  => { TokenStore.clear(); setUser(null) },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex-center" style={{ minHeight: '60vh', color: 'var(--text-muted)' }}>
      로딩 중...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div id="naverIdLogin" style={{ display: 'none' }} />

        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <main className="page-wrap" style={{ flex: 1 }}>
            <div className="container">
              <Routes>
                <Route path="/"                        element={<Home />} />
                <Route path="/login"                   element={<Login />} />
                <Route path="/register"                element={<Register />} />
                <Route path="/menu"                    element={<Menu />} />
                <Route path="/menu/:restId"            element={<MenuDetail />} />
                <Route path="/party"                   element={<Party />} />
                <Route path="/party/create"            element={<PrivateRoute><PartyCreate /></PrivateRoute>} />
                <Route path="/party/:partyId"          element={<PartyDetail />} />
                <Route path="/mypage"                  element={<PrivateRoute><MyPage /></PrivateRoute>} />
                <Route path="/mypage/edit"             element={<PrivateRoute><MyPageEdit /></PrivateRoute>} />
                <Route path="/admin"                   element={<PrivateRoute><AdminPage /></PrivateRoute>} />
                <Route path="/mypage/manner-history"   element={<PrivateRoute><MannerHistory /></PrivateRoute>} />
                <Route path="/game"                    element={<Game />} />
                <Route path="/auth/naver/callback"     element={<NaverCallback />} />
                <Route path="/company"                 element={<Company />} />
                <Route path="/terms"                   element={<Terms />} />
                <Route path="/support"                 element={<Support />} />
                <Route path="/notice"                  element={<Notice />} />
                <Route path="/findPassword"            element={<FindPassword />} />
                <Route path="/findid"                 element={<FindId />} />
                {/* * NotFound는 항상 Route의 맨 마지막줄에 있어야함 */}
                <Route path="*"                        element={<NotFound />} />
              </Routes>
            </div>
          </main>
          <Footer />
          <ChatBot />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
