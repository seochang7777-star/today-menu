/**
 * NaverCallback.jsx
 * 네이버 로그인 팝업이 리다이렉트되는 페이지
 * URL: /auth/naver/callback#access_token=...
 * 토큰을 부모 창으로 postMessage 후 팝업 닫힘
 */
import { useEffect } from 'react'

export default function NaverCallback() {
  useEffect(() => {
    const hash   = window.location.hash || window.location.search
    const params = new URLSearchParams(hash.replace('#', ''))
    const token  = params.get('access_token')

    if (token && window.opener) {
      window.opener.postMessage({ type: 'NAVER_TOKEN', token }, window.location.origin)
      window.close()
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: '.9rem' }}>
      네이버 로그인 처리 중...
    </div>
  )
}
