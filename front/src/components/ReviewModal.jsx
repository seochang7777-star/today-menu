// front/src/components/ReviewModal.jsx
import { useState, useEffect } from 'react'
import { getReviews, createReview, deleteReview } from '../api/services'
import { useAuth } from '../App'

export default function ReviewModal({ restId, restName, onClose }) {
  const { user } = useAuth()
  const [reviews,  setReviews]  = useState([])
  const [avg,      setAvg]      = useState(0)
  const [count,    setCount]    = useState(0)
  const [myRating, setMyRating] = useState(0)
  const [hovered,  setHovered]  = useState(0)
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    loadReviews()
  }, [restId])

  const loadReviews = async () => {
    try {
      const d = await getReviews(restId)
      setReviews(d.reviews ?? [])
      setAvg(d.avg_rating ?? 0)
      setCount(d.count ?? 0)
      // 내 리뷰 찾기
      if (user) {
        const mine = d.reviews?.find(r => r.user_id === user.user_id)
        if (mine) {
          setMyRating(mine.rating)
          setContent(mine.content)
        }
      }
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async () => {
    if (!myRating) { setMsg('별점을 선택해주세요.'); return }
    setLoading(true)
    try {
      await createReview(restId, { rating: myRating, content })
      setMsg('리뷰가 등록되었습니다! 매너온도 +0.3°')
      loadReviews()
    } catch (e) {
      setMsg(e.response?.data?.message || '오류가 발생했습니다.')
    } finally { setLoading(false) }
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm('리뷰를 삭제하시겠습니까?')) return
    try {
      await deleteReview(restId, reviewId)
      setMsg('리뷰가 삭제되었습니다.')
      setMyRating(0); setContent('')
      loadReviews()
    } catch (e) { setMsg(e.response?.data?.message || '삭제 실패') }
  }

  const starColor = (i, base) => i <= base ? '#F6AD55' : '#E2E8F0'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        maxHeight: '85vh', overflowY: 'auto', padding: 28,
      }} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 4 }}>{restName} 리뷰</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F6AD55' }}>{avg.toFixed(1)}</span>
              <div>
                <div>{[1,2,3,4,5].map(i => (
                  <span key={i} style={{ fontSize: '1.1rem', color: i <= Math.round(avg) ? '#F6AD55' : '#E2E8F0' }}>★</span>
                ))}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>리뷰 {count}개</div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* 리뷰 작성 (로그인 시) */}
        {user && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 10 }}>내 리뷰 작성</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1,2,3,4,5].map(i => (
                <button key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setMyRating(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem', padding: 0,
                    color: i <= (hovered || myRating) ? '#F6AD55' : '#E2E8F0', transition: 'color .1s' }}
                >★</button>
              ))}
              {myRating > 0 && (
                <span style={{ marginLeft: 8, fontSize: '.88rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {['', '별로에요', '그저그래요', '괜찮아요', '좋아요', '최고에요'][myRating]}
                </span>
              )}
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="리뷰를 작성해주세요 (선택)"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: '.88rem',
                border: '1px solid var(--border-color)', resize: 'none', fontFamily: 'inherit',
              }}
            />
            {msg && (
              <div style={{
                margin: '8px 0', padding: '6px 10px', borderRadius: 6, fontSize: '.82rem',
                background: msg.includes('오류') || msg.includes('실패') ? '#FFF5F5' : '#F0FFF4',
                color: msg.includes('오류') || msg.includes('실패') ? '#C53030' : '#276749',
              }}>{msg}</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleSubmit} disabled={loading}
                style={{ flex: 1, padding: '9px 0', background: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '.88rem' }}>
                {loading ? '저장 중...' : '리뷰 등록'}
              </button>
              {reviews.find(r => r.user_id === user.user_id) && (
                <button onClick={() => handleDelete(reviews.find(r => r.user_id === user.user_id).review_id)}
                  style={{ padding: '9px 14px', background: 'transparent', color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '.88rem' }}>
                  삭제
                </button>
              )}
            </div>
          </div>
        )}

        {/* 리뷰 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '.88rem' }}>
              아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!
            </div>
          ) : reviews.map(rv => (
            <div key={rv.review_id} style={{
              padding: '12px 14px', background: 'var(--bg-surface)',
              borderRadius: 10, border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.78rem', fontWeight: 700, flexShrink: 0,
                  }}>{rv.nickname?.[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{rv.nickname}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{rv.created_at}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ fontSize: '.9rem', color: i <= rv.rating ? '#F6AD55' : '#E2E8F0' }}>★</span>
                  ))}
                </div>
              </div>
              {rv.content && (
                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {rv.content}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
