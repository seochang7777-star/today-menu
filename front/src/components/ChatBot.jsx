import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { sendChat, fetchMe } from '../api/services'

// ── 탭별 빠른 질문 (+ 버튼 팝업으로 이동) ────────────────────────────────────
// ── 키워드 → 액션 링크 매핑 ─────────────────────────────────────────────────
const ACTION_LINKS = [
  {
    keywords: ['비밀번호', '패스워드', 'password'],
    link: '/findPassword',
    label: '🔑 비밀번호 찾기',
  },
  {
    keywords: ['이메일 찾기', '아이디 찾기', '이메일을 잊', '아이디를 잊', '이메일이 기억'],
    link: '/findid',
    label: '📧 이메일 찾기',
  },
  {
    keywords: ['프로필 수정', '닉네임 변경', '닉네임 수정', '정보 수정', '취향 변경',
      '알러지 변경', '알레르기 변경', '주소 변경', '성별 변경'],
    link: '/mypage/edit',
    label: '✏️ 프로필 수정',
  },
  {
    keywords: ['마이페이지', '찜 목록', '찜한 목록', '저장 장소', '활동 내역', '내 리뷰'],
    link: '/mypage',
    label: '👤 마이페이지',
  },
  {
    keywords: ['회원 탈퇴', '탈퇴'],
    link: '/mypage',
    label: '👤 마이페이지 (탈퇴)',
  },
  {
    keywords: ['공지사항'],
    link: '/notice',
    label: '📢 공지사항',
  },
  {
    keywords: ['고객센터', '문의', '1:1 문의'],
    link: '/support',
    label: '🛎️ 고객센터',
  },
  {
    keywords: ['파티 만들기', '파티 생성', '파티를 만'],
    link: '/party',
    label: '👥 파티 목록',
  },
  {
    keywords: ['게임', '룰렛', '월드컵', '스무고개', '뽑기'],
    link: '/game',
    label: '🎮 게임',
  },
]

// 응답 텍스트에서 관련 링크 추출
function extractActionLinks(text) {
  const found = []
  const lower = text.toLowerCase()
  for (const item of ACTION_LINKS) {
    if (item.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (!found.find(f => f.link === item.link)) {
        found.push({ link: item.link, label: item.label })
      }
    }
  }
  return found
}

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
    { icon: '🎲', text: '게임창 사용법 알려줘' },
    { icon: '👥', text: '파티 만드는 법 알려줘' },
    { icon: '❤️', text: '찜 목록 어떻게 쓰나요?' },
    { icon: '🌡️', text: '매너온도 올리는 방법은?' },
    { icon: '📍', text: '위치 기반 추천 어떻게 해요?' },
    { icon: '🎯', text: '내 취향 설정은 어디서 하나요?' },
    { icon: '💬', text: '파티 채팅은 어떻게 쓰나요?' },
    { icon: '🏆', text: '내 찜목록 보여줘' },
  ],
}

const CAT_ICON = {
  한식: '/img/category/korean.png',
  일식: '/img/category/japanese.webp',
  중식: '/img/category/chinese.webp',
  양식: '/img/category/steak.webp',
  분식: '/img/category/snack.webp',
  치킨: '/img/category/chicken.webp',
  카페: '/img/category/coffee.webp',
  술집: '/img/category/beer.webp'
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
  const [plusOpen, setPlusOpen] = useState(false)
  const [savedLocs, setSavedLocs] = useState([])
  const [locMode, setLocMode] = useState('current')
  const [locPicker, setLocPicker] = useState(false)
  const [wishlist, setWishlist] = useState([])
  const [mannerScore, setMannerScore] = useState(null)

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const plusRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      fetchMe().then((u) => {
        setSavedLocs(u.saved_locations ?? [])
        setMannerScore(u.manner_score ?? null)
      }).catch(() => { })
    }
  }, [open])

  useEffect(() => {
    if (!plusOpen) return
    const handler = (e) => {
      if (plusRef.current && !plusRef.current.contains(e.target)) setPlusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [plusOpen])

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-chatbot', handleOpen);
    return () => window.removeEventListener('open-chatbot', handleOpen);
  }, []);

  useEffect(() => {
    if (!locPicker) return
    const handler = (e) => {
      if (e.target.closest?.('[data-loc-picker]')) return
      setLocPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [locPicker])

  if (!user) return null

  const addMsg = (role, content, extra = {}) =>
    setMessages((p) => [...p, { role, content, ...extra }])

  const requestLocation = async () => {
    if (locStatus === 'granted') {
      setUserLoc(null)
      setLocStatus('idle')
      return null
    }
    setLocStatus('asking')
    const loc = await getLocation()
    if (loc) { setUserLoc(loc); setLocStatus('granted'); return loc }
    setLocStatus('denied'); return null
  }

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setPlusOpen(false)
    setLocPicker(false)
    addMsg('user', msg)
    setInput('')
    setLoading(true)

    let sendLat = null, sendLng = null, sendLocIndex = null

    if (mode === 'recommend') {
      if (locMode === 'current') {
        let loc = userLoc
        if (!loc && locStatus === 'idle') loc = await requestLocation()
        if (loc) { sendLat = loc.lat; sendLng = loc.lng }
      } else if (locMode.startsWith('saved_')) {
        sendLocIndex = parseInt(locMode.replace('saved_', ''), 10)
      }
    }

    try {
      const data = await sendChat(
        msg,
        messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
        mode, sendLat, sendLng, sendLocIndex,
      )
      const actionLinks = extractActionLinks(data.reply)
      addMsg('assistant', data.reply, { restaurants: data.restaurants ?? [], actionLinks })
      if (data.manner_score != null) setMannerScore(data.manner_score)
      if (data.wishlist) setWishlist(data.wishlist)
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

  return (
    <>
      {/* ── FAB ── */}
      {/* 아래 클래스명 뒤에 chatbot-toggle-btn 을 추가하여 메인 화면의 코드와 연동되도록 수정했습니다. */}
      <button
        className="
    chatbot-toggle-btn
  fixed bottom-7 right-2 z-[800]
  max-[540px]:bottom-5 max-[540px]:right-5
  flex h-[68px] w-[68px] items-center justify-center
  rounded-full
  border-0
  bg-transparent
  p-0
  shadow-[0_2px_17px_rgba(244,108,111,0.4)]
  transition-all duration-200
  hover:-translate-y-1
  hover:scale-105
  active:scale-95
  "
        onClick={() => {
          if (open) setHistories((h) => ({ ...h, [mode]: messages }))
          setOpen((o) => !o)
        }}
        aria-label="AI 챗봇"
      >
        <img
          src="/img/icon/logo.png"
          alt=""
          className="h-full w-full -translate-y-1 translate-x-1 object-contain"
        />
      </button>

      {/* ── 챗봇 창 ── */}
      {open && (
        <div className="chat-window" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* ── 헤더 ── */}
          <div className="chat-header" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src="/img/icon/logo.png"
                alt="오늘 뭐먹지?"
                style={{ height: 38, width: 38, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '.88rem', lineHeight: 1.2 }}>
                  {mode === 'recommend' ? 'AI 메뉴 추천' : 'Q&A 도우미'}
                </div>
                <div style={{ fontSize: '.72rem', opacity: .75, marginTop: 2 }}>
                  {user.nickname}님
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
                  <p className="whitespace-pre-line">
                    {mode === 'recommend'
                      ? `안녕하세요 ${user.nickname}님! 🍽️\n취향 기반으로 메뉴를 추천해드려요.\n왼쪽 + 버튼으로 빠른 질문을 선택할 수 있어요.`
                      : `안녕하세요 ${user.nickname}님!\n앱 사용법이 궁금하면 +버튼을 눌러보세요.`
                    }
                  </p>
                </div>
                {mode === 'recommend' && (
                  <div style={{ background: '#EBF8FF', borderRadius: 8, padding: '8px 10px', fontSize: '.76rem', color: '#2B6CB0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: savedLocs.length > 0 ? 6 : 0 }}>
                      <span>
                        📍 현재 선택:{' '}
                        <strong>
                          {locMode === 'current'
                            ? (locStatus === 'granted' ? '현재 위치 ✓' : 'GPS 현재 위치')
                            : locMode.startsWith('saved_')
                              ? savedLocs[parseInt(locMode.replace('saved_', ''), 10)]?.name ?? '저장 장소'
                              : '미선택'}
                        </strong>
                      </span>
                      <button onClick={() => setLocPicker((o) => !o)}
                        style={{ background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '.72rem', flexShrink: 0 }}>
                        변경
                      </button>
                    </div>
                    {savedLocs.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {savedLocs.map((loc, idx) => (
                          <button key={idx}
                            onClick={() => setLocMode(`saved_${idx}`)}
                            style={{
                              background: locMode === `saved_${idx}` ? '#2B6CB0' : 'rgba(43,108,176,.12)',
                              color: locMode === `saved_${idx}` ? '#fff' : '#2B6CB0',
                              border: 'none', borderRadius: 20, padding: '2px 10px',
                              fontSize: '.72rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                            {idx + 1}. {loc.name}
                          </button>
                        ))}
                        <button
                          onClick={async () => { setLocMode('current'); if (locStatus !== 'granted') await requestLocation() }}
                          style={{
                            background: locMode === 'current' ? '#2B6CB0' : 'rgba(43,108,176,.12)',
                            color: locMode === 'current' ? '#fff' : '#2B6CB0',
                            border: 'none', borderRadius: 20, padding: '2px 10px',
                            fontSize: '.72rem', fontWeight: 600, cursor: 'pointer',
                          }}>
                          📍 현재 위치
                        </button>
                      </div>
                    )}

                    {/* 위치 선택 드롭다운 */}
                    {locPicker && (
                      <div data-loc-picker="true" style={{
                        marginTop: 8,
                        background: 'var(--bg-white)', border: '1px solid var(--border-color)',
                        borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                      }}>
                        <button
                          onClick={async () => {
                            setLocMode('current')
                            setLocPicker(false)
                            if (locStatus !== 'granted') await requestLocation()
                          }}
                          style={{
                            width: '100%', padding: '9px 12px', border: 'none', cursor: 'pointer',
                            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                            background: locMode === 'current' ? '#F0FFF4' : 'none',
                            fontSize: '.82rem', fontWeight: locMode === 'current' ? 700 : 400,
                          }}>
                          <span>📍</span>
                          <span style={{ flex: 1 }}>현재 위치 (GPS)</span>
                          {locMode === 'current' && <span style={{ color: '#276749', fontSize: '.7rem' }}>✓</span>}
                        </button>
                        {savedLocs.map((loc, idx) => {
                          const key = `saved_${idx}`
                          const colors = ['#E53E3E', '#3182CE', '#38A169']
                          return (
                            <button key={idx}
                              onClick={() => { setLocMode(key); setLocPicker(false) }}
                              style={{
                                width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                                background: locMode === key ? '#EBF8FF' : 'none',
                                fontSize: '.82rem',
                              }}>
                              <span style={{ width: 18, height: 18, borderRadius: '50%', background: colors[idx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, flexShrink: 0 }}>
                                {idx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: locMode === key ? 700 : 500 }}>{loc.name}</div>
                                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.address}</div>
                              </div>
                              {locMode === key && <span style={{ color: '#2B6CB0', fontSize: '.7rem', flexShrink: 0 }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 메시지 */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}
                  style={{
                    whiteSpace: 'pre-wrap',
                    ...(m.isError ? { color: 'var(--color-danger)', background: '#FFF5F5' } : {}),
                  }}>
                  {m.content}
                </div>
                {m.role === 'assistant' && m.actionLinks?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 4px 4px' }}>
                    {m.actionLinks.map((al) => (
                      <Link
                        key={al.link}
                        to={al.link}
                        onClick={() => setOpen(false)}
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '6px 12px', borderRadius: 20,
                          background: 'var(--color-primary)',
                          color: '#fff', textDecoration: 'none',
                          fontSize: '.78rem', fontWeight: 700,
                          boxShadow: '0 2px 6px rgba(244,108,111,0.3)',
                        }}
                      >
                        {al.label} →
                      </Link>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && m.restaurants?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0 8px 4px', width: '82%', maxWidth: '82%' }}>
                    {m.restaurants.map((r) => (
                      <Link
                        key={r.id}
                        to={`/menu/${r.id}`}
                        onClick={() => setOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', boxSizing: 'border-box',
                          padding: '8px 12px',
                          background: 'var(--bg-white)',
                          border: '1.5px solid var(--color-primary)',
                          borderRadius: 10, textDecoration: 'none', color: 'inherit',
                          boxShadow: '0 2px 8px rgba(244,108,111,0.12)',
                          transition: 'box-shadow .15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(244,108,111,0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(244,108,111,0.12)'}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: 'var(--bg-surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem',
                        }}>
                          {CAT_ICON[String(r.category ?? '').trim()] ? (
                            <img
                              src={CAT_ICON[String(r.category ?? '').trim()]}
                              alt={r.category}
                              className="h-8 w-10 object-contain"
                              onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🍴')) }}
                            />
                          ) : (
                            <span>🍴</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 2 }}>{r.name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.category} · ⭐ {(r.avg_rating ?? 0).toFixed(1)} · {(r.address ?? '').slice(0, 18)}{(r.address?.length ?? 0) > 18 ? '...' : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '.72rem', color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>
                          상세보기 →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

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
                  <div style={{
                    padding: '10px 14px 8px',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span>{mode === 'recommend' ? '🍽️' : '💬'}</span>
                    {mode === 'recommend' ? '빠른 메뉴 추천' : '자주 묻는 질문'}
                  </div>

                  {mode === 'recommend' && wishlist.length > 0 && (
                    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ padding: '6px 14px 3px', fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        ❤️ 내 찜 목록으로 추천
                      </div>
                      {wishlist.slice(0, 3).map((name) => (
                        <button key={name}
                          onClick={() => { send(`${name} 근처 비슷한 메뉴 추천해줘`); setPlusOpen(false) }}
                          style={{
                            width: '100%', padding: '7px 14px',
                            border: 'none', background: 'none',
                            cursor: 'pointer', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: '.8rem', color: 'var(--color-primary)',
                            transition: 'background .1s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <span style={{ fontSize: '.9rem', flexShrink: 0 }}>❤️</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        </button>
                      ))}
                    </div>
                  )}

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
