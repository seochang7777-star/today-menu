import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { sendChat } from '../api/services'

// ── 탭별 빠른 질문 ─────────────────────────────────────────────────────────────
const QUICK = {
  recommend: ['점심 뭐 먹을까요?', '매운 거 먹고 싶어요', '가볍게 먹고 싶어요', '혼밥 추천해줘'],
  qna:       ['찜 목록은 어떻게 쓰나요?', '파티 참여는 어떻게 하나요?', '취향 설정하고 싶어요', '매너점수가 뭔가요?'],
}

// ── 위치 취득 헬퍼 ────────────────────────────────────────────────────────────
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
  const [mode,       setMode]       = useState('recommend')  // 'recommend' | 'qna'
  const [messages,   setMessages]   = useState([])           // 현재 탭의 메시지
  const [histories,  setHistories]  = useState({ recommend: [], qna: [] }) // 탭별 히스토리 보존
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [userLoc,    setUserLoc]    = useState(null)         // { lat, lng } or null
  const [locStatus,  setLocStatus]  = useState('idle')       // idle | asking | granted | denied

  const endRef   = useRef(null)
  const inputRef = useRef(null)

  // 스크롤
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  // 열릴 때 포커스
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  // 탭 전환 시 해당 탭 히스토리 복원
  const switchMode = (newMode) => {
    if (newMode === mode) return
    // 현재 탭 히스토리 저장
    setHistories((h) => ({ ...h, [mode]: messages }))
    // 새 탭 히스토리 불러오기
    setMessages(histories[newMode])
    setMode(newMode)
    setInput('')
  }

  // 비회원이면 FAB 숨김
  if (!user) return null

  const addMsg = (role, content, extra = {}) =>
    setMessages((p) => [...p, { role, content, ...extra }])

  // ── 위치 요청 ─────────────────────────────────────────────────────────────
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

  // ── 메시지 전송 ───────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    addMsg('user', msg)
    setInput('')
    setLoading(true)

    // 추천 모드 + 위치 미취득 + 첫 추천 메시지 → 위치 자동 요청 후 전송
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
      const errMsg = e.response?.status === 401
        ? '로그인이 필요합니다.'
        : e.response?.data?.error ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      addMsg('assistant', errMsg, { isError: true })
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, mode, userLoc, locStatus])

  // ── 초기화 ────────────────────────────────────────────────────────────────
  const resetChat = () => {
    setMessages([])
    setHistories((h) => ({ ...h, [mode]: [] }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── 위치 아이콘 색상 ──────────────────────────────────────────────────────
  const locColor = locStatus === 'granted' ? '#68D391'
                 : locStatus === 'denied'  ? '#FC8181'
                 : 'rgba(255,255,255,.5)'

  // 웰컴 메시지 (탭별)
  const welcomeText = mode === 'recommend'
    ? `안녕하세요 ${user.nickname}님! 🍽️\n취향·찜 목록 기반으로 메뉴를 추천해드려요.\n먼저 등록된 장소 근처부터 찾아볼까요?`
    : `안녕하세요 ${user.nickname}님! 💬\n앱 사용법이나 기능에 대해 무엇이든 물어보세요.`

  return (
    <>
      {/* ── FAB 버튼 ── */}
      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? '챗봇 닫기' : 'AI 챗봇 열기'}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* ── 챗봇 창 ── */}
      {open && (
        <div className="chat-window" role="dialog" aria-label="AI 챗봇">

          {/* 헤더 */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: '1.2rem' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem', lineHeight: 1.2 }}>
                  {mode === 'recommend' ? 'AI 메뉴 추천' : 'Q&A 도우미'}
                </div>
                <div style={{ fontSize: '.72rem', opacity: .6 }}>
                  {user.nickname}님 맞춤 · GPT
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* 위치 상태 버튼 */}
              {mode === 'recommend' && (
                <button
                  onClick={requestLocation}
                  title={locStatus === 'granted' ? '위치 갱신' : '위치 허용하기'}
                  style={{
                    background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 6,
                    padding: '3px 8px', cursor: 'pointer', fontSize: '.72rem',
                    color: locColor, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  📍 {locStatus === 'granted' ? '위치 ON' : locStatus === 'asking' ? '확인 중...' : locStatus === 'denied' ? '위치 OFF' : '위치'}
                </button>
              )}
              <button
                onClick={resetChat}
                style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.72rem' }}
              >
                초기화
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 탭 — 메뉴 추천 | Q&A */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-white)', flexShrink: 0 }}>
            {[['recommend', '🍽️ 메뉴 추천'], ['qna', '💬 Q&A']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                style={{
                  flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                  fontSize: '.82rem', fontWeight: 700, background: 'none',
                  borderBottom: `2px solid ${mode === key ? 'var(--color-primary)' : 'transparent'}`,
                  color: mode === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 대화 영역 */}
          <div className="chat-body">
            {/* 웰컴 메시지 */}
            {messages.length === 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 12, fontSize: '.82rem', lineHeight: 1.7 }}>
                <div style={{ whiteSpace: 'pre-line', marginBottom: 10 }}>{welcomeText}</div>

                {/* 추천 모드: 위치 안내 */}
                {mode === 'recommend' && locStatus === 'idle' && (
                  <div style={{ background: '#EBF8FF', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: '.78rem', color: '#2B6CB0' }}>
                    📍 위치를 허용하면 <strong>반경 1km 내 식당</strong>을 우선 추천해드려요.
                    <button
                      onClick={requestLocation}
                      style={{ marginLeft: 8, background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '.75rem' }}
                    >
                      위치 허용
                    </button>
                  </div>
                )}
                {mode === 'recommend' && locStatus === 'granted' && (
                  <div style={{ background: '#F0FFF4', borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: '.78rem', color: '#276749' }}>
                    ✅ 위치 확인 완료! 현재 위치 근처 식당 기준으로 추천할게요.
                  </div>
                )}
                {mode === 'recommend' && locStatus === 'denied' && (
                  <div style={{ background: '#FFF5F5', borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: '.78rem', color: '#C53030' }}>
                    ⚠️ 위치 거부됨. 등록된 장소 기준으로 추천할게요.
                  </div>
                )}

                {/* 빠른 질문 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {QUICK[mode].map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      style={{
                        background: mode === 'recommend' ? '#EBF8FF' : '#F0FFF4',
                        color: mode === 'recommend' ? '#2B6CB0' : '#276749',
                        border: 'none', borderRadius: 14,
                        padding: '4px 10px', cursor: 'pointer', fontSize: '.75rem',
                      }}
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
                className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}
                style={{
                  whiteSpace: 'pre-wrap',
                  ...(m.isError ? { color: 'var(--color-danger)', background: '#FFF5F5' } : {}),
                }}
              >
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

          {/* 입력 영역 */}
          <div className="chat-foot">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'recommend' ? '메뉴 추천 요청...' : '앱 관련 질문...'}
              disabled={loading}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '.85rem', outline: 'none', background: loading ? 'var(--bg-surface)' : 'var(--bg-white)' }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} className="btn btn-dark btn-sm">
              전송
            </button>
          </div>

          {/* 비회원 안내 (혹시 user 없으면) */}
          {!user && (
            <div style={{ padding: '10px 14px', textAlign: 'center', fontSize: '.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>로그인</Link> 후 이용 가능합니다
            </div>
          )}
        </div>
      )}
    </>
  )
}
