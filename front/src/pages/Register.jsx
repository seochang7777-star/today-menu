import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/services'

const PREF_LIST    = ['한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '채식', '해산물']
const DISLIKE_LIST = ['오이', '고수', '파', '마늘', '쑥갓', '가지', '당근', '콩']
const REQ_TERMS    = ['만 14세 이상입니다.', '쇼핑 이용약관 동의', '전자금융거래 이용약관 동의', '개인정보 제3자 제공 동의']
const OPT_TERMS    = ['마케팅 목적 개인정보 수집 및 이용 동의', '광고성 정보 수신 동의']

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '', password: '', password2: '', nickname: '',
    allergies: '', preferences: [], dislikes: [],
  })
  const [terms,    setTerms]    = useState({})
  const [agreeAll, setAgreeAll] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const toggleChip = (val, key) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val],
    }))

  const handleAgreeAll = (checked) => {
    setAgreeAll(checked)
    const all = {}
    ;[...REQ_TERMS, ...OPT_TERMS].forEach((t) => { all[t] = checked })
    setTerms(all)
  }

  const handleTermChange = (term, checked) => {
    const next = { ...terms, [term]: checked }
    setTerms(next)
    setAgreeAll([...REQ_TERMS, ...OPT_TERMS].every((t) => next[t]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password2) return setError('비밀번호가 일치하지 않습니다.')
    if (form.password.length < 8)         return setError('비밀번호는 8자 이상이어야 합니다.')
    if (!REQ_TERMS.every((t) => terms[t])) return setError('필수 약관에 동의해주세요.')

    setLoading(true)
    try {
      await register(form)
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err.response?.data?.message ?? '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const chipCls = (active, color = 'gray') =>
    `px-3 py-1 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${
      active
        ? color === 'red'
          ? 'bg-red-500 text-white border-red-500'
          : 'bg-gray-900 text-white border-gray-900'
        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
    }`

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="card p-8 shadow-lg">
          {/* 로고 */}
          <div className="text-center mb-7">
            <span className="text-5xl">🍽️</span>
            <h1 className="text-xl font-black mt-3 mb-1">오늘의 메뉴</h1>
            <p className="text-sm text-gray-400">회원정보를 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: '이메일 *',      name: 'email',     type: 'email',    ph: '이메일 입력',    ac: 'email' },
                { label: '닉네임 *',      name: 'nickname',  type: 'text',     ph: '닉네임 입력',    ac: 'nickname' },
                { label: '비밀번호 *',    name: 'password',  type: 'password', ph: '8자 이상',       ac: 'new-password' },
                { label: '비밀번호 확인 *', name: 'password2', type: 'password', ph: '비밀번호 재입력', ac: 'new-password' },
              ].map(({ label, name, type, ph, ac }) => (
                <div key={name}>
                  <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    id={name} name={name} type={type} required
                    autoComplete={ac} placeholder={ph}
                    className="input"
                    value={form[name]}
                    onChange={handleChange}
                  />
                </div>
              ))}

              <div>
                <label htmlFor="allergies" className="block text-sm font-semibold text-gray-700 mb-1">
                  알러지 / 제외 재료
                </label>
                <input
                  id="allergies" name="allergies" type="text"
                  placeholder="예: 오이, 갑각류, 땅콩 (쉼표로 구분)"
                  className="input"
                  value={form.allergies}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 선호 음식 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">좋아하는 음식</p>
              <div className="flex flex-wrap gap-2">
                {PREF_LIST.map((p) => (
                  <button key={p} type="button"
                    onClick={() => toggleChip(p, 'preferences')}
                    className={chipCls(form.preferences.includes(p))}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 싫어하는 음식 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">싫어하는 음식</p>
              <div className="flex flex-wrap gap-2">
                {DISLIKE_LIST.map((d) => (
                  <button key={d} type="button"
                    onClick={() => toggleChip(d, 'dislikes')}
                    className={chipCls(form.dislikes.includes(d), 'red')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 약관 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* 전체 동의 */}
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm border-b border-gray-200 pb-3">
                <input
                  type="checkbox"
                  checked={agreeAll}
                  onChange={(e) => handleAgreeAll(e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
                모두 확인하였으며 동의합니다.
              </label>

              {/* 필수 약관 */}
              <div className="space-y-2">
                {REQ_TERMS.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!terms[t]}
                      onChange={(e) => handleTermChange(t, e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-500"
                    />
                    <span className="text-red-500 text-xs font-bold">[필수]</span>
                    <span className="text-xs text-gray-600">{t}</span>
                  </label>
                ))}
              </div>

              {/* 선택 약관 */}
              <div className="space-y-2 border-t border-gray-200 pt-2">
                {OPT_TERMS.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!terms[t]}
                      onChange={(e) => handleTermChange(t, e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-500"
                    />
                    <span className="text-gray-400 text-xs">[선택]</span>
                    <span className="text-xs text-gray-500">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? '가입 중...' : '동의하고 가입하기'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-blue-500 font-semibold hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
