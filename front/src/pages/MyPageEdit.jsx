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

  // ── 카카오 주소 검색 팝업 ─────────────────────────────────────────────────
  const handleAddressSearch = () => {
    const openPostcode = () => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          const address = data.roadAddress || data.jibunAddress

          setForm((f) => ({
            ...f,
            address,
          }))
        },
      }).open()
    }

    if (window.daum && window.daum.Postcode) {
      openPostcode()
      return
    }

    const script = document.createElement('script')
    script.src =
      '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = openPostcode

    document.head.appendChild(script)
  }


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


    if (newPassword.length < 8) {
      setError('비밀번호는 8자리 이상이어야 합니다.')
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

      if (updated && updated.user) {
        login(updated.user)
      } else {
        login(updated)
      }


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
    <div className="mx-auto flex w-full max-w-[1110px] justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full rounded-[28px] border border-[var(--border-color)] bg-white p-5 shadow-[0_18px_45px_rgba(42,29,26,0.10)] sm:p-8 lg:p-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative overflow-visible rounded-[24px] px-3 py-0 sm:px-7 lg:px-9">
            <Link
              to="/mypage"
              className="absolute left-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0ded4] bg-white shadow-sm transition hover:-translate-x-0.5 hover:shadow-md"
              aria-label="마이페이지로 이동"
            >
              <img
                src="/img/icon/arrow_left.png" alt="마이페이지"
                className="h-9 w-9 object-contain"
              />
            </Link>

            <div className="grid items-end gap-2 pt-8 md:grid-cols-[1fr_230px] md:pt-0">
              <div className="ml-20 pb-10 text-center md:text-left">
                <h2 className="inline-flex items-center justify-center gap-2 text-[1.7rem] font-black text-[var(--text-primary)] sm:text-[2rem]">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-whites">
                    <img
                      src="/img/icon/edit2.png"
                      alt="프로필 수정"
                      className="h-8 w-8 object-contain"
                    />
                  </span>
                  <span>프로필 수정</span>
                </h2>

                <p className="ml-15 mt-1 text-[0.9rem] font-medium text-[var(--text-muted)]">
                  회원 정보를 수정하고 나만의 취향을 관리해보세요!
                </p>
              </div>
              <img
                src="/img/icon/character2.png"
                alt="캐릭터2"
                className="self-end block max-h-[140px] w-full translate-y-6 object-contain"
              />
            </div>
          </div>

          <section className="rounded-[22px] border border-[var(--border-color)] bg-[#fffdf9] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--text-primary)]">기본 정보</h3>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                {/* 닉네임 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">닉네임</label>
                  <input
                    type="text"
                    className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-white px-4 text-[0.95rem] outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    required
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </div>

                {/* 주소지 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                    주소지
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="h-12 flex-1 rounded-2xl border border-[var(--border-color)] bg-white px-4 text-[0.95rem] outline-none transition"
                      placeholder="주소 검색 버튼을 눌러주세요"
                      value={form.address}
                      readOnly
                      onClick={handleAddressSearch}
                      style={{ cursor: 'pointer' }}
                    />

                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="h-12 flex-shrink-0 rounded-2xl border border-[#FAD0D1] bg-[#FEEDEC] px-5 text-sm font-extrabold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                    >
                      🔍 주소 검색
                    </button>
                  </div>

                  {/* 🔥 [수정 부분] 단순 텍스트를 정돈된 테두리 칸(Box) 레이아웃으로 변경 */}
                  {form.address && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-3.5 text-[0.93rem] text-[var(--text-primary)] shadow-sm">
                      <span className="text-base flex-shrink-0">📍</span>
                      <span className="font-semibold text-[var(--text-secondary)] flex-shrink-0">선택된 주소:</span>
                      <span className="truncate font-medium">{form.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {/* 성별 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">성별</label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {['미설정', '남성', '여성', '기타'].map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`h-10 rounded-2xl border text-[.88rem] font-bold transition ${form.gender === g
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(244,108,111,0.22)]'
                          : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--color-primary)]'
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 알러지 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                    알러지 / 제외 재료
                    <span className="font-normal text-[var(--text-muted)]"> (쉼표로 구분)</span>
                  </label>
                  <input
                    type="text"
                    className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-white px-4 text-[0.95rem] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                    placeholder="예: 견과류, 오이"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5" id="food-preferences">
            {/* 좋아하는 음식 */}
            <div className="rounded-[22px] border border-[var(--border-color)] bg-[#fffdf9] p-5 sm:p-6">
              <label className="mb-3 flex items-center gap-2 text-[.95rem] font-bold text-[#1890ff]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EBF5FF]">
                  <img
                    src="/img/icon/thumb-up.png"
                    alt="좋아하는 음식"
                    className="h-5 w-5 object-contain"
                  />
                </span>
                <span>좋아하는 음식</span>
              </label>
              <div className="mb-4 flex flex-wrap gap-2">
                {PREF_FOODS.map((food) => (
                  <button
                    type="button"
                    key={food}
                    onClick={() => togglePref(food)}
                    className={`rounded-full border px-3.5 py-2 text-[.82rem] font-bold transition ${form.preferences.includes(food)
                      ? 'border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]'
                      : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[#1890ff]'
                      }`}
                  >
                    {food}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  className="h-12 w-[700px] min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-4 text-[0.95rem] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                  placeholder="직접 입력 후 Enter"
                  value={inputLike}
                  onChange={(e) => setInputLike(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLike())}
                />
                <button type="button" className="h-12 flex-shrink-0 rounded-2xl border border-[#FAD0D1] bg-[#FEEDEC] ml-3 px-5 text-sm font-extrabold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white" onClick={handleAddLike}>
                  추가
                </button>
              </div>
              {form.preferences.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.preferences.map((item, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 rounded-full border border-[#91d5ff] bg-[#e6f7ff] px-2.5 py-1 text-[.78rem] text-[#1890ff]"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveLike(item)}
                        className="border-0 bg-transparent p-0 text-[.85rem] font-bold text-[#1890ff]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 기피하는 음식 */}
            <div className="rounded-[22px] border border-[var(--border-color)] bg-[#fffdf9] p-5 sm:p-6">
              <label className="mb-3 flex items-center gap-2 text-[.95rem] font-bold text-[#FF4D4F]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF3F0]">
                  <img
                    src="/img/icon/thumbs-down.png"
                    alt="기피하는 음식"
                    className="h-5 w-5 object-contain"
                  />
                </span>
                <span>기피하는 음식</span>
              </label>
              <div className="mb-4 flex flex-wrap gap-2">
                {DISLIKE_FOODS.map((food) => (
                  <button
                    type="button"
                    key={food}
                    onClick={() => toggleDislike(food)}
                    className={`rounded-full border px-3.5 py-2 text-[.82rem] font-bold transition ${form.dislikes.includes(food)
                      ? 'border-[#ff4d4f] bg-[#fff1f0] text-[#ff4d4f]'
                      : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[#ff4d4f]'
                      }`}
                  >
                    {food}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  className="h-12 w-[700px] min-w-0 rounded-2xl border border-[var(--border-color)] bg-white px-4 text-[0.95rem] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(244,108,111,0.16)]"
                  placeholder="직접 입력 후 Enter"
                  value={inputDislike}
                  onChange={(e) => setInputDislike(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDislike())}
                />
                <button type="button" className="h-12 flex-shrink-0 rounded-2xl border border-[#FAD0D1] bg-[#FEEDEC] ml-3 px-5 text-sm font-extrabold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white" onClick={handleAddDislike}>
                  추가
                </button>
              </div>
              {form.dislikes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.dislikes.map((item, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 rounded-full border border-[#ffa39e] bg-[#fff1f0] px-2.5 py-1 text-[.78rem] text-[#ff4d4f]"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveDislike(item)}
                        className="border-0 bg-transparent p-0 text-[.85rem] font-bold text-[#ff4d4f]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            {/* 보안 질문 */}
            <div className="rounded-[22px] border border-[var(--border-color)] bg-[#fffdf9] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <label className="text-base font-extrabold text-[var(--text-primary)]">
                  🔑 아이디 찾기 설정
                </label>

                <button
                  type="button"
                  onClick={() => setIsEditingSecurity(!isEditingSecurity)}
                  className="rounded-full bg-[#FEEDEC] px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                >
                  {isEditingSecurity ? '설정 취소' : '설정하기  ›'}
                </button>
              </div>

              {isEditingSecurity && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
                  >
                  </input>

                  <p className="mt-2 text-xs text-gray-500">
                    아이디를 잊어버렸을 때 본인 확인에 사용됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* 🔐 비밀번호 변경 */}
            <div className="rounded-[22px] border border-[var(--border-color)] bg-[#fffdf9] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <label className="text-base font-extrabold text-[var(--text-primary)]">
                  🔐 비밀번호 변경
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword)
                    setIsPasswordValidated(false)
                  }}
                  className="rounded-full bg-[#FEEDEC] px-4 py-2 text-xs font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                >
                  {isChangingPassword ? '변경 취소' : '설정하기  ›'}
                </button>
              </div>

              {isChangingPassword && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
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
                    <label className="mb-1 block text-sm font-semibold">
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
                    <label className="mb-1 block text-sm font-semibold">
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
                    className="inline-flex items-center gap-1 border-0 bg-transparent text-[.85rem] font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    비밀번호 확인
                  </button>

                  {isPasswordValidated && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      ✓ 현재 비밀번호가 확인되었습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-[18px] bg-[var(--color-primary)] px-6 py-4 text-lg font-extrabold text-white shadow-[0_12px_24px_rgba(244,108,111,0.24)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}