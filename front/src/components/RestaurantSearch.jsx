/**
 * RestaurantSearch.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 카카오 로컬 API로 식당 검색 → 지도 표시 → DB 등록
 * 사용: <RestaurantSearch userLoc={{ lat, lng }} />
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState } from 'react'
import api from '../api/axiosInstance'
import KakaoMap from './KakaoMap'

export default function RestaurantSearch({ userLoc, onRegister }) {
  const [query,    setQuery]    = useState('')
  const [places,   setPlaces]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [message,  setMessage]  = useState('')

    // ── 검색 ─────────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setPlaces([])
    setSelected(null)
    setMessage('')

    try {
      const cleanQuery = query.split('&')[0]  // ✅ 이 줄 추가

      const params = { q: cleanQuery }
      if (userLoc) {
        params.lat = userLoc.lat
        params.lng = userLoc.lng
        params.radius = 2000
      }

      const { data } = await api.get('/api/kakao/search', { params })

      setPlaces(data.places ?? [])
      if (!data.places?.length) setMessage('검색 결과가 없습니다.')

    } catch (e) {
      setMessage(e.response?.data?.error ?? '검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // ── DB 등록 ───────────────────────────────────────────────────────────────
  const handleRegister = async (place) => {
    setRegLoading(true)
    setMessage('')
    try {
      const { data } = await api.post('/api/kakao/register', {
        name:     place.name,
        address:  place.address,
        lat:      place.lat,
        lng:      place.lng,
        category: place.category,
        phone:    place.phone,
      })
      setMessage(`✅ ${data.message}`)
      onRegister?.(place)
    } catch (e) {
      setMessage(e.response?.data?.error ?? '등록에 실패했습니다.')
    } finally {
      setRegLoading(false)
    }
  }

  // 지도용 마커 변환
  const mapMarkers = places.map((p) => ({
    lat:      p.lat,
    lng:      p.lng,
    name:     p.name,
    category: p.category?.split(' > ')[1] ?? p.category,
    dist:     p.dist,
    id:       p.id,
  }))

  const center = selected
    ? { lat: selected.lat, lng: selected.lng }
    : userLoc ?? (places[0] ? { lat: places[0].lat, lng: places[0].lng } : null)

  return (
    <div>
      {/* 검색 바 */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="form-control"
          placeholder="식당명 또는 음식 종류 검색 (예: 삼겹살, 초밥집...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          {loading ? '검색 중...' : '⌕ 검색'}
        </button>
      </form>

      {message && (
        <div style={{ fontSize: '.85rem', padding: '8px 12px', borderRadius: 8, marginBottom: 12,
          background: message.startsWith('✅') ? '#F0FFF4' : '#FFF5F5',
          color: message.startsWith('✅') ? '#276749' : '#C53030' }}>
          {message}
        </div>
      )}

      {/* 지도 + 결과 목록 */}
      {places.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
          {/* 지도 */}
          <div>
            {center && (
              <KakaoMap
                center={center}
                markers={mapMarkers}
                height="360px"
                onSelect={(m) => {
                  const found = places.find((p) => p.lat === m.lat && p.lng === m.lng)
                  if (found) setSelected(found)
                }}
              />
            )}
          </div>

          {/* 결과 목록 */}
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {places.map((p) => {
              const cat = p.category?.split(' > ')[1] ?? p.category
              const isSelected = selected?.id === p.id
              return (
                <div key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    background: isSelected ? '#FFF5F5' : 'var(--bg-white)',
                    transition: 'all .15s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--color-primary)' }}>{cat}</span>
                      <div style={{ fontWeight: 700, fontSize: '.9rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.address}</div>
                      {p.phone && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>📞 {p.phone}</div>}
                      {p.dist > 0 && <div style={{ fontSize: '.75rem', color: 'var(--color-success)', fontWeight: 600, marginTop: 2 }}>🚶 {p.dist}m</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <a href={p.url} target="_blank" rel="noreferrer"
                        className="btn btn-secondary btn-sm" style={{ fontSize: '.72rem', padding: '4px 8px' }}
                        onClick={(e) => e.stopPropagation()}>
                        상세
                      </a>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '.72rem', padding: '4px 8px' }}
                        disabled={regLoading}
                        onClick={(e) => { e.stopPropagation(); handleRegister(p) }}>
                        등록
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
