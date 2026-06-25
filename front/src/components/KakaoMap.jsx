/**
 * KakaoMap.jsx
 *
 * index.html에서 반드시 autoload=false 로 로드해야 합니다:
 *   <script src="...sdk.js?appkey=KEY&libraries=services&autoload=false">
 *
 * autoload=false 없이 쓰면 SDK가 React 마운트 전에 이미 로드 완료되어
 * kakao.maps.load() 콜백이 다시 호출되지 않아 지도가 절대 뜨지 않습니다.
 */
import { useEffect, useRef, useState } from 'react'

const CAT_COLOR = {
  한식: '#E53E3E', 일식: '#D53F8C', 중식: '#DD6B20', 양식: '#6B46C1',
  분식: '#D69E2E', 치킨: '#2B6CB0', 피자: '#276749', 카페: '#744210', 술집: '#553C9A',
}

export default function KakaoMap({ center, markers = [], height = '400px', onSelect }) {
  const mapRef     = useRef(null)
  const mapObj     = useRef(null)
  const markerRefs = useRef([])
  const [sdkReady, setSdkReady] = useState(false)
  const [error,    setError]    = useState('')

  // ── SDK 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // 이미 로드된 경우 즉시 처리
    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
      setSdkReady(true)
      return
    }

    // autoload=false 이므로 직접 load() 호출
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setSdkReady(true))
      return
    }

    // SDK 스크립트 자체가 아직 파싱 중인 경우 폴링
    let waited = 0
    const check = setInterval(() => {
      waited += 300
      if (window.kakao && window.kakao.maps) {
        clearInterval(check)
        window.kakao.maps.load(() => setSdkReady(true))
      } else if (waited >= 10000) {
        clearInterval(check)
        setError(
          'Kakao 지도 SDK 로드 실패.\n' +
          '카카오 개발자 콘솔에서\n' +
          '① 플랫폼 → Web → http://localhost:5173 등록\n' +
          '② JavaScript 앱키 확인\n' +
          '후 새로고침 해주세요.'
        )
      }
    }, 300)

    return () => clearInterval(check)
  }, [])

  // ── 지도 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !center?.lat || !center?.lng) return
    const { kakao } = window

    mapObj.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: 4,
    })

    // 현재 위치 마커
    new kakao.maps.Marker({
      map:      mapObj.current,
      position: new kakao.maps.LatLng(center.lat, center.lng),
      title:    '현재 위치',
      image: new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        new kakao.maps.Size(24, 35),
      ),
    })
  }, [sdkReady, center?.lat, center?.lng])

  // ── 마커 갱신 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapObj.current) return
    const { kakao } = window

    markerRefs.current.forEach((m) => m.setMap(null))
    markerRefs.current = []

    markers.forEach((spot) => {
      const pos    = new kakao.maps.LatLng(spot.lat, spot.lng)
      const marker = new kakao.maps.Marker({ map: mapObj.current, position: pos, title: spot.name })

      const color = CAT_COLOR[spot.category] ?? '#553C9A'
      const iw = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px 10px;min-width:140px;font-family:sans-serif">
          <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:700;background:${color};color:#fff;margin-bottom:4px">${spot.category ?? '기타'}</span>
          <div style="font-size:13px;font-weight:700;margin-bottom:2px">${spot.name}</div>
          ${spot.dist ? `<div style="font-size:11px;color:#666">🚶 ${spot.dist}m</div>` : ''}
        </div>`,
        removable: true,
      })

      kakao.maps.event.addListener(marker, 'click', () => {
        iw.open(mapObj.current, marker)
        onSelect?.(spot)
      })

      markerRefs.current.push(marker)
    })
  }, [sdkReady, markers])

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      height, background: '#FFF5F5', border: '1px solid #FED7D7',
      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, textAlign: 'center', color: '#C53030', fontSize: '.82rem',
      lineHeight: 1.7, whiteSpace: 'pre-line',
    }}>
      ⚠️ {error}
    </div>
  )

  if (!sdkReady) return (
    <div style={{
      height, background: 'var(--bg-surface)', borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: '.88rem', gap: 8,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🗺️</span>
      지도 로딩 중...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }} />
}
