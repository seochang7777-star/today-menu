import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/services'

const PREF_FOODS = ['한식','일식','중식','양식','분식','치킨','피자','채식','해산물','매운맛']
const REQ_TERMS  = ['만 14세 이상입니다.','쇼핑 이용약관 동의','전자금융거래 이용약관 동의','개인정보 제3자 제공 동의']
const OPT_TERMS  = ['마케팅 목적 개인정보 수집 및 이용 동의','광고성 정보 수신 동의']
const SUB_TERMS  = ['이메일 수신 동의','SMS, SNS 수신 동의','앱 푸시 수신 동의']

export default function Register() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '', password2: '', nickname: '', allergies: '', preferences: [] })
  const [terms,   setTerms]   = useState({})
  const [agreeAll,setAgreeAll]= useState(false)
  const [pwError, setPwError] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const togglePref = (food) => setForm((f) => ({
    ...f, preferences: f.preferences.includes(food) ? f.preferences.filter((x) => x !== food) : [...f.preferences, food]
  }))

  const handleAgreeAll = (checked) => {
    setAgreeAll(checked)
    const all = {}
    ;[...REQ_TERMS, ...OPT_TERMS, ...SUB_TERMS].forEach((t) => { all[t] = checked })
    setTerms(all)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) { setPwError('비밀번호가 일치하지 않습니다.'); return }
    if (!REQ_TERMS.every((t) => terms[t])) { setError('필수 약관에 동의해주세요.'); return }
    setError(''); setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message ?? '회원가입에 실패했습니다.')
    } finally { setLoading(false) }
  }

  return (
    <div className="register-wrap">
      <div className="register-card">
        <div className="reg-logo">
          <div className="site-logo">🍽️ <span>오늘의 메뉴</span></div>
        </div>
        <p className="reg-title">회원정보를 입력해주세요</p>

        <form id="registerForm" onSubmit={handleSubmit}>
          {/* 이메일 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">✉️</span>
            <input type="email" className="form-control" placeholder="아이디(이메일)" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {/* 비밀번호 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🔒</span>
            <input type="password" className="form-control" placeholder="비밀번호 (8자 이상)" required minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {/* 비밀번호 확인 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🔒</span>
            <input type="password" className="form-control" placeholder="비밀번호 확인"
              value={form.password2}
              onChange={(e) => { setForm({ ...form, password2: e.target.value }); setPwError('') }} />
            {pwError && <div className="form-error">{pwError}</div>}
          </div>
          {/* 닉네임 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">👤</span>
            <input type="text" className="form-control" placeholder="이름 (닉네임)" required
              value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          {/* 알러지 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🚫</span>
            <input type="text" className="form-control" placeholder="알러지 정보 (예: 오이, 갑각류, 땅콩)"
              value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </div>
          {/* 선호 메뉴 */}
          <div className="form-group">
            <div className="form-label">좋아하는 음식 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(선택)</span></div>
            <div className="reg-prefs">
              {PREF_FOODS.map((food) => (
                <div className="reg-pref-chip" key={food}>
                  <input type="checkbox" id={`pref_${food}`} checked={form.preferences.includes(food)}
                    onChange={() => togglePref(food)} />
                  <label htmlFor={`pref_${food}`}>{food}</label>
                </div>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* 약관 */}
          <div className="reg-terms-box">
            <div className="reg-terms-all">
              <input type="checkbox" id="agreeAll" checked={agreeAll} onChange={(e) => handleAgreeAll(e.target.checked)} />
              <label htmlFor="agreeAll">모두 확인하였으며 동의합니다.</label>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              전체 동의는 필수 및 선택 정보에 대한 동의도 포함되어 있으며, 개별적으로 동의를 선택할 수도 있습니다.
            </p>
            {[...REQ_TERMS.map((t) => [t, true]), ...OPT_TERMS.map((t) => [t, false])].map(([label, req]) => (
              <div className="reg-terms-item" key={label}>
                <label>
                  <input type="checkbox" checked={!!terms[label]} onChange={(e) => setTerms({ ...terms, [label]: e.target.checked })} />
                  {req ? <span className="required">[필수]</span> : <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>[선택]</span>}
                  {label}
                </label>
                <span className="reg-terms-arrow">›</span>
              </div>
            ))}
            <div style={{ marginLeft: 24, padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
              {SUB_TERMS.map((t) => (
                <div className="reg-terms-item" key={t}>
                  <label>
                    <input type="checkbox" checked={!!terms[t]} onChange={(e) => setTerms({ ...terms, [t]: e.target.checked })} />
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>[선택]</span> {t}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="submit-btn-wrap">
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
              {loading ? '가입 중...' : '동의하기'}
            </button>
            <div className="size-note">1400px</div>
          </div>
        </form>

        <div className="auth-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  )
}
