import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { sendChat } from '../api/services'

// ── 탭별 빠른 질문 (+ 버튼 팝업으로 이동) ────────────────────────────────────
const QUICK = {
  recommend: [
    { icon: '🍱', text: '점심 뭐 먹을까요?' },
    { icon: '🌶️', text: '매운 거 먹고 싶어요' },
    { icon: '🥗', text: '가볍게 먹고 싶어요' },
    { icon: '🙋', text: '혼밥 추천해줘' },
    { icon: '🍜', text: '국물 요리 추천해줘' },
    { icon: '💰', text: '1만원 이하 추천해줘' },
  ],
  qna: [
    { icon: '❤️', text: '찜 목록은 어떻게 쓰나요?' },
    { icon: '👥', text: '파티 참여는 어떻게 하나요?' },
    { icon: '🎯', text: '취향 설정하고 싶어요' },
    { icon: '🌡️', text: '매너점수가 뭔가요?' },
    { icon: '🎲', text: '게임창은 어떻게 쓰나요?' },
    { icon: '📍', text: '위치 기반 추천이 뭔가요?' },
  ],
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

  const [open,       setOpen]       = useState(false)
  const [mode,       setMode]       = useState('recommend')
  const [messages,   setMessages]   = useState([])
  const [histories,  setHistories]  = useState({ recommend: [], qna: [] })
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [userLoc,    setUserLoc]    = useState(null)
  const [locStatus,  setLocStatus]  = useState('idle')
  const [plusOpen,   setPlusOpen]   = useState(false)  // + 버튼 팝업

  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const plusRef  = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  // + 팝업 외부 클릭 시 닫기
  useEffect(() => {
    if (!plusOpen) return
    const handler = (e) => {
      if (plusRef.current && !plusRef.current.contains(e.target)) setPlusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [plusOpen])

  // ── Hook 다 선언된 후 조건 return ────────────────────────────────────────
  if (!user) return null

  const addMsg = (role, content, extra = {}) =>
    setMessages((p) => [...p, { role, content, ...extra }])

  const requestLocation = async () => {
    setLocStatus('asking')
    const loc = await getLocation()
    if (loc) { setUserLoc(loc); setLocStatus('granted'); return loc }
    setLocStatus('denied'); return null
  }

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setPlusOpen(false)
    addMsg('user', msg)
    setInput('')
    setLoading(true)

    let loc = userLoc
    if (mode === 'recommend' && !loc && locStatus === 'idle') loc = await requestLocation()

    try {
      const data = await sendChat(
        msg,
        messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
        mode, loc?.lat ?? null, loc?.lng ?? null,
      )
      addMsg('assistant', data.reply)
    } catch (e) {
      addMsg('assistant',
        e.response?.status === 401 ? '로그인이 필요합니다.'
        : e.response?.data?.error ?? '오류가 발생했습니다.',
        { isError: true }
      )
    } finally { setLoading(false) }
  }

  const switchMode = (newMode) => {
    if (newMode === mode) return
    setHistories((h) => ({ ...h, [mode]: messages }))
    setMessages(histories[newMode])
    setMode(newMode)
    setInput('')
    setPlusOpen(false)
  }

  const resetChat = () => {
    setMessages([])
    setHistories((h) => ({ ...h, [mode]: [] }))
    setInput('')
    setPlusOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // 위치 표시 색상
  const locColor = locStatus === 'granted' ? '#68D391' : locStatus === 'denied' ? '#FC8181' : 'rgba(255,255,255,.5)'

  return (
    <>
      {/* ── FAB ── */}
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="AI 챗봇">
        {open ? '✕' : '💬'}
      </button>

      {/* ── 챗봇 창 ── */}
      {open && (
        <div className="chat-window" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* ── 헤더 ── */}
          <div className="chat-header" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem', lineHeight: 1.2 }}>
                  {mode === 'recommend' ? 'AI 메뉴 추천' : 'Q&A 도우미'}
                </div>
                <div style={{ fontSize: '.7rem', opacity: .6 }}>
                  {user.nickname}님 맞춤 · GPT
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {mode === 'recommend' && (
                <button onClick={requestLocation} title="위치 허용"
                  style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: locColor, borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: '.7rem' }}>
                  📍 {locStatus === 'granted' ? 'ON' : locStatus === 'asking' ? '...' : locStatus === 'denied' ? 'OFF' : '위치'}
                </button>
              )}
              <button onClick={resetChat}
                style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: '.7rem' }}>
                초기화
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 4 }}>
                ✕
              </button>
            </div>
          </div>

          {/* ── 모드 탭 ── */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-white)', flexShrink: 0 }}>
            {[['recommend', '🍽️ 메뉴 추천'], ['qna', '💬 Q&A']].map(([key, label]) => (
              <button key={key} onClick={() => switchMode(key)}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                  fontSize: '.8rem', fontWeight: 700, background: 'none',
                  borderBottom: `2px solid ${mode === key ? 'var(--color-primary)' : 'transparent'}`,
                  color: mode === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── 대화 영역 ── */}
          <div className="chat-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* 웰컴 */}
            {messages.length === 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 14px', fontSize: '.82rem', lineHeight: 1.7 }}>
                <div style={{ marginBottom: 8 }}>
                  {mode === 'recommend'
                    ? `안녕하세요 ${user.nickname}님! 🍽️\n취향 기반으로 메뉴를 추천해드려요.\n왼쪽 + 버튼으로 빠른 질문을 선택할 수 있어요.`
                    : `안녕하세요 ${user.nickname}님! 💬\n앱 사용법이 궁금하면 + 버튼을 눌러보세요.`
                  }
                </div>
                {/* 위치 안내 (추천 탭만) */}
                {mode === 'recommend' && locStatus === 'idle' && (
                  <div style={{ background: '#EBF8FF', borderRadius: 8, padding: '7px 10px', fontSize: '.76rem', color: '#2B6CB0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📍 위치를 허용하면 근처 식당을 먼저 추천해요
                    <button onClick={requestLocation}
                      style={{ background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '.72rem', flexShrink: 0 }}>
                      허용
                    </button>
                  </div>
                )}
                {mode === 'recommend' && locStatus === 'granted' && (
                  <div style={{ background: '#F0FFF4', borderRadius: 8, padding: '6px 10px', fontSize: '.76rem', color: '#276749' }}>
                    ✅ 위치 확인! 현재 위치 근처 식당 기준으로 추천할게요.
                  </div>
                )}
              </div>
            )}

            {/* 메시지 */}
            {messages.map((m, i) => (
              <div key={i}
                className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}
                style={{
                  whiteSpace: 'pre-wrap',
                  ...(m.isError ? { color: 'var(--color-danger)', background: '#FFF5F5' } : {}),
                }}>
                {m.content}
              </div>
            ))}

            {/* 로딩 */}
            {loading && (
              <div className="chat-msg bot" style={{ color: 'var(--text-muted)' }}>
                {mode === 'recommend' ? '🍽️ 추천 찾는 중...' : '💬 답변 작성 중...'}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* ── 입력 영역 ── */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 7, alignItems: 'flex-end', flexShrink: 0, position: 'relative' }}>

            {/* + 버튼 + 팝업 */}
            <div ref={plusRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setPlusOpen((o) => !o)}
                style={{
                  width: 34, height: 34,
                  borderRadius: '50%',
                  border: `2px solid ${plusOpen ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: plusOpen ? 'var(--color-primary)' : 'var(--bg-white)',
                  color: plusOpen ? '#fff' : 'var(--text-muted)',
                  fontSize: '1.2rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s', lineHeight: 1,
                }}
                aria-label="빠른 질문 선택"
              >
                {plusOpen ? '✕' : '+'}
              </button>

              {/* 빠른 질문 팝업 */}
              {plusOpen && (
                <div style={{
                  position: 'absolute', bottom: 44, left: 0,
                  width: 240,
                  background: 'var(--bg-white)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                  zIndex: 10,
                }}>
                  {/* 팝업 헤더 */}
                  <div style={{
                    padding: '10px 14px 8px',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span>{mode === 'recommend' ? '🍽️' : '💬'}</span>
                    {mode === 'recommend' ? '빠른 메뉴 추천' : '자주 묻는 질문'}
                  </div>

                  {/* 질문 목록 */}
                  <div style={{ padding: '6px 0' }}>
                    {QUICK[mode].map(({ icon, text }) => (
                      <button key={text}
                        onClick={() => { send(text); setPlusOpen(false) }}
                        style={{
                          width: '100%', padding: '9px 14px',
                          border: 'none', background: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          fontSize: '.82rem', color: 'var(--text-primary)',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                        <span>{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 텍스트 입력 */}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'recommend' ? '메뉴 추천 요청...' : '앱 관련 질문...'}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 20,
                border: '1.5px solid var(--border-color)',
                fontSize: '.85rem',
                outline: 'none',
                background: loading ? 'var(--bg-surface)' : 'var(--bg-white)',
                transition: 'border-color .15s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />

            {/* 전송 버튼 */}
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                background: input.trim() && !loading ? 'var(--color-secondary)' : 'var(--bg-surface)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.85rem', fontWeight: 700, flexShrink: 0,
                transition: 'all .15s',
              }}
            >
              ➤
            </button>
          </div>

        </div>
      )}
    </>
  )
}
