import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../api/services'
import { useAuth } from '../App'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: ctxLogin } = useAuth()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // 로그인 후 원래 가려던 페이지로 이동
  const from = location.state?.from?.pathname ?? '/'

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const data = await login(form)
      ctxLogin(data)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-lg">
          {/* 로고 */}
          <div className="text-center mb-8">
            <span className="text-5xl">🍽️</span>
            <h1 className="text-xl font-black mt-3 mb-1">오늘의 메뉴</h1>
            <p className="text-sm text-gray-400">로그인하고 AI 맞춤 추천을 받아보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="이메일 입력"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="비밀번호 입력"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-blue-500 font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
