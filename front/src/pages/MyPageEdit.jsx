import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyPage, updateMe } from '../api/services'
import { useAuth } from '../App'

const PREF_FOODS    = ['한식','일식','중식','양식','분식','치킨','피자','카페','채식','해산물','매운맛']
const DISLIKE_FOODS = ['오이','고수','파','마늘','쑥갓','가지','고등어','낙지','콩','당근']

export default function MyPageEdit() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useAuth()
  const [form, setForm] = useState({ nickname: '', allergies: '', preferences: [], dislikes: [] })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMyPage().then((d) => {
      setForm({
        nickname:    d.user.nickname,
        allergies:   d.user.allergies ?? '',
        preferences: d.user.preferences?.likes    ?? [],
        dislikes:    d.user.preferences?.dislikes ?? [],
      })
    }).catch(() => {})
  }, [])

  // pref-label 토글 스타일 적용 (Jinja edit.html의 JS 동작 재현)
  const prefStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20,
    border: `1.5px solid ${active ? 'var(--color-secondary)' : 'var(--border-color)'}`,
    fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
    background: active ? 'var(--color-secondary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
  })

  const dislikeStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20,
    border: `1.5px solid ${active ? '#E53E3E' : '#FED7D7'}`,
    fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
    background: active ? '#E53E3E' : 'transparent',
    color: active ? '#fff' : '#C53030',
  })

  const togglePref = (food) => setForm((f) => ({
    ...f, preferences: f.preferences.includes(food) ? f.preferences.filter((x) => x !== food) : [...f.preferences, food]
  }))
  const toggleDislike = (food) => setForm((f) => ({
    ...f, dislikes: f.dislikes.includes(food) ? f.dislikes.filter((x) => x !== food) : [...f.dislikes, food]
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const updated = await updateMe(form)
      ctxLogin(updated)
      navigate('/mypage')
    } catch (err) {
      setError(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Link to="/mypage" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>← 마이페이지</Link>
      <h2 style={{ marginBottom: 24 }}>✏️ 프로필 수정</h2>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 32, maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">닉네임</label>
            <input type="text" className="form-control" value={form.nickname} required
              onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">알러지/제외 재료 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(쉼표로 구분)</span></label>
            <input type="text" className="form-control" placeholder="예: 오이, 갑각류, 땅콩"
              value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>

          {/* 좋아하는 음식 */}
          <div className="form-group">
            <label className="form-label">좋아하는 음식</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PREF_FOODS.map((food) => (
                <button type="button" key={food} style={prefStyle(form.preferences.includes(food))}
                  onClick={() => togglePref(food)}>
                  {food}
                </button>
              ))}
            </div>
          </div>

          {/* 싫어하는 음식 */}
          <div className="form-group">
            <label className="form-label">싫어하는 음식</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DISLIKE_FOODS.map((food) => (
                <button type="button" key={food} style={dislikeStyle(form.dislikes.includes(food))}
                  onClick={() => toggleDislike(food)}>
                  {food}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </>
  )
}
