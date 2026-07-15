import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, kakaoLogin, naverLogin as naverLoginAPI } from '../api/services'
import { useAuth } from '../App'

export default function Login() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')  // 'kakao' | 'naver' | ''
  const kakaoLoginStartedAt = useRef(0)

  // ── 네이버 SDK 초기화 ─────────────────────────────────────────────────────
  // SDK가 #naverIdLogin div에 버튼을 렌더링하지만 우리는 커스텀 버튼 사용
  // init()은 SDK 내부 상태 초기화 용도
  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID
    if (!clientId) return

    const tryInit = () => {
      if (!window.naver?.LoginWithNaverId) return false
      try {
        const naverSdk = new window.naver.LoginWithNaverId({
          clientId,
          callbackUrl: `${window.location.origin}/auth/naver/callback`,
          isPopup: true,
          loginButton: { color: 'green', type: 3, height: 48 },
        })
        naverSdk.init()
      } catch (e) {
        // SDK 초기화 실패해도 버튼 클릭 시 직접 URL 열기로 동작
      }
      return true
    }

    if (!tryInit()) {
      // SDK 스크립트 로드 대기
      const timer = setInterval(() => { if (tryInit()) clearInterval(timer) }, 300)
      setTimeout(() => clearInterval(timer), 5000)
    }
  }, [])

  // ── 페이지가 콜백 URL일 경우 처리 (리다이렉트 방식 fallback) ─────────────
  useEffect(() => {
    const raw = window.location.hash
    const qs = raw.startsWith('#') ? raw.slice(1) : raw
    const token = new URLSearchParams(qs).get('access_token')
    if (token) {
      setSocialLoading('naver')
      naverLoginAPI(token)
        .then((data) => { ctxLogin(data); navigate('/') })
        .catch(() => setError('네이버 로그인에 실패했습니다.'))
        .finally(() => setSocialLoading(''))
    }
  }, [])

  useEffect(() => {
    if (socialLoading !== 'kakao') return

    const resetKakaoLoading = () => {
      if (Date.now() - kakaoLoginStartedAt.current < 1000) return
      setSocialLoading('')
      setError('카카오 로그인이 취소되었습니다.')
    }

    const handleFocus = () => {
      setTimeout(resetKakaoLoading, 300)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleFocus()
    }
    const timeout = setTimeout(resetKakaoLoading, 60000)

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [socialLoading])

  // ── 일반 로그인 ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await login(form)
      ctxLogin(data); navigate('/')
    } catch (err) {
      setError(err.response?.data?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally { setLoading(false) }
  }

  // ── 카카오 로그인 ─────────────────────────────────────────────────────────
  const handleKakao = () => {
    if (!window.Kakao) {
      setError('카카오 SDK가 로드되지 않았습니다. 페이지를 새로고침해 주세요.')
      return
    }
    const kakaoKey = '074ab0b682d82aa7fa0767cf0e9ac77f'
    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey)

    setSocialLoading('kakao')


    // 팝업을 그냥 닫은 경우 success/fail 둘 다 호출되지 않는 카카오 SDK 특성 방어:
    // 메인 창으로 포커스가 돌아오면, 일정 시간 내에 로그인이 안 끝났을 경우 자동으로 상태를 푼다.
    let settled = false
    const clearStuckState = () => {
      setTimeout(() => {
        if (!settled) setSocialLoading('')
      }, 800)
    }
    window.addEventListener('focus', clearStuckState, { once: true })

    window.Kakao.Auth.login({
      success: async (authObj) => {
        settled = true
        try {
          const data = await kakaoLogin(authObj.access_token)
          ctxLogin(data); navigate('/')
        } catch (err) {
          setError(err.response?.data?.message ?? '카카오 로그인에 실패했습니다.')
        } finally { setSocialLoading('') }
      },
      fail: () => { settled = true; setError('카카오 로그인이 취소되었습니다.'); setSocialLoading('') },
    })
  }

  // ── 네이버 로그인 ─────────────────────────────────────────────────────────
  const handleNaver = () => {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID
    if (!clientId) {
      setError('네이버 Client ID가 설정되지 않았습니다. front/.env를 확인해주세요.')
      return
    }

    setSocialLoading('naver')

    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/naver/callback`)
    const state = Math.random().toString(36).slice(2)
    // response_type=token → implicit flow (access_token을 hash로 직접 전달)
    const naverUrl = [
      'https://nid.naver.com/oauth2.0/authorize',
      `?response_type=token`,
      `&client_id=${clientId}`,
      `&redirect_uri=${callbackUrl}`,
      `&state=${state}`,
    ].join('')

    // 팝업으로 열기
    const popup = window.open(naverUrl, 'naverLogin', 'width=460,height=600,scrollbars=yes,resizable=yes')

    if (!popup || popup.closed) {
      // 팝업 차단된 경우 → 현재 창에서 리다이렉트
      setSocialLoading('')
      window.location.href = naverUrl.replace('?', '?') // 현재 창 이동
      return
    }

    // 팝업에서 postMessage 수신
    const messageHandler = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'NAVER_TOKEN') return

      window.removeEventListener('message', messageHandler)
      clearInterval(closedChecker)

      try {
        const data = await naverLoginAPI(event.data.token)
        ctxLogin(data); navigate('/')
      } catch (err) {
        setError(err.response?.data?.message ?? '네이버 로그인에 실패했습니다.')
      } finally { setSocialLoading('') }
    }

    window.addEventListener('message', messageHandler)

    // 팝업이 닫히면 로딩 해제
    const closedChecker = setInterval(() => {
      if (popup.closed) {
        clearInterval(closedChecker)
        window.removeEventListener('message', messageHandler)
        setSocialLoading('')
      }
    }, 500)
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{
        background: 'var(--bg-white)', borderRadius: 'var(--border-radius-xl)',
        padding: 40, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)',
      }}>

        <div className="text-center mb-[28px]">
  {/* 기존 CSS 이름(.site-logo)을 쓰고, absolute 정렬에 필요한 속성 3개만 깔끔하게 덧붙입니다 */}
  <div className="site-logo relative justify-center min-h-[40px] pl-3">
    
    <img 
      src="/img/icon/logo.png" 
      alt="오늘 뭐먹지 로고" 
      className="absolute right-full m h-9 w-auto object-contain" 
    />
    
    <span>오늘 뭐먹지?</span>
  </div>
</div>

        <h2 className="text-[1.4rem] font-extrabold mb-[6px] text-center text-gray-950">로그인</h2>
        <p className="text-[0.88rem] text-gray-400 text-center mb-[28px]">계정에 로그인해주세요</p>


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
              opacity: socialLoading === 'kakao' ? .7 : 1, transition: 'opacity .15s',
            }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M10 2C5.582 2 2 4.91 2 8.5c0 2.278 1.418 4.277 3.568 5.496l-.91 3.38c-.08.298.262.528.518.356L9.33 15.33c.22.024.443.037.67.037 4.418 0 8-2.91 8-6.5S14.418 2 10 2z"
                fill="#191919" />
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
              opacity: socialLoading === 'naver' ? .7 : 1, transition: 'opacity .15s',
            }}>
            {/* 네이버 N 로고 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" fill="#fff" />
            </svg>
            {socialLoading === 'naver' ? '네이버 로그인 중...' : '네이버로 계속하기'}
          </button>
        </div>

        <div className="flex items-center my-[16px] text-center text-gray-400 text-[0.82rem]">
          {/* 왼쪽 선 */}
          <div className="flex-1 h-[1px] bg-[var(--border-color)]"></div>

          {/* 중앙 글자 (선과 답답하게 붙지 않도록 좌우 마진 px-3 추가) */}
          <span className="px-3 shrink-0">이메일로 로그인</span>

          {/* 오른쪽 선 */}
          <div className="flex-1 h-[1px] bg-[var(--border-color)]"></div>
        </div>

        {/* 이메일 로그인 */}
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

          <button
            type="submit"
            disabled={loading || !!socialLoading}
            className="w-full py-3 px-6 text-lg font-semibold rounded-[12px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors mt-[8px] disabled:opacity-50 disabled:cursor-not-allowed"
          >

            {loading ? '로그인 중...' : '이메일로 로그인'}
          </button>
        </form>


        <hr className="border-0 border-t border-[var(--border-color)] my-[20px]" />
        <Link to="/register"
          className="block w-full py-3 px-6 text-lg font-semibold text-center rounded-[12px] bg-[#FEB95C] text-white hover:bg-[#E8A548] transition-colors shadow-sm"
        >
          이메일로 회원가입
        </Link>
        <p className="text-center mt-[20px] text-[0.88rem] text-gray-400">
  <button 
    type="button"
    onClick={() => navigate('/findPassword')} 
    className="text-[var(--color-primary)] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
  >
    비밀번호 찾기
  </button>
  {" · "}
  <button 
    type="button"
    onClick={() => navigate('/findid')} 
    className="text-[var(--color-primary)] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
  >
    이메일 찾기
  </button>
</p>
      </div>
    </div>
  )
}
