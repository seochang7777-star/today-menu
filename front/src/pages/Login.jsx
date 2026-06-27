import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/services'
import { useAuth } from '../App'

export default function Login() {
  const navigate = useNavigate()
  const { login: ctxLogin } = useAuth()
  const [form,  setForm]  = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form)
      ctxLogin(data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message ?? '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <span className="text-4xl">🍽️</span>
          <h1 className="text-xl font-black mt-2">오늘의 메뉴</h1>
        </div>
        <h2 className="text-lg font-bold text-center mb-6">로그인</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">이메일</label>
            <input type="email" required className="input"
              placeholder="이메일 입력"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">비밀번호</label>
            <input type="password" required className="input"
              placeholder="비밀번호 입력"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-blue-500 font-semibold hover:underline">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
