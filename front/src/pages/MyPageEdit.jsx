import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyPage, updateMyPageProfile } from '../api/services'
import { useAuth } from '../App'

// 기본 선택 목록 (기존 코드 유지)
const PREF_FOODS    = ['한식','일식','중식','양식','분식','치킨','피자','카페','채식','해산물','매운맛']
const DISLIKE_FOODS = ['오이','고수','파','마늘','쑥갓','가지','고등어','낙지','콩','당근']

// 팀원 코드의 processTags 통합 — 콤마로 꼬인 데이터 정제
const processTags = (rawPrefs) => {
  if (!rawPrefs) return []
  if (Array.isArray(rawPrefs)) {
    const flat = rawPrefs.flatMap((item) =>
      typeof item === 'string' ? item.split(',') : item
    )
    return [...new Set(flat.map((v) => v.trim()).filter(Boolean))]
  }
  return []
}

export default function MyPageEdit() {
  const navigate   = useNavigate()
  const { login: ctxLogin } = useAuth()

  const [form, setForm] = useState({
    nickname:    '',
    allergies:   '',
    preferences: [],  // likes
    dislikes:    [],
  })

  // ── 팀원 코드: 직접 입력 태그 추가 기능 ────────────────────────────────────
  const [inputLike,    setInputLike]    = useState('')
  const [inputDislike, setInputDislike] = useState('')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [dataLoading,  setDataLoading]  = useState(true)

  // ── 기존 데이터 로드 ────────────────────────────────────────────────────────
  useEffect(() => {
    getMyPage()
      .then((d) => {
        setForm({
          nickname:    d.user.nickname ?? '',
          allergies:   d.user.allergies ?? '',
          preferences: processTags(d.user.preferences?.likes),
          dislikes:    processTags(d.user.preferences?.dislikes),
        })
      })
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [])

  // ── 버튼 토글 (기존 기능) ───────────────────────────────────────────────────
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

  // ── 팀원 코드: 직접 입력 추가 ──────────────────────────────────────────────
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

  // ── 저장 ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nickname.trim()) { setError('닉네임은 공백일 수 없습니다.'); return }
    setError(''); setLoading(true)
    try {
      // 팀원 코드와 기존 코드 payload 형식 통일
      const payload = {
        nickname:    form.nickname.trim(),
        allergies:   form.allergies,
        preferences: form.preferences,  // routes.py: data.get('preferences')
        dislikes:    form.dislikes,      // routes.py: data.get('dislikes')
      }
      const updated = await updateMyPageProfile(payload)
      ctxLogin(updated)
      navigate('/mypage')
    } catch (err) {
      setError(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally { setLoading(false) }
  }

  if (dataLoading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>
  )

  return (
    <>
      <Link to="/mypage" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>
        ← 마이페이지
      </Link>

      <h2 style={{ marginBottom: 24 }}>✏️ 프로필 수정</h2>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 32, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>

          {/* 닉네임 */}
          <div className="form-group">
            <label className="form-label">닉네임</label>
            <input type="text" className="form-control" required
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>

          {/* 알러지 */}
          <div className="form-group">
            <label className="form-label">
              알러지 / 제외 재료
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (쉼표로 구분)</span>
            </label>
            <input type="text" className="form-control"
              placeholder="예: 견과류, 오이"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>

          {/* ── 좋아하는 음식 ── */}
          <div className="form-group">
            <label className="form-label">👍 좋아하는 음식</label>

            {/* 버튼 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {PREF_FOODS.map((food) => (
                <button type="button" key={food}
                  onClick={() => togglePref(food)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                    cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                    borderColor: form.preferences.includes(food) ? '#1890ff' : 'var(--border-color)',
                    background: form.preferences.includes(food) ? '#e6f7ff' : 'var(--bg-white)',
                    color: form.preferences.includes(food) ? '#1890ff' : 'var(--text-secondary)',
                  }}>
                  {food}
                </button>
              ))}
            </div>

            {/* 직접 입력 (팀원 코드) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" className="form-control"
                placeholder="직접 입력 후 Enter"
                value={inputLike}
                onChange={(e) => setInputLike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLike())}
                style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLike} style={{ flexShrink: 0 }}>추가</button>
            </div>

            {/* 선택된 태그 */}
            {form.preferences.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.preferences.map((item, idx) => (
                  <span key={idx} style={{ background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff', padding: '4px 10px', borderRadius: 20, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item}
                    <button type="button" onClick={() => handleRemoveLike(item)}
                      style={{ border: 'none', background: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '.85rem', padding: 0, fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── 기피하는 음식 ── */}
          <div className="form-group">
            <label className="form-label">👎 기피하는 음식</label>

            {/* 버튼 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {DISLIKE_FOODS.map((food) => (
                <button type="button" key={food}
                  onClick={() => toggleDislike(food)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                    cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                    borderColor: form.dislikes.includes(food) ? '#ff4d4f' : 'var(--border-color)',
                    background: form.dislikes.includes(food) ? '#fff1f0' : 'var(--bg-white)',
                    color: form.dislikes.includes(food) ? '#ff4d4f' : 'var(--text-secondary)',
                  }}>
                  {food}
                </button>
              ))}
            </div>

            {/* 직접 입력 (팀원 코드) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" className="form-control"
                placeholder="직접 입력 후 Enter"
                value={inputDislike}
                onChange={(e) => setInputDislike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDislike())}
                style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddDislike} style={{ flexShrink: 0 }}>추가</button>
            </div>

            {/* 선택된 태그 */}
            {form.dislikes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.dislikes.map((item, idx) => (
                  <span key={idx} style={{ background: '#fff1f0', color: '#ff4d4f', border: '1px solid #ffa39e', padding: '4px 10px', borderRadius: 20, fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item}
                    <button type="button" onClick={() => handleRemoveDislike(item)}
                      style={{ border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '.85rem', padding: 0, fontWeight: 700 }}>×</button>
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
    </>
  )
}
