import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
// naverLogin → naverLoginAPI 로 rename해서 내부 변수명 충돌 해소
import { login, kakaoLogin, naverLogin as naverLoginAPI } from '../api/services'
import { useAuth } from '../App'

export default function Login() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useAuth()
  const [form,         setForm]         = useState({ email: '', password: '' })
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [socialLoading,setSocialLoading]= useState('')  // 'kakao' | 'naver' | ''

  // ── 네이버 SDK 초기화 ─────────────────────────────────────────────────────
  useEffect(() => {
    const naverClientId = import.meta.env.VITE_NAVER_CLIENT_ID
    if (!naverClientId || !window.naver?.LoginWithNaverId) return

    // 변수명을 naverSdk로 변경 — import한 naverLoginAPI와 충돌 없음
    const naverSdk = new window.naver.LoginWithNaverId({
      clientId:    naverClientId,
      callbackUrl: `${window.location.origin}/auth/naver/callback`,
      isPopup:     true,
      loginButton: { color: 'green', type: 3, height: 48 },
    })
    naverSdk.init()
  }, [])

  // ── 네이버 콜백 토큰 처리 (URL hash에 access_token이 있는 경우) ───────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.hash.replace('#', '?'))
    const naverToken = params.get('access_token')
    if (naverToken) handleNaverToken(naverToken)
  }, [])

  // ── 일반 로그인 ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await login(form)
      ctxLogin(data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally { setLoading(false) }
  }

  // ── 카카오 로그인 ─────────────────────────────────────────────────────────
  const handleKakao = () => {
    if (!window.Kakao) {
      setError('카카오 SDK가 로드되지 않았습니다. index.html의 앱키를 확인해주세요.')
      return
    }
    const kakaoKey = '074ab0b682d82aa7fa0767cf0e9ac77f'   // index.html과 동일한 키
    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey)

    setSocialLoading('kakao')
    window.Kakao.Auth.login({
      success: async (authObj) => {
        try {
          const data = await kakaoLogin(authObj.access_token)
          ctxLogin(data); navigate('/')
        } catch (err) {
          setError(err.response?.data?.message ?? '카카오 로그인에 실패했습니다.')
        } finally { setSocialLoading('') }
      },
      fail: () => { setError('카카오 로그인이 취소되었습니다.'); setSocialLoading('') },
    })
  }

  // ── 네이버 로그인 ─────────────────────────────────────────────────────────
  const handleNaver = () => {
    const naverClientId = import.meta.env.VITE_NAVER_CLIENT_ID
    if (!naverClientId) {
      setError('네이버 Client ID가 설정되지 않았습니다. front/.env를 확인해주세요.')
      return
    }
    setSocialLoading('naver')

    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/naver/callback`)
    const state       = Math.random().toString(36).slice(2)
    const naverUrl    = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${naverClientId}&redirect_uri=${callbackUrl}&state=${state}`

    const popup = window.open(naverUrl, 'naverLogin', 'width=460,height=600,scrollbars=yes')

    // 팝업 → postMessage 수신
    const handler = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'NAVER_TOKEN') {
        window.removeEventListener('message', handler)
        setSocialLoading('')
        try {
          // naverLoginAPI = services.js에서 import한 함수 (충돌 없음)
          const data = await naverLoginAPI(event.data.token)
          ctxLogin(data); navigate('/')
        } catch (err) {
          setError(err.response?.data?.message ?? '네이버 로그인에 실패했습니다.')
        }
      }
    }
    window.addEventListener('message', handler)

    const checkClosed = setInterval(() => {
      if (popup?.closed) { clearInterval(checkClosed); setSocialLoading('') }
    }, 500)
  }

  const handleNaverToken = async (token) => {
    setSocialLoading('naver')
    try {
      const data = await naverLoginAPI(token)
      ctxLogin(data); navigate('/')
    } catch (err) {
      setError(err.response?.data?.message ?? '네이버 로그인에 실패했습니다.')
    } finally { setSocialLoading('') }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{
        background: 'var(--bg-white)', borderRadius: 'var(--border-radius-xl)',
        padding: 40, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="site-logo" style={{ justifyContent: 'center', fontSize: '1.5rem' }}>
            🍽️ <span>오늘의 메뉴</span>
          </div>
        </div>

        <h2 className="auth-title">로그인</h2>
        <p className="auth-sub">계정에 로그인해주세요</p>

        {/* 소셜 로그인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {/* 카카오 */}
          <button onClick={handleKakao} disabled={!!socialLoading || loading}
            style={{
              width: '100%', padding: '13px 0', border: 'none',
              borderRadius: 'var(--border-radius)',
              background: '#FEE500', color: '#191919',
              fontSize: '.95rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: socialLoading === 'kakao' ? .7 : 1,
            }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M10 2C5.582 2 2 4.91 2 8.5c0 2.278 1.418 4.277 3.568 5.496l-.91 3.38c-.08.298.262.528.518.356L9.33 15.33c.22.024.443.037.67.037 4.418 0 8-2.91 8-6.5S14.418 2 10 2z"
                fill="#191919"/>
            </svg>
            {socialLoading === 'kakao' ? '카카오 로그인 중...' : '카카오로 계속하기'}
          </button>

          {/* 네이버 */}
          <button onClick={handleNaver} disabled={!!socialLoading || loading}
            style={{
              width: '100%', padding: '13px 0', border: 'none',
              borderRadius: 'var(--border-radius)',
              background: '#03C75A', color: '#fff',
              fontSize: '.95rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: socialLoading === 'naver' ? .7 : 1,
            }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11.16 10.28L8.72 6H6v8h2.84V9.72L11.28 14H14V6h-2.84v4.28z" fill="#fff"/>
            </svg>
            {socialLoading === 'naver' ? '네이버 로그인 중...' : '네이버로 계속하기'}
          </button>
        </div>

        <div className="auth-divider" style={{ margin: '20px 0' }}>이메일로 로그인</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group form-icon-wrap">
            <span className="form-icon">✉️</span>
            <input type="email" className="form-control" placeholder="이메일" required autoFocus
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🔒</span>
            <input type="password" className="form-control" placeholder="비밀번호" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading || !!socialLoading}
            className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>

        <hr className="divider" style={{ margin: '20px 0' }} />
        <Link to="/register" className="btn btn-secondary btn-block btn-lg">이메일로 회원가입</Link>
        <p className="auth-footer">
          <a href="#">비밀번호 찾기</a> · <a href="#">이메일 찾기</a>
        </p>
      </div>
    </div>
  )
}
