import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getRestaurant } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantImage from "../components/RestaurantImage";

const CAT_ICON = { 한식: '🍚', 일식: '🍣', 중식: '🥟', 양식: '🥩', 분식: '🍜', 치킨: '🍗', 피자: '🍕', 카페: '☕', 술집: '🍺' }

export default function MenuDetail() {
  const { restId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rest, setRest] = useState(null)

  useEffect(() => {
    getRestaurant(restId).then(setRest).catch(() => navigate('/menu'))
  }, [restId])

  if (!rest) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>
  )

  const stars = '★'.repeat(Math.min(Math.round(rest.avg_rating ?? 0), 5)).padEnd(5, '☆')

  return (
    <>
      <Link to="/menu" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>
        ← 목록으로
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

        {/* ── 메인 ── */}
        <div>
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', overflow: 'hidden', marginBottom: 16 }}>
            {/* 썸네일 */}
            <RestaurantImage
              imageUrl={rest.image_url}
              category={rest.category}
              name={rest.name}
              height={220}
              iconSize="5rem"
            />

            <div style={{ padding: 24 }}>
              <span className="badge badge-primary">{rest.category || '기타'}</span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0 6px' }}>{rest.name}</h1>

              {/* 평점 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span className="stars" style={{ fontSize: '1rem' }}>{stars}</span>
                <span style={{ fontWeight: 700 }}>{(rest.avg_rating ?? 0).toFixed(1)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>
                  리뷰 {Math.floor((rest.avg_rating ?? 0) * 20)}개
                </span>
              </div>

              {/* 주소 */}
              <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 6 }}>
                📍 {rest.address}
              </p>

              {/* 전화번호 */}
              {rest.phone && (
                <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 6 }}>
                  📞 <a href={`tel:${rest.phone}`} style={{ color: 'var(--color-info)', fontWeight: 600 }}>
                    {rest.phone}
                  </a>
                </p>
              )}

              {rest.description && rest.description !== rest.phone && (
                <p style={{ marginTop: 12, fontSize: '.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                  {rest.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 사이드 ── */}
        <div>
          {/* 파티 참여 */}
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 24, marginBottom: 16 }}>
            <h3 style={{ marginBottom: 16 }}>예약 / 파티 참여</h3>
            {user ? (
              <>
                <Link to={`/party/create?rest=${rest.id}`} className="btn btn-primary btn-block">
                  👥 밥친구 파티 만들기
                </Link>
                <hr className="divider" />
                <Link to="/party" className="btn btn-secondary btn-block">
                  모집 중 파티 보기
                </Link>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-block">
                로그인 후 파티 참여
              </Link>
            )}
          </div>

          {/* 위치 정보 */}
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>위치 정보</h3>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              {rest.address}
            </p>
            {rest.latitude && rest.longitude ? (
              <>
                <KakaoMap
                  center={{ lat: rest.latitude, lng: rest.longitude }}
                  markers={[{ lat: rest.latitude, lng: rest.longitude, name: rest.name, category: rest.category }]}
                  height="200px"
                />
                <a href={`https://map.kakao.com/link/map/${encodeURIComponent(rest.name)},${rest.latitude},${rest.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="btn btn-secondary btn-sm btn-block"
                  style={{ marginTop: 10, textDecoration: 'none' }}>
                  🗺️ 카카오맵에서 보기
                </a>
              </>
            ) : (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius)', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>
                📍 위치 정보 없음
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
