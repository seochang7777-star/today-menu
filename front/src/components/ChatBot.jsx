import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { sendChat } from '../api/services'

const QUICK = {
  recommend: ['점심 뭐 먹을까요?', '매운 거 먹고 싶어요', '가볍게 먹고 싶어요', '혼밥 추천해줘'],
  qna:       ['찜 목록은 어떻게 쓰나요?', '파티 참여는 어떻게 하나요?', '취향 설정하고 싶어요', '매너점수가 뭔가요?'],
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    )
  })
}

export default function ChatBot() {
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('recommend')
  const [messages, setMessages] = useState([])
  const [histories, setHistories] = useState({ recommend: [], qna: [] })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userLoc, setUserLoc] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')

  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const addMsg = (role, content, extra = {}) =>
    setMessages((p) => [...p, { role, content, ...extra }])

  const requestLocation = async () => {
    setLocStatus('asking')
    const loc = await getLocation()
    if (loc) {
      setUserLoc(loc)
      setLocStatus('granted')
      return loc
    } else {
      setLocStatus('denied')
      return null
    }
  }

  const send = useCallback(async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    addMsg('user', msg)
    setInput('')
    setLoading(true)

    let loc = userLoc
    if (mode === 'recommend' && !loc && locStatus === 'idle') {
      loc = await requestLocation()
    }

    try {
      const data = await sendChat(
        msg,
        messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
        mode,
        loc?.lat ?? null,
        loc?.lng ?? null,
      )
      addMsg('assistant', data.reply)
    } catch (e) {
      const errMsg =
        e.response?.status === 401
          ? '로그인이 필요합니다.'
          : e.response?.data?.error ?? '오류가 발생했습니다.'
      addMsg('assistant', errMsg, { isError: true })
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, mode, userLoc, locStatus])

  const switchMode = (newMode) => {
    if (newMode === mode) return
    setHistories((h) => ({ ...h, [mode]: messages }))
    setMessages(histories[newMode])
    setMode(newMode)
    setInput('')
  }

  const resetChat = () => {
    setMessages([])
    setHistories((h) => ({ ...h, [mode]: [] }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ✅ ✅ ✅ 중요: Hook 다 선언된 후에 조건 return
  if (!user) return null

  const locColor =
    locStatus === 'granted' ? '#68D391'
    : locStatus === 'denied'  ? '#FC8181'
    : 'rgba(255,255,255,.5)'

  const welcomeText =
    mode === 'recommend'
      ? `안녕하세요 ${user.nickname}님! 🍽️`
      : `안녕하세요 ${user.nickname}님! 💬`

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="chat-window">

          <div className="chat-header">
            🤖 {mode === 'recommend' ? 'AI 메뉴 추천' : 'Q&A'}
          </div>

          <div>

            {messages.length === 0 && (
              <div>
                <div>{welcomeText}</div>
                {QUICK[mode].map((q) => (
                  <button key={q} onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}>
                {m.content}
              </div>
            ))}

            {loading && <div>로딩중...</div>}

            <div ref={endRef} />
          </div>

          <div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => send()}>전송</button>
          </div>

        </div>
      )}
    </>
  )
}