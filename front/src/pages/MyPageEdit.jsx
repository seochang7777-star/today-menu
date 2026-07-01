// src/pages/MyPageEdit.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyPage, updateMyPageProfile } from '../api/services'
import { useAuth } from '../App'
import { processTags } from '../utils'

const PREF_FOODS = ['한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '채식', '해산물', '매운맛']
const DISLIKE_FOODS = ['오이', '고수', '파', '마늘', '쑥갓', '가지', '고등어', '낙지', '콩', '당근']

export default function MyPageEdit() {
  const navigate = useNavigate()
  const { login } = useAuth()   // App.jsx: login(data) → 토큰 없으면 setUser만 실행

  const [form, setForm] = useState({
    nickname: '',
    allergies: '',
    gender: '미설정',   // ← 추가
    address: '',          // ← 추가
    preferences: [],  // likes
    dislikes: [],
  })

  const [inputLike, setInputLike] = useState('')
  const [inputDislike, setInputDislike] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  // ── 기존 데이터 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    getMyPage()
      .then((d) => {
        setForm({
          nickname: d.user.nickname ?? '',
          allergies: d.user.allergies ?? '',
          gender: d.user.gender ?? '미설정',
          address: d.user.address ?? '',
          preferences: processTags(d.user.preferences?.likes),
          dislikes: processTags(d.user.preferences?.dislikes),
        })
      })
      .catch(() => { })
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    if (dataLoading || window.location.hash !== '#food-preferences') return

    requestAnimationFrame(() => {
      document.getElementById('food-preferences')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [dataLoading])

  // ── 버튼 토글 ─────────────────────────────────────────────────────────────
  const togglePref = (food) =>
    setForm((f) => ({
      ...f,
      preferences: f.preferences.includes(food)
        ? f.preferences.filter((x) => x !== food)
        : [...f.preferences, food],
    }))

  const toggleDislike = (food) =>
    setForm((f) => ({
      ...f,
      dislikes: f.dislikes.includes(food)
        ? f.dislikes.filter((x) => x !== food)
        : [...f.dislikes, food],
    }))

  // ── 직접 입력 추가/삭제 ───────────────────────────────────────────────────
  const handleAddLike = () => {
    const val = inputLike.trim()
    if (val && !form.preferences.includes(val)) {
      setForm((f) => ({ ...f, preferences: [...f.preferences, val] }))
      setInputLike('')
    }
  }

  const handleRemoveLike = (target) =>
    setForm((f) => ({ ...f, preferences: f.preferences.filter((x) => x !== target) }))

  const handleAddDislike = () => {
    const val = inputDislike.trim()
    if (val && !form.dislikes.includes(val)) {
      setForm((f) => ({ ...f, dislikes: [...f.dislikes, val] }))
      setInputDislike('')
    }
  }

  const handleRemoveDislike = (target) =>
    setForm((f) => ({ ...f, dislikes: f.dislikes.filter((x) => x !== target) }))

  // ── 저장 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nickname.trim()) { setError('닉네임은 공백일 수 없습니다.'); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        nickname: form.nickname.trim(),
        allergies: form.allergies,
        gender: form.gender,    // ← 추가
        address: form.address,   // ← 추가
        likes: form.preferences,  // routes.py: data.get('preferences') → likes
        dislikes: form.dislikes,      // routes.py: data.get('dislikes')
      }
      const updated = await updateMyPageProfile(payload)
      // App.jsx의 login()은 토큰이 없으면 setUser만 실행 → 프로필 갱신 용도로 적합
      login(updated)
      navigate('/mypage')
    } catch (err) {
      setError(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
      로딩 중...
    </div>
  )

  return (
    <div style={{ maxWidth: 600, width: '100%', margin: '0 auto' }}>
      <Link to="/mypage" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>
        ← 마이페이지
      </Link>

      <h2 style={{ marginBottom: 24 }}>✏️ 프로필 수정</h2>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 32 }}>
        <form onSubmit={handleSubmit}>

          {/* 닉네임 */}
          <div className="form-group">
            <label className="form-label">닉네임</label>
            <input
              type="text"
              className="form-control"
              required
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </div>

          {/* 성별 */}
          <div className="form-group">
            <label className="form-label">성별</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['미설정', '남성', '여성', '기타'].map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setForm({ ...form, gender: g })}
                  style={{
                    padding: '6px 18px', borderRadius: 20, border: '1.5px solid',
                    cursor: 'pointer', fontSize: '.85rem', fontWeight: 600,
                    borderColor: form.gender === g ? 'var(--color-primary)' : 'var(--border-color)',
                    background: form.gender === g ? 'var(--color-primary)' : 'var(--bg-white)',
                    color: form.gender === g ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 주소지 */}
          <div className="form-group">
            <label className="form-label">주소지</label>
            <input
              type="text"
              className="form-control"
              placeholder="예: 서울시 강남구"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* 알러지 */}
          <div className="form-group">
            <label className="form-label">
              알러지 / 제외 재료
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (쉼표로 구분)</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="예: 견과류, 오이"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            />
          </div>

          {/* 좋아하는 음식 */}
          <div className="form-group" id="food-preferences">
            <label className="form-label">👍 좋아하는 음식</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {PREF_FOODS.map((food) => (
                <button
                  type="button"
                  key={food}
                  onClick={() => togglePref(food)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                    cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                    borderColor: form.preferences.includes(food) ? '#1890ff' : 'var(--border-color)',
                    background: form.preferences.includes(food) ? '#e6f7ff' : 'var(--bg-white)',
                    color: form.preferences.includes(food) ? '#1890ff' : 'var(--text-secondary)',
                  }}
                >
                  {food}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="form-control"
                placeholder="직접 입력 후 Enter"
                value={inputLike}
                onChange={(e) => setInputLike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLike())}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLike} style={{ flexShrink: 0 }}>
                추가
              </button>
            </div>
            {form.preferences.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.preferences.map((item, idx) => (
                  <span
                    key={idx}
                    style={{ background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff', padding: '4px 10px', borderRadius: 20, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveLike(item)}
                      style={{ border: 'none', background: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '.85rem', padding: 0, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 기피하는 음식 */}
          <div className="form-group">
            <label className="form-label">👎 기피하는 음식</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {DISLIKE_FOODS.map((food) => (
                <button
                  type="button"
                  key={food}
                  onClick={() => toggleDislike(food)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                    cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                    borderColor: form.dislikes.includes(food) ? '#ff4d4f' : 'var(--border-color)',
                    background: form.dislikes.includes(food) ? '#fff1f0' : 'var(--bg-white)',
                    color: form.dislikes.includes(food) ? '#ff4d4f' : 'var(--text-secondary)',
                  }}
                >
                  {food}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="form-control"
                placeholder="직접 입력 후 Enter"
                value={inputDislike}
                onChange={(e) => setInputDislike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDislike())}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddDislike} style={{ flexShrink: 0 }}>
                추가
              </button>
            </div>
            {form.dislikes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.dislikes.map((item, idx) => (
                  <span
                    key={idx}
                    style={{ background: '#fff1f0', color: '#ff4d4f', border: '1px solid #ffa39e', padding: '4px 10px', borderRadius: 20, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveDislike(item)}
                      style={{ border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '.85rem', padding: 0, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
