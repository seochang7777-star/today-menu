import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getParties } from '../api/services'
import { useAuth } from '../App'

const STATUS_LABEL = { RECRUITING: '모집 중', CLOSED: '마감', COMPLETED: '완료' }

export default function Party() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'RECRUITING'

  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getParties({ status }).then(setParties).catch(() => {}).finally(() => setLoading(false))
  }, [status])

  const pct = (p) => Math.min(Math.round((p.member_count / p.max_people) * 100), 100)

  return (
    <>
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h2>👥 밥친구 매칭</h2>
        {user && <Link to="/party/create" className="btn btn-primary">+ 파티 만들기</Link>}
      </div>

      {!user && (
        <div className="alert alert-warning">
          ⚠️ 파티 참여 및 생성은 회원만 가능합니다.{' '}
          <Link to="/login" style={{ color: 'var(--color-info)', fontWeight: 600 }}>로그인하기</Link>
        </div>
      )}

      {/* 상태 탭 */}
      <div className="tab-bar">
        {['RECRUITING', 'CLOSED', 'COMPLETED'].map((s) => (
          <button key={s}
            className={`tab-btn${status === s ? ' active' : ''}`}
            onClick={() => setSearchParams({ status: s })}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>로딩 중...</div>
      ) : parties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>모집 중인 파티가 없습니다</p>
          {user && <Link to="/party/create" className="btn btn-primary" style={{ marginTop: 14 }}>첫 파티 만들기</Link>}
        </div>
      ) : (
        parties.map((p) => (
          <div className="party-card" key={p.party_id}>
            <div className="party-header">
              <div>
                <span className={`badge ${p.status === 'RECRUITING' ? 'badge-success' : 'badge-muted'}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
                <div className="party-title mt-8">{p.title}</div>
              </div>
              <Link to={`/party/${p.party_id}`} className="btn btn-sm btn-secondary">상세보기</Link>
            </div>
            <div className="party-rest">🍽️ {p.restaurant?.name ?? '식당 정보 없음'}</div>
            <div className="party-meta">
              <span>🕐 {p.meeting_time ? new Date(p.meeting_time).toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''}</span>
              <span>👤 호스트: {p.host?.nickname ?? ''}</span>
              <span>👥 {p.member_count}/{p.max_people}명</span>
            </div>
            <div className="party-progress">
              <div className="progress-bar">
                <div className={`progress-fill${p.member_count >= p.max_people ? ' full' : ''}`}
                  style={{ width: `${pct(p)}%` }} />
              </div>
              <div className="progress-label">{p.member_count}/{p.max_people}명 참여 중</div>
            </div>
          </div>
        ))
      )}
    </>
  )
}
