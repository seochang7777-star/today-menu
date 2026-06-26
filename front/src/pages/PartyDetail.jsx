import io from 'socket.io-client'
import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getParty, joinParty } from '../api/services'
import { useAuth } from '../App'

const CAT_ICON = { 한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜', 치킨:'🍗', 피자:'🍕', 카페:'☕' }

export default function PartyDetail() {
  const { partyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const socket  = useRef(null)
  const chatRef = useRef(null)

  const [party,     setParty]     = useState(null)
  const [messages,  setMessages]  = useState([])
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState('info')

  // ── 파티 정보 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    getParty(partyId)
      .then((d) => { setParty(d); setMessages(d.messages ?? []) })
      .catch(() => navigate('/party'))
  }, [partyId])

  // ── 채팅 스크롤 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // ── 소켓 연결 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    socket.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    // 채팅방 입장
    socket.current.emit('join', {
      room_id:  partyId,
      username: user.nickname,
    })

    // 이전 메시지 수신
    socket.current.on('previous_messages', (msgs) => {
      setMessages(msgs)
    })

    // 실시간 메시지 수신
    socket.current.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.current.on('error', (err) => {
      console.error('소켓 오류:', err.message)
    })

    return () => {
      socket.current.emit('leave', { room_id: partyId, username: user.nickname })
      socket.current.disconnect()
    }
  }, [partyId, user])

  // ── 메시지 전송 ────────────────────────────────────────────────────────────
  const handleChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim() || !socket.current) return

    socket.current.emit('send_message', {
      room_id:   partyId,
      sender_id: user.user_id,   // ← DB 저장에 필요
      content:   chatInput,
    })
    setChatInput('')
  }

  if (!party) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>로딩 중...</div>
  )

  const isRecruiting = party.status === 'RECRUITING'
  const isMember     = party.is_member
  const pct = Math.min(Math.round((party.member_count / party.max_people) * 100), 100)

  const handleJoin = async () => {
    try {
      await joinParty(partyId)
      const d = await getParty(partyId)
      setParty(d); setMessages(d.messages ?? [])
    } catch (e) { alert(e.response?.data?.message ?? '오류가 발생했습니다.') }
  }

  const dummyReviews = [
    { nick: '김철수', score: 5, text: '분위기 좋고 음식도 맛있었어요! 다음에 또 참여하고 싶습니다.' },
    { nick: '이영희', score: 4, text: '밥친구들이 다 친절했어요. 메뉴 선택도 좋았습니다.' },
    { nick: '박민준', score: 5, text: '처음 참여했는데 부담 없이 즐길 수 있었어요.' },
  ]

  const tabs = [
    { key: 'info',   label: '파티 정보' },
    { key: 'chat',   label: `💬 채팅 ${messages.length > 0 ? `(${messages.length})` : ''}` },
    { key: 'review', label: '리뷰' },
  ]

  return (
    <>
      <Link to="/party" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>← 목록으로</Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* ── 메인 컬럼 ── */}
        <div>
          <div className="party-detail-hero">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem' }}>{CAT_ICON[party.restaurant?.category] ?? '🍴'}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginTop: 8 }}>배너</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <span className={`badge ${isRecruiting ? 'badge-success' : 'badge-muted'}`}>
                {isRecruiting ? '모집 중' : party.status === 'CLOSED' ? '마감' : '완료'}
              </span>
              {isMember && <span className="badge badge-info">✅ 참여 중</span>}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>{party.title}</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '.85rem', color: 'var(--text-muted)' }}>
              <span>🍽️ {party.restaurant?.name ?? '식당 없음'}</span>
              <span>👤 {party.host?.nickname}</span>
              <span>🕐 {party.meeting_time ? new Date(party.meeting_time).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''}</span>
            </div>
          </div>

          <div className="party-body-section" style={{ padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', fontWeight: 600, marginBottom: 8 }}>
              <span>모집 현황</span><span>{party.member_count}/{party.max_people}명</span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className={`progress-fill${party.member_count >= party.max_people ? ' full' : ''}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="tab-bar">
            {tabs.map(({ key, label }) => (
              <button key={key} className={`tab-btn${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}>{label}</button>
            ))}
          </div>

          {/* 파티 정보 탭 */}
          {activeTab === 'info' && (
            <div className="party-body-section">
              <h3 style={{ marginBottom: 14 }}>파티 소개</h3>
              <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                {party.title}에서 함께 식사할 분들을 모집합니다!<br />
                맛있는 음식과 좋은 사람들과 함께하는 식사 시간을 만들어 보세요.
              </p>
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius)', padding: 16 }}>
                {[
                  ['📍 장소',    party.restaurant?.name ?? '-'],
                  ['🕐 일시',    party.meeting_time ? new Date(party.meeting_time).toLocaleString('ko-KR') : '-'],
                  ['👥 인원',    `${party.member_count}/${party.max_people}명`],
                  ['🍽️ 카테고리', party.restaurant?.category ?? '-'],
                  ['👤 호스트',  party.host?.nickname ?? '-'],
                ].map(([label, val]) => (
                  <div key={label} className="party-info-row">
                    <span className="party-info-label">{label}</span>
                    <span className="party-info-value">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 채팅 탭 */}
          {activeTab === 'chat' && (
            <div className="party-body-section">
              <h3 style={{ marginBottom: 14 }}>💬 파티 채팅</h3>
              <div ref={chatRef}
                style={{ height: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, padding: '0 4px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: '.9rem' }}>
                    아직 대화가 없습니다. 먼저 인사해보세요! 👋
                  </div>
                ) : messages.map((msg, i) => {
                  const mine = msg.sender?.user_id === user?.user_id
                  return (
                    <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      {!mine && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{msg.sender?.nickname ?? '알 수 없음'}</div>}
                      <div style={{ padding: '9px 13px', borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: mine ? 'var(--color-secondary)' : 'var(--bg-surface)', color: mine ? '#fff' : 'var(--text-primary)', fontSize: '.88rem', lineHeight: 1.5 }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-light)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
              {isMember ? (
                <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="form-control" placeholder="메시지 입력..." required
                    value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ borderRadius: 24 }} />
                  <button type="submit" className="btn btn-dark" style={{ borderRadius: 24, whiteSpace: 'nowrap' }}>전송</button>
                </form>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>채팅은 파티 참여 후 이용 가능합니다</p>
              )}
            </div>
          )}

          {/* 리뷰 탭 */}
          {activeTab === 'review' && (
            <div className="party-body-section">
              <div className="flex-between mb-16">
                <h3>리뷰</h3>
                <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>총 {dummyReviews.length}개</span>
              </div>
              {dummyReviews.map((rev, i) => (
                <div key={i} className="party-review-card">
                  <div className="party-reviewer-avatar">{rev.nick[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{rev.nick}</span>
                      <span style={{ color: 'var(--color-accent)', fontSize: '.82rem' }}>{'★'.repeat(rev.score)}</span>
                    </div>
                    <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rev.text}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 14, fontSize: '.95rem' }}>이 파티에 어울리는 메뉴 추천</h4>
                <div className="party-recommend-grid">
                  {['삼겹살','파스타','초밥','치킨','비빔밥','짜장면'].map((menu) => (
                    <div key={menu} className="party-recommend-card">
                      <div className="party-recommend-thumb">{CAT_ICON['한식'] ?? '🍴'}</div>
                      <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{menu}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>인기 메뉴</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 사이드 컬럼 ── */}
        <div style={{ position: 'sticky', top: 'calc(var(--header-h) + var(--nav-h) + 16px)' }}>
          <div className="party-info-box" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>파티 참여</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{party.restaurant?.name ?? '식당'}</span>
              <span className={`badge ${isRecruiting ? 'badge-success' : 'badge-muted'}`}>
                {isRecruiting ? '모집중' : '마감'}
              </span>
            </div>
            {!isMember && isRecruiting && user && (
              <button className="btn btn-primary btn-block btn-lg" onClick={handleJoin}>
                🍽️ 파티 참여하기
              </button>
            )}
            {isMember && <button className="btn btn-secondary btn-block" disabled>✅ 이미 참여 중</button>}
            {!user && <Link to="/login" className="btn btn-primary btn-block">로그인 후 참여</Link>}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--text-muted)' }}>
              <span>참여 인원</span>
              <span style={{ fontWeight: 700 }}>{party.member_count}/{party.max_people}명</span>
            </div>
          </div>

          <div className="profile-section">
            <h3 style={{ marginBottom: 14 }}>👥 참여자 ({party.member_count}/{party.max_people})</h3>
            {(party.members ?? []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div className="avatar-sm">{m.user?.nickname?.[0] ?? '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{m.user?.nickname ?? '알 수 없음'}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.is_host ? '호스트' : '참여자'}</div>
                </div>
                {m.is_host && <span className="badge badge-primary">호스트</span>}
              </div>
            ))}
            {party.restaurant && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                <div className="form-label">약속 장소</div>
                <Link to={`/menu/${party.restaurant.id}`} style={{ fontSize: '.9rem', color: 'var(--color-info)', fontWeight: 600 }}>
                  🍽️ {party.restaurant.name}
                </Link>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{party.restaurant.address}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
