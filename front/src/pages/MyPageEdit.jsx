// src/pages/MyPageEdit.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyPage, updateMyPageProfile, verifyPassword, changePassword } from '../api/services'
import { useAuth } from '../App'
import { processTags } from '../utils'

const PREF_FOODS = ['한식', '일식', '중식', '양식', '분식', '치킨', '카페', '채식', '해산물', '매운맛']
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

    securityQuestion: '',
    securityAnswer: '',
  })

  const [inputLike, setInputLike] = useState('')
  const [inputDislike, setInputDislike] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', newPassword2: '', })
  const [isPasswordValidated, setIsPasswordValidated] = useState(false)
  const [isEditingSecurity, setIsEditingSecurity] = useState(false)

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

          securityQuestion: d.user.security_question ?? '',
          securityAnswer: '',
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

  const handlePasswordChange = (field, value) => {
    setIsPasswordValidated(false)

    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCheckPassword = async () => {
    setError('')
    setIsPasswordValidated(false)

    const {
      currentPassword,
      newPassword,
      newPassword2,
    } = passwordForm

    if (!currentPassword || !newPassword || !newPassword2) {
      setError('모든 항목을 입력해주세요.')
      return
    }

    if (newPassword !== newPassword2) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 4) {
      setError('비밀번호는 4자리 이상이어야 합니다.')
      return
    }

    try {
      await verifyPassword(currentPassword)

      setIsPasswordValidated(true)

    } catch (err) {
      setError(err.response?.data?.message ?? '비밀번호 확인 실패')
    }
  }
  // ── 저장 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nickname.trim()) { setError('닉네임은 공백일 수 없습니다.'); return }
    if (isChangingPassword && !isPasswordValidated) {
      setError('먼저 비밀번호 확인을 완료해주세요.')
      return
    }
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
        security_question: form.securityQuestion,
        security_answer: form.securityAnswer,
      }
      if (isChangingPassword) {
        await changePassword(
          passwordForm.currentPassword,
          passwordForm.newPassword
        )
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
    <div className="text-center py-[60px] text-[var(--text-muted)]">
      로딩 중...
    </div>
  )

  return (
    <div className="max-w-[600px] w-full mx-auto">

      {/* 마이페이지로 이동 */}
      <Link to="/mypage" className="mt-5 inline-flex items-center transition hover:scale-160 cursor-pointer">
        <img
          src="/img/icon/arrow_left.png" alt="마이페이지"
          className="h-10 w-10"
        />
      </Link>
      {/* 제목 */}
      <div className="text-center mb-7">
        <h2 className="inline-flex items-center justify-center gap-2 text-[2rem] font-extrabold text-[var(--text-primary)] mb-2">
          <img
            src="/img/icon/edit.png"
            alt="프로필 수정"
            className="w-8 h-8 object-contain"
          />
          <span>프로필 수정</span>
        </h2>

        <p className="text-[0.92rem] text-[var(--text-muted)]">
          회원 정보를 수정하고 나만의 취향을 관리해보세요.
        </p>
      </div>

      <div className="bg-[var(--bg-white)] border border-[var(--border-color)] rounded-[var(--border-radius-xl)] p-8">
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
            <div className="flex gap-2">
              {['미설정', '남성', '여성', '기타'].map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`px-[18px] py-1.5 rounded-full border-[1.5px] cursor-pointer text-[.85rem] font-semibold ${form.gender === g
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--border-color)] bg-[var(--bg-white)] text-[var(--text-secondary)]'
                    }`}
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
              <span className="text-[var(--text-muted)] font-normal"> (쉼표로 구분)</span>
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
            <div className="flex flex-wrap gap-2 mb-2.5">
              {PREF_FOODS.map((food) => (
                <button
                  type="button"
                  key={food}
                  onClick={() => togglePref(food)}
                  className={`px-3.5 py-[5px] rounded-full border-[1.5px] cursor-pointer text-[.82rem] font-semibold ${form.preferences.includes(food)
                    ? 'border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]'
                    : 'border-[var(--border-color)] bg-[var(--bg-white)] text-[var(--text-secondary)]'
                    }`}
                >
                  {food}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-control flex-1"
                placeholder="직접 입력 후 Enter"
                value={inputLike}
                onChange={(e) => setInputLike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLike())}
              />
              <button type="button" className="btn btn-secondary btn-sm flex-shrink-0" onClick={handleAddLike}>
                추가
              </button>
            </div>
            {form.preferences.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.preferences.map((item, idx) => (
                  <span
                    key={idx}
                    className="bg-[#e6f7ff] text-[#1890ff] border border-[#91d5ff] px-2.5 py-1 rounded-full text-[.78rem] flex items-center gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveLike(item)}
                      className="border-0 bg-transparent text-[#1890ff] cursor-pointer text-[.85rem] p-0 font-bold"
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
            <div className="flex flex-wrap gap-2 mb-2.5">
              {DISLIKE_FOODS.map((food) => (
                <button
                  type="button"
                  key={food}
                  onClick={() => toggleDislike(food)}
                  className={`px-3.5 py-[5px] rounded-full border-[1.5px] cursor-pointer text-[.82rem] font-semibold ${form.dislikes.includes(food)
                    ? 'border-[#ff4d4f] bg-[#fff1f0] text-[#ff4d4f]'
                    : 'border-[var(--border-color)] bg-[var(--bg-white)] text-[var(--text-secondary)]'
                    }`}
                >
                  {food}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-control flex-1"
                placeholder="직접 입력 후 Enter"
                value={inputDislike}
                onChange={(e) => setInputDislike(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDislike())}
              />
              <button type="button" className="btn btn-secondary btn-sm flex-shrink-0" onClick={handleAddDislike}>
                추가
              </button>
            </div>
            {form.dislikes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.dislikes.map((item, idx) => (
                  <span
                    key={idx}
                    className="bg-[#fff1f0] text-[#ff4d4f] border border-[#ffa39e] px-2.5 py-1 rounded-full text-[.78rem] flex items-center gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveDislike(item)}
                      className="border-0 bg-transparent text-[#ff4d4f] cursor-pointer text-[.85rem] p-0 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 보안 질문 */}
            <div className="form-group border-t border-dashed border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center mb-3">

                <label className="form-label mb-0">
                  🔑 아이디 찾기 설정
                </label>

                <button
                  type="button"
                  onClick={() => setIsEditingSecurity(!isEditingSecurity)}
                  className="text-xs text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer font-medium"
                >
                  {isEditingSecurity ? '설정 취소' : '설정하기'}
                </button>

              </div>

              {isEditingSecurity && (

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                  <label className="form-label">아이디 찾기용 보안 질문</label>
                  <select
                    className="form-control mb-3"
                    value={form.securityQuestion}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        securityQuestion: e.target.value,
                      })
                    }
                  >
                    <option value="">질문을 선택하세요.</option>
                    <option value="초등학교 담임선생님 성함은?">
                      초등학교 담임선생님 성함은?
                    </option>
                    <option value="가장 좋아했던 음식은?">
                      가장 좋아했던 음식은?
                    </option>
                    <option value="처음 키운 반려동물 이름은?">
                      처음 키운 반려동물 이름은?
                    </option>
                    <option value="가장 기억에 남는 여행지는?">
                      가장 기억에 남는 여행지는?
                    </option>
                    <option value="가장 좋아하는 영화는?">
                      가장 좋아하는 영화는?
                    </option>
                  </select>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="답변을 입력하세요."
                    value={form.securityAnswer}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        securityAnswer: e.target.value,
                      })
                    }
                  />

                  <p className="text-xs text-gray-500 mt-2">
                    아이디를 잊어버렸을 때 본인 확인에 사용됩니다.
                  </p>
                </div>

              )}
            </div>
            {/* 🔐 비밀번호 변경 */}
            <div className="form-group border-t border-dashed border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center mb-3">
                <label className="form-label mb-0">
                  🔐 비밀번호 변경
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword)
                    setIsPasswordValidated(false)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer font-medium"
                >
                  {isChangingPassword ? '변경 취소' : '비밀번호 변경하기'}
                </button>
              </div>

              {isChangingPassword && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      현재 비밀번호
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="현재 비밀번호"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        handlePasswordChange('currentPassword', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      새 비밀번호
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="새 비밀번호"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        handlePasswordChange('newPassword', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      새 비밀번호 확인
                    </label>

                    <input
                      type="password"
                      className="form-control"
                      placeholder="새 비밀번호 확인"
                      value={passwordForm.newPassword2}
                      onChange={(e) =>
                        handlePasswordChange('newPassword2', e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckPassword}
                    className="inline-flex items-center gap-1 text-[.85rem] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    비밀번호 확인
                  </button>

                  {isPasswordValidated && (
                    <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">
                      ✓ 현재 비밀번호가 확인되었습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-3 px-6 text-lg font-semibold rounded-[12px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors mt-[8px] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
