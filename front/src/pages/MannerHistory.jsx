import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMannerHistory } from '../api/services'

export default function MannerHistory() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMannerHistory()
      .then(d => setData(d))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>
  )
  if (!data) return null

  const { manner_score, received = [], given = [], stats = {} } = data

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/mypage" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '.9rem' }}>
          ← 마이페이지
        </Link>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>매너온도 상세 내역</h1>
      </div>

      {/* 현재 점수 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary), #F98082)',
        borderRadius: 16, padding: 28, marginBottom: 20,
        color: '#fff', textAlign: 'center',
      }}>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{manner_score}°C</div>
        <div style={{ fontSize: '.9rem', opacity: .8, marginTop: 6 }}>현재 매너온도</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          {[
            ['총 받은 투표', stats.total_received ?? 0],
            ['👍 긍정', stats.positive ?? 0],
            ['👎 부정', stats.negative ?? 0],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{val}</div>
              <div style={{ fontSize: '.75rem', opacity: .75 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 온도 범위 안내 */}
      <div className="profile-section" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>온도 범위 안내</h3>
        {[
          [20, 30, '주의 필요', '#FC8181'],
          [30, 36, '보통', '#F6AD55'],
          [36, 43, '따뜻해요', '#68D391'],
          [43, 50, '매우 따뜻해요 🔥', '#38A169'],
        ].map(([min, max, label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 80, fontSize: '.82rem', fontWeight: 700, color,
              background: color + '22', borderRadius: 6, padding: '3px 8px', textAlign: 'center',
            }}>{min}~{max}°C</div>
            <span style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{label}</span>
            {manner_score >= min && manner_score < max && (
              <span style={{ fontSize: '.75rem', background: color, color: '#fff', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>현재</span>
            )}
          </div>
        ))}
      </div>

      {/* 점수 변동 요인 */}
      <div className="profile-section" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>점수 변동 요인</h3>
        {[
          ['파티 참여', '+0.5°', '파티에 참여할 때마다'],
          ['리뷰 작성', '+0.3°', '식당 리뷰를 작성할 때'],
          ['👍 받은 투표', '+1.0°', '다른 회원이 긍정 투표 시'],
          ['👎 받은 투표', '-1.0°', '다른 회원이 부정 투표 시'],
        ].map(([label, delta, desc]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--border-color)', fontSize: '.88rem',
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <span style={{ fontWeight: 900, color: delta.startsWith('+') ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {delta}
            </span>
          </div>
        ))}
      </div>

      {/* 받은 투표 내역 */}
      <div className="profile-section" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>받은 투표 내역</h3>
        {received.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '.88rem' }}>
            아직 받은 투표가 없습니다.
          </div>
        ) : received.map((v, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', background: 'var(--bg-surface)',
            borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>{v.is_positive ? '👍' : '👎'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{v.voter}님이 투표</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{v.voted_at}</div>
              </div>
            </div>
            <span style={{ fontWeight: 900, color: v.is_positive ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {v.is_positive ? '+1.0°' : '-1.0°'}
            </span>
          </div>
        ))}
      </div>

      {/* 내가 준 투표 */}
      <div className="profile-section">
        <h3 style={{ marginBottom: 14 }}>내가 준 투표</h3>
        {given.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '.88rem' }}>
            아직 투표한 내역이 없습니다.
          </div>
        ) : given.map((v, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', background: 'var(--bg-surface)',
            borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>{v.is_positive ? '👍' : '👎'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{v.target}님에게 투표</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{v.voted_at}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

}


