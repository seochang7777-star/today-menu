import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { findId } from '../api/services'

const QUESTIONS = [
  '초등학교 담임선생님 성함은?',
  '가장 좋아했던 음식은?',
  '처음 키운 반려동물 이름은?',
  '가장 기억에 남는 여행지는?',
  '가장 좋아하는 영화는?',
]

export default function FindId() {
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    setError('')
    setResult('')

    try {
      const data = await findId(
        nickname,
        question,
        answer
      )

      setResult(data.email)

    } catch (err) {
      setError(
        err.response?.data?.message ??
        '아이디를 찾을 수 없습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
  <div className="flex justify-center py-6">
    <div className="bg-[var(--bg-white)] rounded-[var(--border-radius-xl)] shadow-[var(--shadow-lg)] w-full max-w-[420px] p-10">

      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/login')}
        className="text-[.85rem] text-[var(--text-muted)] font-bold flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors bg-transparent border-0 mb-5"
      >
        ← 로그인으로
      </button>

      {/* 로고 */}
      <div className="text-center mb-[28px]">
        <div className="site-logo relative justify-center min-h-[40px] pl-3">
          <img
            src="/img/icon/logo.png"
            alt="오늘 뭐먹지 로고"
            className="absolute right-full h-7 w-auto object-contain"
          />
          <span>오늘 뭐먹지?</span>
        </div>
      </div>

      {/* 제목 */}
      <h2 className="text-[1.4rem] font-extrabold mb-[6px] text-center text-gray-950">
        이메일 찾기
      </h2>

      <p className="text-[0.88rem] text-gray-400 text-center mb-[28px]">
        가입 당시 설정한 정보를 입력해주세요
      </p>

      <form onSubmit={handleSubmit}>

        {/* 닉네임 */}
        <div className="form-group form-icon-wrap">
          <span className="form-icon">👤</span>
          <input
            type="text"
            className="form-control"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        {/* 질문 */}
        <div className="form-group">
          <select
  className="form-control"
  value={question}
  onChange={(e) => setQuestion(e.target.value)}
>
            <option value="">보안 질문 선택</option>
            {QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {/* 답변 */}
        <div className="form-group form-icon-wrap">
          <span className="form-icon">💬</span>
          <input
            type="text"
            className="form-control"
            placeholder="답변"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>

        {error && (
          <div className="alert alert-danger mb-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 px-6 text-lg font-semibold rounded-[12px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          이메일 찾기
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            가입된 이메일입니다.
          </p>

          <div className="text-[1.05rem] font-bold text-green-700">
            {result}
          </div>
        </div>
      )}
    </div>
  </div>
)
}