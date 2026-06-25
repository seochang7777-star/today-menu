/**
 * NaverCallback.jsx
 *
 * 네이버 OAuth implicit flow 콜백 페이지
 * 리다이렉트 URL: /auth/naver/callback
 *
 * 네이버는 토큰을 URL hash(#)로 전달합니다:
 *   /auth/naver/callback#access_token=XXX&token_type=bearer&expires_in=...
 *
 * 이 페이지는:
 *   1. URL hash에서 access_token 추출
 *   2. 팝업이면 → opener(부모 창)에 postMessage 후 팝업 닫기
 *   3. 리다이렉트면 → 직접 백엔드 인증 후 메인으로 이동
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { naverLogin } from '../api/services'
import { useAuth } from '../App'

export default function NaverCallback() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useAuth()
  const [status, setStatus] = useState('처리 중...')

  useEffect(() => {
    // ── hash에서 토큰 추출 ─────────────────────────────────────────────────
    // 네이버: /callback#access_token=XXX&token_type=...
    const raw = window.location.hash   // "#access_token=XXX&..."
    const qs  = raw.startsWith('#') ? raw.slice(1) : raw   // "access_token=XXX&..."
    const params = new URLSearchParams(qs)
    const token  = params.get('access_token')

    if (!token) {
      // search(?...) 방식으로 온 경우도 처리
      const searchParams = new URLSearchParams(window.location.search)
      const searchToken  = searchParams.get('access_token')
      if (searchToken) {
        handleToken(searchToken)
      } else {
        setStatus('토큰을 찾을 수 없습니다. 다시 시도해주세요.')
      }
      return
    }

    handleToken(token)
  }, [])

  const handleToken = (token) => {
    // 팝업 창인 경우 → 부모에게 토큰 전달 후 닫기
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'NAVER_TOKEN', token },
        window.location.origin,
      )
      window.close()
      return
    }

    // 리다이렉트 방식인 경우 → 직접 로그인 처리
    setStatus('네이버 로그인 중...')
    naverLogin(token)
      .then((data) => {
        ctxLogin(data)
        navigate('/', { replace: true })
      })
      .catch(() => {
        setStatus('로그인에 실패했습니다. 다시 시도해주세요.')
        setTimeout(() => navigate('/login'), 2000)
      })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16,
      color: 'var(--text-muted)', fontSize: '.95rem',
    }}>
      <div style={{ fontSize: '2rem' }}>🟢</div>
      <div>{status}</div>
    </div>
  )
}
