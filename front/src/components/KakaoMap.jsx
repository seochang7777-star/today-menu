/**
 * KakaoMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 카카오맵 SDK를 React에서 사용하는 컴포넌트
 * index.html에서 SDK 로드 필요:
 *   <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KEY&libraries=services"></script>
 *
 * Props:
 *   center   { lat, lng }          지도 중심 좌표
 *   markers  [{ lat, lng, name, category, id }]  마커 목록
 *   height   string                CSS height (기본 '400px')
 *   onSelect (marker) => void      마커 클릭 시 콜백
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef, useState } from 'react'

const CAT_COLOR = {
  한식: '#E53E3E', 일식: '#D53F8C', 중식: '#DD6B20', 양식: '#6B46C1',
  분식: '#D69E2E', 치킨: '#2B6CB0', 피자: '#276749', 카페: '#744210',
}

export default function KakaoMap({ center, markers = [], height = '400px', onSelect }) {
  const mapRef  = useRef(null)   // DOM 엘리먼트
  const mapObj  = useRef(null)   // kakao.maps.Map 인스턴스
  const markerRefs = useRef([])  // 마커 인스턴스 배열
  const [sdkReady, setSdkReady] = useState(false)
  const [error,    setError]    = useState('')

  // ── SDK 로드 확인 ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setSdkReady(true))
        clearInterval(check)
      }
    }, 300)
    const timeout = setTimeout(() => {
      clearInterval(check)
      if (!sdkReady) setError('카카오맵 SDK를 불러오지 못했습니다. index.html의 앱키를 확인해주세요.')
    }, 8000)
    return () => { clearInterval(check); clearTimeout(timeout) }
  }, [])

  // ── 지도 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !center) return
    const { kakao } = window
    const options = {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: 4,
    }
    mapObj.current = new kakao.maps.Map(mapRef.current, options)

    // 현재 위치 마커 (파란 점)
    new kakao.maps.Marker({
      map:      mapObj.current,
      position: new kakao.maps.LatLng(center.lat, center.lng),
      title:    '내 위치',
      image:    new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        new kakao.maps.Size(24, 35),
      ),
    })
  }, [sdkReady, center?.lat, center?.lng])

  // ── 마커 갱신 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !mapObj.current) return
    const { kakao } = window

    // 기존 마커 제거
    markerRefs.current.forEach((m) => m.setMap(null))
    markerRefs.current = []

    markers.forEach((spot) => {
      const pos    = new kakao.maps.LatLng(spot.lat, spot.lng)
      const marker = new kakao.maps.Marker({
        map:      mapObj.current,
        position: pos,
        title:    spot.name,
      })

      // 인포윈도우
      const color = CAT_COLOR[spot.category] ?? '#553C9A'
      const iw = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:8px 10px;min-width:140px;font-family:sans-serif">
            <span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:700;background:${color};color:#fff;margin-bottom:4px">
              ${spot.category ?? '기타'}
            </span>
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
    <div style={{ height, background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center', color: '#C53030', fontSize: '.85rem' }}>
      ⚠️ {error}
    </div>
  )

  if (!sdkReady) return (
    <div style={{ height, background: 'var(--bg-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>
      🗺️ 지도 로딩 중...
    </div>
  )

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }} />
}
