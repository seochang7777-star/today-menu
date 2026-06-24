import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getMyPage, toggleLike } from '../api/services'
import { useAuth } from '../App'

export default function MyPage() {
  const { user: authUser } = useAuth()
  const [data,      setData]      = useState(null)
  const [activeTab, setActiveTab] = useState('liked')
  const gauge2Ref = useRef(null)

  useEffect(() => { getMyPage().then(setData).catch(() => {}) }, [])

  // 매너 게이지 애니메이션
  useEffect(() => {
    if (!data || !gauge2Ref.current) return
    const score = data.user.manner_score
    const r = 40, circ = 2 * Math.PI * r
    const offset = circ * (1 - Math.min(score / 50, 1))
    const circle = gauge2Ref.current.querySelector('circle.progress')
    if (circle) { circle.style.strokeDasharray = circ; circle.style.strokeDashoffset = offset }
  }, [data])

  if (!data) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>
  )

  const { user, my_parties, rec_logs } = data
  const liked_logs  = rec_logs.filter((r) => r.is_liked)
  const dislikes    = user.preferences?.dislikes ?? []
  const mannerScore = user.manner_score
  const R    = 36
  const circ = 2 * Math.PI * R
  const heroGaugeOffset = circ * (1 - Math.min(mannerScore / 50, 1))

  const handleLike = async (logId) => {
    const res = await toggleLike(logId)
    setData((d) => ({
      ...d,
      rec_logs: d.rec_logs.map((r) => r.log_id === logId ? { ...r, is_liked: res.liked } : r),
    }))
  }

  return (
    <>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 24 }}>마이 메이지</h1>

      {/* ────────────────────────────────────────────────────────────
          HERO  (와이어프레임: 텍스트 왼쪽 + 이미지 박스 오른쪽)
      ──────────────────────────────────────────────────────────── */}
      <div className="mypage-hero">
        <div className="mypage-hero-inner">
          {/* 왼쪽 텍스트 */}
          <div className="mypage-hero-text" style={{ flex: 1 }}>
            <div style={{ fontSize: '.78rem', opacity: .55, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
              MY PAGE
            </div>
            <h2>나의 메뉴 취향과 활동을 한눈에 확인하세요.</h2>
            <p>찜한 메뉴, 프로필, 추천 기록, 매칭 내역을 관리하는 마이페이지입니다.</p>
            <Link to="/mypage/edit" className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}>
              프로필 수정 →
            </Link>
          </div>

          {/* 오른쪽 이미지 박스 (와이어프레임 X박스) */}
          <div className="mypage-hero-img">🍽️</div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          STAT ROW  4칸
      ──────────────────────────────────────────────────────────── */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-num">{(user.preferences?.likes ?? []).length}</div>
          <div className="stat-label">찜한 메뉴</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 2 }}>
            좋아요 {(user.preferences?.likes ?? []).length}개 / 싫어요 {dislikes.length}개
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{rec_logs.length}</div>
          <div className="stat-label">추천 활동</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 2 }}>최근 추천 {rec_logs.length}회</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{my_parties.length}</div>
          <div className="stat-label">매칭 기록</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 2 }}>완료된 파티 {my_parties.length}건</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--color-accent)' }}>{mannerScore}</div>
          <div className="stat-label">매너점수</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 2 }}>당근처럼 {mannerScore}점</div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          PROFILE + MANNER  2단 그리드
      ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>

        {/* 프로필 */}
        <div className="profile-section">
          <div className="flex-between mb-16">
            <h3>프로필</h3>
            <Link to="/mypage/edit" className="btn btn-sm btn-secondary">수정</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
            {/* 아바타 (와이어프레임 X박스) */}
            <div style={{
              width: 80, height: 80, background: 'var(--bg-surface)',
              borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-secondary)',
            }}>
              {user.nickname?.[0]}
            </div>
            <div>
              {[
                ['성별',    user.preferences?.gender ?? '여성'],
                ['선호메뉴', (user.preferences?.likes ?? []).slice(0, 3).join(', ') || '미설정'],
                ['알러지',  (user.allergies ?? '').split(',').filter(Boolean).slice(0, 2).join(', ') || '없음'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bg-surface)', fontSize: '.88rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 매너점수 */}
        <div className="profile-section">
          <div className="flex-between mb-16">
            <h3>매너점수</h3>
            <a href="#" className="btn btn-sm btn-secondary">내역</a>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* SVG 게이지 */}
            <div ref={gauge2Ref} style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface)" strokeWidth="8"/>
                <circle className="progress" cx="50" cy="50" r="40" fill="none"
                  stroke="var(--color-accent)" strokeWidth="8" strokeLinecap="round"
                  transform="rotate(-90 50 50)"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{mannerScore}</span>
                <small style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>점</small>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>따뜻한 식사 메이트</div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                강규처럼 약속, 공감, 후기 기반으로 쌓아두는 점수
              </p>
            </div>
          </div>
          <hr className="divider" />
          {[
            ['파티 참여', (my_parties.length * 0.5).toFixed(1)],
            ['후기 작성', (liked_logs.length * 0.3).toFixed(1)],
            ['약속 이행', '1.0'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '.82rem', color: 'var(--text-muted)' }}>
              <span>{label}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+{val}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          메뉴 찜목록  탭 + 카드 그리드
      ──────────────────────────────────────────────────────────── */}
      <div className="profile-section">
        <div className="flex-between mb-16">
          <h3>메뉴 찜목록</h3>
          <Link to="/menu" className="btn btn-sm btn-secondary">선택보기 →</Link>
        </div>

        {/* 탭 버튼 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['liked','좋아요'], ['disliked','싫어요']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{
                padding: '7px 20px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '.88rem',
                background: activeTab === key ? 'var(--color-secondary)' : 'var(--bg-surface)',
                color: activeTab === key ? '#fff' : 'var(--text-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* 좋아요 패널 */}
        {activeTab === 'liked' && (
          liked_logs.length > 0 ? (
            <div className="grid-4">
              {liked_logs.slice(0, 4).map((log) => (
                <Link to={`/menu/${log.recommended_restaurant_id}`} className="card rest-card" key={log.log_id}>
                  <div style={{
                    aspectRatio: '4/3', background: 'var(--bg-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', borderBottom: '1px solid var(--border-color)',
                  }}>
                    🍴
                  </div>
                  <div className="card-body">
                    <span className="badge badge-primary">{log.restaurant?.category ?? '기타'}</span>
                    <div className="card-title mt-8">{log.restaurant?.name ?? '식당'}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {log.restaurant?.description ?? '최근 추천된 메뉴'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">❤️</div>
              <p>아직 찜한 메뉴가 없습니다</p>
              <Link to="/menu" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>메뉴 둘러보기</Link>
            </div>
          )
        )}

        {/* 싫어요 패널 */}
        {activeTab === 'disliked' && (
          dislikes.length > 0 ? (
            <div className="tag-list" style={{ padding: '16px 0' }}>
              {dislikes.map((d) => <span key={d} className="tag tag-dislike">{d}</span>)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👎</div>
              <p>싫어하는 음식이 없습니다</p>
            </div>
          )
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          활동내역  auto-fit 그리드
      ──────────────────────────────────────────────────────────── */}
      <div className="profile-section">
        <div className="flex-between mb-16">
          <h3>활동내역</h3>
          <a href="#" className="btn btn-sm btn-secondary">선택보기 →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {rec_logs.slice(0, 3).map((log) => (
            <div className="activity-card" key={log.log_id}>
              <div className="activity-icon rec">🤖</div>
              <div className="activity-body">
                <div className="activity-label">추천</div>
                <div className="activity-title">{log.restaurant?.name ?? '식당 추천'}</div>
                <div className="activity-desc">
                  {(log.restaurant?.category ?? '') + ' · ' + (log.input_context?.message ?? '메뉴 추천')}
                </div>
              </div>
              <button onClick={() => handleLike(log.log_id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                aria-label={log.is_liked ? '찜 취소' : '찜하기'}>
                {log.is_liked ? '❤️' : '🤍'}
              </button>
            </div>
          ))}
          {my_parties.slice(0, 2).map((p) => (
            <div className="activity-card" key={p.party_id}>
              <div className="activity-icon party">👥</div>
              <div className="activity-body">
                <div className="activity-label">매칭/파티</div>
                <div className="activity-title">{p.title}</div>
                <div className="activity-desc">
                  {(p.restaurant?.name ?? '') + ' · ' +
                    (p.meeting_time
                      ? new Date(p.meeting_time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '')}
                </div>
              </div>
              <div className="activity-date">
                {p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : ''}
              </div>
            </div>
          ))}
          {rec_logs.length === 0 && my_parties.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">📋</div>
              <p>아직 활동 내역이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
