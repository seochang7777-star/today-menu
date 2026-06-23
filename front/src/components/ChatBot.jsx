import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../App'
import { sendChat } from '../api/services'

const QUICK_MSGS = ['점심 추천해줘', '매운 거 먹고 싶어', '가볍게 먹고 싶어', '혼밥 메뉴 추천']

export default function ChatBot() {
  const { user } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)

  // 새 메시지 오면 스크롤
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // 챗봇 열면 입력창 포커스
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // 비회원이면 렌더 안 함
  if (!user) return null

  const addMsg = (role, content) =>
    setMessages((prev) => [...prev, { role, content }])

  const send = useCallback(async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    addMsg('user', msg)
    setInput('')
    setLoading(true)

    try {
      const data = await sendChat(msg, messages)
      addMsg('assistant', data.reply)
    } catch (e) {
      addMsg('assistant', e.response?.data?.error ?? '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
  }

  return (
    <>
      {/* FAB 버튼 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gray-900 text-white
                   text-2xl shadow-xl hover:scale-105 active:scale-95
                   transition-transform duration-150 z-50
                   flex items-center justify-center"
        aria-label={open ? '챗봇 닫기' : 'AI 메뉴 추천 열기'}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* 챗봇 창 */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50
                     w-80 h-[460px] flex flex-col
                     bg-white rounded-2xl shadow-2xl
                     border border-gray-200 overflow-hidden"
          role="dialog"
          aria-label="AI 메뉴 추천 챗봇"
        >
          {/* 헤더 */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-base">
                🤖
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">AI 메뉴 추천</p>
                <p className="text-[11px] text-white/50 leading-tight">
                  GPT · {user.nickname}님 맞춤
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
            >
              초기화
            </button>
          </div>

          {/* 대화 영역 */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
            {/* 웰컴 메시지 */}
            {messages.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                안녕하세요 {user.nickname}님! 🍽️<br />
                오늘 뭐 드시고 싶으세요?
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_MSGS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100
                                 text-[11px] px-2.5 py-1 rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 메시지 목록 */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap leading-relaxed
                  ${m.role === 'user'
                    ? 'self-end bg-gray-900 text-white rounded-br-sm'
                    : 'self-start bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
              >
                {m.content}
              </div>
            ))}

            {/* 로딩 인디케이터 */}
            {loading && (
              <div className="self-start bg-gray-100 text-gray-400 px-3 py-2 rounded-xl text-sm rounded-bl-sm">
                생각 중... 🤔
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* 입력 */}
          <div className="p-2.5 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-full px-4 py-2
                         text-sm outline-none focus:border-gray-400 transition-colors
                         disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="btn-dark rounded-full px-4 py-2 text-sm"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  )
}
