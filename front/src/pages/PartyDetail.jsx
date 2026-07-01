import io from 'socket.io-client'
import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getParty, joinParty, voteManner, getMannerVoteStatus, closeParty } from '../api/services'
import { useAuth } from '../App'

const CAT_ICON = { 한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜', 치킨:'🍗', 피자:'🍕', 카페:'☕' }

export default function PartyDetail() {
  const { partyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const socket  = useRef(null)
  const chatRef = useRef(null)

  const [party,     setParty]     = useState(null)
  const [messages,  setMessages]  = useState([])
  const [chatInput, setChatInput] = useState('')
  const [activeTab,     setActiveTab]     = useState(searchParams.get('tab') === 'chat' ? 'chat' : 'info')
  const [voteRemaining, setVoteRemaining] = useState(2)
  const [votedToday,    setVotedToday]    = useState([])
  const [voteMsg,       setVoteMsg]       = useState('')

  const isRecruiting = party ? party.status === 'RECRUITING' : false;
  const isMember = party ? party.is_member : false;
  const pct = party ? Math.min(Math.round((party.member_count / party.max_people) * 100), 100) : 0;

  // ── 파티 정보 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    getParty(partyId)
      .then((d) => { setParty(d); setMessages(d.messages ?? []) })
      .catch(() => navigate('/party'))
  }, [partyId, navigate])

  // ── 채팅 스크롤 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // ── 소켓 연결 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!party || !isMember || !user) return;

    const isUserMember = party?.is_member;

    if (!user || !isMember) return

    socket.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    // 채팅방 입장
    socket.current.emit('join', {
      room_id:  partyId,
      username: user.nickname,
      sender_id: user.user_id,
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
      socket.current?.disconnect()
    }
  }, [partyId, user, isMember])

  // ── 메시지 전송 ────────────────────────────────────────────────────────────
    const handleTabClick = (key) => {
    if (key === 'chat' && !isMember) {
      alert("파티 참여자만 채팅을 이용할 수 있습니다.");
      return;
    }
    setActiveTab(key);
  }
  
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



  const handleVote = async (targetId, isPositive) => {
    if (voteRemaining <= 0) { setVoteMsg('오늘 투표 횟수(2회)를 모두 사용했습니다.'); return }
    try {
      const res = await voteManner(targetId, isPositive)
      setVoteMsg(res.message); setVoteRemaining(res.remaining)
      setVotedToday((prev) => [...prev, targetId])
      setTimeout(() => setVoteMsg(''), 3000)
    } catch (e) { setVoteMsg(e.response?.data?.message ?? '투표 실패'); setTimeout(() => setVoteMsg(''), 3000) }
  }
  const handleLeaveParty = async () => {
    if (!window.confirm('정말로 파티에서 퇴장하시겠습니까?')) return
    try { await api.delete(`/api/party/${partyId}/leave`); alert('파티에서 퇴장했습니다.'); navigate('/party') }
    catch (e) { alert(e.response?.data?.message || '퇴장 오류') }
  }
  const handleReport = async (targetId) => {
    const reason = window.prompt('신고 사유를 입력해주세요:')
    if (!reason?.trim()) return
    try { await api.post(`/api/party/${partyId}/report`, { target_id: targetId, reason }); alert('신고 접수됐습니다.') }
    catch (e) { alert(e.response?.data?.message || '신고 실패') }
  }
  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(newStatus === 'CLOSED' ? '모집을 마감하시겠습니까?' : '모집을 재개하시겠습니까?')) return
    try { await api.patch(`/api/party/${partyId}/status`, { status: newStatus }); const d = await getParty(partyId); setParty(d) }
    catch (e) { alert(e.response?.data?.message || '상태 변경 실패') }
  }
  const handleJoin = async () => {
    try {
      await joinParty(partyId);
      const d = await getParty(partyId);
      setParty(d); 
      setMessages(d.messages ?? []);
      
      setActiveTab('chat'); 
      alert("파티에 참여하였습니다! 채팅을 시작해보세요.");
    } catch (e) { 
      alert(e.response?.data?.message ?? '오류가 발생했습니다.'); 
    }
  }

  const handleCloseParty = async () => {
  if (!window.confirm("정말로 파티 모집을 마감하시겠습니까?")) return;
  try {
    const updatedParty = await closeParty(partyId);
    setParty(updatedParty); // 상태 업데이트로 즉시 UI 반영
    alert("파티가 마감되었습니다.");
  } catch (e) {
    alert(e.response?.data?.message ?? "마감 처리 중 오류가 발생했습니다.");
  }
};



  const dummyReviews = [
    { nick: '김철수', score: 5, text: '분위기 좋고 음식도 맛있었어요! 다음에 또 참여하고 싶습니다.' },
    { nick: '이영희', score: 4, text: '밥친구들이 다 친절했어요. 메뉴 선택도 좋았습니다.' },
    { nick: '박민준', score: 5, text: '처음 참여했는데 부담 없이 즐길 수 있었어요.' },
  ]

  const tabs = [
    { key: 'info',   label: '파티 정보' },
    ...(isMember ? [{ key: 'chat', label: `💬 채팅 ${messages.length > 0 ? `(${messages.length})` : ''}` }] : []),
    { key: 'review', label: '리뷰' },
  ]

  return (
    <>
      <Link to="/party" className="btn btn-secondary mb-4">← 목록으로</Link>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── 메인 컬럼 ── */}
        <div>
          <div className="party-detail-hero">
            <div className="text-center">
              <div className="text-6xl">{CAT_ICON[party.restaurant?.category] ?? '🍴'}</div>
              <div className="font-bold text-gray-500 mt-2">배너</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex gap-2 items-center flex-wrap mb-2">
              <span className={`badge ${isRecruiting ? 'badge-success' : 'badge-muted'}`}>
                {isRecruiting ? '모집 중' : party.status === 'CLOSED' ? '마감' : '완료'}
              </span>
              {isMember && <span className="badge badge-info">✅ 참여 중</span>}
            </div>
            <h2 className="text-2xl font-black mb-1.5">{party.title}</h2>
            <div className="flex gap-3 flex-wrap text-sm text-gray-500">
              <span>🍽️ {party.restaurant?.name ?? '식당 없음'}</span>
              <span>👤 {party.host?.nickname}</span>
              <span>🕐 {party.meeting_time ? new Date(party.meeting_time).toLocaleString('ko-KR') : ''}</span>
            </div>
          </div>

          <div className="party-body-section p-4 mb-4">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span>모집 현황</span><span>{party.member_count}/{party.max_people}명</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full bg-green-600 transition-all ${party.member_count >= party.max_people ? 'bg-red-500' : ''}`}
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
          {activeTab === 'chat' && isMember && (
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
                      <div style={{ padding: '9px 13px', borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: mine ? 'var(--color-primary)' : 'var(--bg-surface)', color: mine ? '#fff' : 'var(--text-primary)', fontSize: '.88rem', lineHeight: 1.5 }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-light)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                        {msg.created_at ? 
                          (() => {
                            // 1. 서버에서 받은 문자열을 Date 객체로 생성
                            const date = new Date(msg.created_at);
                            
                            // 2. 현재 시간에서 한국 시간대인 9시간(9 * 60 * 60 * 1000 밀리초)을 더함
                            // 이미 브라우저가 로컬 시간대로 해석했다면, UTC로 변환한 뒤 9시간을 더합니다.
                            const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                            
                            // 3. 시간 형식으로 변환
                            return kstDate.toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true 
                            });
                          })() 
                        : ''}
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
        <div className="sticky top-[166px]">
          <div className="party-info-box mb-4">
            <div className="text-xs text-gray-500 mb-1">파티 참여</div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-extrabold text-lg">{party.restaurant?.name ?? '식당'}</span>
              <span className={`badge ${isRecruiting ? 'badge-success' : 'badge-muted'}`}>
                {isRecruiting ? '모집중' : '마감'}
              </span>
            </div>

            {/* 1. 호스트 전용: 모집 중일 때 마감 버튼 */}
            {party.is_host && isRecruiting && (
              <button className="btn btn-warning btn-block" onClick={handleCloseParty} style={{ marginBottom: 10 }}>
                🚫 모집 마감하기
              </button>
            )}

            {/* 2. 참여자/호스트: 마감된 경우 채팅방 입장 */}
            {!isRecruiting && isMember && (
              <button className="btn btn-secondary btn-block" onClick={() => setActiveTab('chat')} style={{ marginBottom: 10 }}>
                💬 채팅방 입장하기
              </button>
            )}

            {/* 3. 일반 사용자/참여 대기: 참여하기 버튼 */}
            {!isMember && isRecruiting && user && (
              <button className="btn btn-primary btn-block btn-lg" onClick={handleJoin}>
                🍽️ 파티 참여하기
              </button>
            )}

            {/* 4. 이미 참여 중일 때 */}
            {isMember && isRecruiting && (
              <button className="btn btn-secondary btn-block" disabled>✅ 이미 참여 중</button>
            )}

            {/* 5. 비로그인 시 */}
            {!user && <Link to="/login" className="btn btn-primary btn-block">로그인 후 참여</Link>}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--text-muted)' }}>
              <span>참여 인원</span>
              <span style={{ fontWeight: 700 }}>{party.member_count}/{party.max_people}명</span>
            </div>
          </div>

          <div className="profile-section">
            <h3 style={{ marginBottom: 14 }}>👥 참여자 ({party.member_count}/{party.max_people})</h3>
            {voteMsg && (
              <div style={{fontSize:'.78rem',padding:'6px 10px',borderRadius:6,marginBottom:8,
                background:voteMsg.includes('모두')||voteMsg.includes('실패')?'#FFF5F5':'#F0FFF4',
                color:voteMsg.includes('모두')||voteMsg.includes('실패')?'#C53030':'#276749'}}>
                {voteMsg}
              </div>
            )}
            {user && voteRemaining > 0 && (
              <div style={{fontSize:'.72rem',color:'var(--text-muted)',marginBottom:8}}>
                오늘 남은 투표: <strong>{voteRemaining}회</strong>
              </div>
            )}
            {(party.members ?? []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div className="avatar-sm">{m.user?.nickname?.[0] ?? '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{m.user?.nickname ?? '알 수 없음'}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.is_host ? '호스트' : '참여자'}</div>
                </div>
                {m.is_host && <span className="badge badge-primary" style={{marginRight:4}}>호스트</span>}
              {party.is_host && !m.is_host && (
                <button 
                  onClick={() => {
                    if (window.confirm(`${m.user?.nickname}님을 정말로 강퇴하시겠습니까?`)) {
                      // 강퇴 API 함수 (기존에 구현하신 함수명으로 사용하세요)
                      // handleKick(m.user.user_id);
                    }
                  }}
                  style={{ marginRight: 8, fontSize: '0.7rem', padding: '2px 6px', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 4, cursor: 'pointer' }}
                >
                  강퇴
                </button>
              )}
              {user && m.user?.user_id !== user.user_id && (
                <div style={{display:'flex',gap:3,flexShrink:0}}>
                  <button onClick={() => handleVote(m.user.user_id, true)}
                    disabled={votedToday.includes(m.user?.user_id) || voteRemaining<=0}
                    title="매너 좋아요 +1°"
                    style={{border:'none',borderRadius:6,padding:'3px 7px',cursor:'pointer',
                      background:votedToday.includes(m.user?.user_id)?'#F0FFF4':'var(--bg-surface)',
                      fontSize:'.75rem',opacity:voteRemaining<=0&&!votedToday.includes(m.user?.user_id)?.4:1}}>
                    👍
                  </button>
                  <button onClick={() => handleVote(m.user.user_id, false)}
                    disabled={votedToday.includes(m.user?.user_id) || voteRemaining<=0}
                    title="매너 싫어요 -1°"
                    style={{border:'none',borderRadius:6,padding:'3px 7px',cursor:'pointer',
                      background:'var(--bg-surface)',fontSize:'.75rem',
                      opacity:voteRemaining<=0&&!votedToday.includes(m.user?.user_id)?.4:1}}>
                    👎
                  </button>
                </div>
              )}
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
