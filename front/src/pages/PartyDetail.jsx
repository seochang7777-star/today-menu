import io from 'socket.io-client'
import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getParty, joinParty, voteManner, getMannerVoteStatus, getReviews } from '../api/services'
import api from '../api/axiosInstance.js'
import { useAuth } from '../App'
import RestaurantImage from '../components/RestaurantImage'

const CAT_ICON = { 한식: '🍚', 일식: '🍣', 중식: '🥟', 양식: '🥩', 분식: '🍜', 치킨: '🍗', 피자: '🍕', 카페: '☕' }

export default function PartyDetail() {
  const { partyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const socket = useRef(null)
  const chatRef = useRef(null)

  const [party, setParty] = useState(null)
  const [reviews, setReviews] = useState([])
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'chat' ? 'chat' : 'info')
  const [voteRemaining, setVoteRemaining] = useState(2)
  const [votedToday, setVotedToday] = useState([])
  const [voteMsg, setVoteMsg] = useState('')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [targetReportId, setTargetReportId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  const isRecruiting = party ? party.status === 'RECRUITING' : false;
  const isMember = party ? party.is_member : false;
  const pct = party ? Math.min(Math.round((party.member_count / party.max_people) * 100), 100) : 0;
  const isHost = user && party ? party.host?.user_id === user.user_id : false;
  const hasMembers = party ? party.members.length > 1 : false;

  const openReportModal = (userId) => {
    setTargetReportId(userId);
    setIsReportModalOpen(true);
  };

  // ── 파티 정보 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    getParty(partyId)
      .then((d) => {
        setParty(d)
        setMessages(d.messages ?? [])
        if (d?.restaurant?.id) {
          getReviews(d.restaurant.id)
            .then(rv => setReviews(rv?.reviews || []))
            .catch(() => {})
        }
      })
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

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    socket.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    // 채팅방 입장
    socket.current.emit('join', {
      room_id: partyId,
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

    // 새 파티원 참여 알림
    socket.current.on('party_member_joined', (data) => {
      setParty(prev => prev ? { ...prev, member_count: data.member_count } : prev)
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
      room_id: partyId,
      sender_id: user.user_id,   // ← DB 저장에 필요
      content: chatInput,
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
  const handleKick = async (targetUserId) => {
    try {
      await api.delete(`/api/party/${partyId}/kick/${targetUserId}`)
      alert('강퇴 처리가 완료되었습니다.')
      const d = await getParty(partyId); setParty(d)
    } catch (e) { alert(e?.response?.data?.message || '강퇴 실패') }
  }

  const handleLeaveParty = async () => {
    if (!window.confirm('정말로 파티에서 퇴장하시겠습니까?')) return
    try { await api.delete(`/api/party/${partyId}/leave`); alert('파티에서 퇴장했습니다.'); navigate('/party') }
    catch (e) { alert(e.response?.data?.message || '퇴장 오류') }
  }

  const handleReport = async (targetId, reason) => {
    if (!reason?.trim()) return alert("신고 사유를 입력해주세요.");

    try {
      const response = await api.post(`/api/party/${partyId}/report`, {
        target_id: targetId,
        reason: reason
      });

      if (response.data.kicked) {
        alert("신고가 3회 누적되어 해당 사용자가 강제 퇴장되었습니다.");
      } else {
        alert("신고가 접수되었습니다.");
      }

      setIsReportModalOpen(false);
      setReportReason('');

      const updatedParty = await getParty(partyId);
      setParty(updatedParty);

    } catch (e) {
      alert(e.response?.data?.message || "신고 처리에 실패했습니다.");
      setIsReportModalOpen(false);
    }
  };

  const handleCancelParty = async () => {
    if (party.members && party.members.length > 1) {
      alert('이미 다른 파티원이 참여 중입니다. 먼저 파티원을 내보내거나 강퇴한 후 취소할 수 있습니다.');
      return;
    }

    if (!window.confirm('파티를 취소하시겠습니까? 취소 후에는 복구할 수 없습니다.')) return;

    try {
      const response = await api.patch(`/api/party/${partyId}/cancel`);

      alert(response.data.message || '파티가 취소되었습니다.');
      navigate('/party');

    } catch (e) {
      const errMsg = e.response?.data?.message || '파티 취소 중 오류가 발생했습니다.';
      alert(errMsg);
    }
  };

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
    if (!window.confirm('정말로 파티 모집을 마감하시겠습니까?')) return
    try {
      await api.patch(`/api/party/${partyId}/status`, { status: 'CLOSED' })
      const d = await getParty(partyId); setParty(d)
      alert('파티가 마감되었습니다.')
    } catch (e) {
      alert(e.response?.data?.message || '마감 처리 중 오류가 발생했습니다.')
    }
  }

  const handleFinishParty = async () => {
    if (!window.confirm("파티를 종료하시겠습니까? 종료 후에는 멤버들의 매너 점수를 평가할 수 있습니다.")) return;
    try {
      await (partyId);
      alert("파티가 종료되었습니다.");
      const d = await getParty(partyId);
      setParty(d);
    } catch (e) {
      alert("파티 종료 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteParty = async () => {
    if (hasMembers) {
      alert("참여 중인 파티원이 있어 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("정말로 파티를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    try {
      await api.delete(`/api/party/${partyId}`);
      alert("파티가 삭제되었습니다.");
      navigate('/party');
    } catch (e) {
      alert(e.response?.data?.message || "삭제 실패");
    }
  };

  const handleJoinParty = async () => {
    await handleJoin();
  };



  const tabs = [
    { key: 'info', label: '파티 정보' },
    ...(isMember ? [{ key: 'chat', label: `채팅 ${messages.length > 0 ? `(${messages.length})` : ''}` }] : []),
    { key: 'review', label: '리뷰' },
  ]

  return (
    <>

      <div className="mx-auto max-w-[1134px] pb-12">
        <section className="overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
          <div className="relative h-[220px] overflow-hidden sm:h-[260px] lg:h-[300px]">
            <RestaurantImage
              imageUrl={party.restaurant?.image_url ?? party.restaurant?.image}
              category={party.restaurant?.category}
              name={party.restaurant?.name}
              height="100%"
              iconSize="5rem"
            />

            {/* 뒤로가기 버튼 */}
            <button
              type="button"
              onClick={() => navigate('/menu')}
              aria-label="목록으로 이동"
              className="absolute top-4 left-4 z-20 transition hover:scale-160"
            >
              <img
                src="/img/icon/arrow_left.png" alt="뒤로가기"
                className="h-10 w-10"
              />
            </button>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 items-start lg:grid-cols-[300px_1fr]">
          <main className="order-2 min-w-0">
            <div className="mb-4">
              <div className="flex gap-1.5 items-center flex-wrap mb-2">
                {/* 1. 모집 상태 배지 */}
                <span
                  className={`px-2.5 py-0.5 rounded-[6px] text-[0.75rem] font-extrabold tracking-tight ${isRecruiting
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' // 모집 중 (싱그러운 초록색)
                    : party.status === 'CLOSED'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' // 마감 (차분한 주황색)
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' // 완료 (흐린 회색)
                    }`}
                >
                  {isRecruiting ? '모집 중' : party.status === 'CLOSED' ? '모집 마감' : '파티 완료'}
                </span>

                {/* 2. 참여 중 배지 (내가 속한 파티) */}
                {isMember && (
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 rounded-[6px] text-[0.75rem] font-extrabold tracking-tight flex items-center gap-0.5">
                    <span>✅</span> 참여 중
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black mb-1.5">{party.title}</h2>
              <div className="flex gap-3 flex-wrap text-sm text-gray-500">

                <span><div className="flex items-center gap-2">

                  <button
                    type="button"
                    style={{
                      backgroundColor: '#F3E7DD',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                    }}
                    className="rounded-xs text-[0.85rem] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#EAD8C9]"

                    onClick={() => navigate(`/menu/${party.restaurant.id}`)}

                  >🍴
                    {party.restaurant.name}
                  </button>

                  <span>👤{party.host?.nickname}</span>

                </div> </span>
                <span>🕐 {party.meeting_time ? new Date(party.meeting_time).toLocaleString('ko-KR') : ''}</span>
              </div>
            </div>

            <div className="party-body-section p-4 mb-4">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>모집 현황</span><span>{party.member_count}/{party.max_people}명</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: '#E84F55',
                  }}
                />
              </div>
            </div>

            <div className="tab-bar">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  className={`tab-btn${activeTab === key ? ' active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 파티 정보 탭 */}
            {activeTab === 'info' && (
              <div className="rounded-[10px] border border-[#FFC8C4] bg-white p-8">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-[#221517]">
                  <span className="text-2xl">🎉</span>
                  파티 소개
                </h3>

                <div className="grid gap-4 rounded-[8px] bg-[#FEF4F3] p-5 lg:grid-cols-[1fr_1.35fr]">
                  <div className="flex flex-col justify-center">
                    <h4 className="mb-4 text-base font-black leading-7 text-[#221517]">
                      {party.title}에서 함께 식사할 분들을 모집합니다!
                    </h4>

                    <p className="text-sm font-semibold leading-7 text-[#5C4B50]">
                      맛있는 음식과 좋은 사람들과 함께
                      <br />
                      즐거운 식사 시간을 만들어 보세요 😊
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['📍', '장소', party.restaurant?.name ?? '-'],
                      [
                        '🕐',
                        '일시',
                        party.meeting_time
                          ? new Date(party.meeting_time).toLocaleString('ko-KR')
                          : '-',
                      ],
                      [<svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 fill-[#F46C6F]"
                      >
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                      </svg>, '인원', `${party.member_count} / ${party.max_people}명`],
                      ['🏳️', '카테고리', party.restaurant?.category ?? '-'],
                    ].map(([icon, label, val]) => (
                      <div
                        key={label}
                        className="grid min-h-[66px] grid-cols-[34px_1fr] items-center gap-2 rounded-[7px] border border-[#F9E1DD] bg-white px-4 py-3 shadow-[0_12px_26px_rgba(244,108,111,0.22)]"
                      >
                        <span className="text-xl leading-none text-[#FF4F64]">
                          {icon}
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-black leading-4 text-[#4B393D]">
                            {label}
                          </div>
                          <div className="mt-1 break-words text-sm font-black leading-5 text-[#171113]">
                            {val}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 채팅 탭 */}
            {activeTab === 'chat' && isMember && (
              <div className="rounded-[10px] border border-[#FFC8C4] bg-white p-8">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-[#221517]">
                  <img src="/img/icon/logo.png" alt="오늘 뭐먹지?" className="h-6 w-6 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }} />
                  파티 채팅
                </h3>

                <div ref={chatRef}
                  style={{
                    height: 340,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: messages.length === 0 ? 'center' : 'flex-start',
                    gap: 20,
                    marginBottom: 14,
                    padding: '0 4px',
                  }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: '.9rem' }}>
                      아직 대화가 없습니다. 먼저 인사해보세요!

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
                  <form onSubmit={handleChat} className="flex gap-2">
                    <input type="text" className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-[rgba(244,108,111,0.8)] bg-white px-5 text-[0.92rem] font-semibold text-[var(--text-primary)] shadow-[0_4px_18px_rgba(244,108,111,0.08)] outline-none 
                    placeholder= 메시지 입력..."
                      required
                      value={chatInput} onChange={(e) => setChatInput(e.target.value)} />

                    <button
                      type="submit"
                      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-0 bg-[linear-gradient(135deg,var(--color-primary),#F98082)] shadow-[0_4px_18px_rgba(244,108,111,0.16)] transition hover:brightness-105 hover:shadow-md"
                    >
                      <img
                        src="/img/icon/send.png"
                        alt="전송"
                        className="h-6 w-6 object-contain"
                      />
                    </button>
                  </form>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>채팅은 파티 참여 후 이용 가능합니다</p>
                )}
              </div>
            )}

            {/* 리뷰 탭 */}
            {activeTab === 'review' && (
              <div className="rounded-[10px] border border-[#FFC8C4] bg-white p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xl font-black text-[#221517]">
                    <span className="text-2xl">⭐</span>
                    리뷰
                  </h3>
                  <span className="text-[0.82rem] text-[var(--text-muted)]">총 {reviews.length}개</span>
                </div>
                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', textAlign: 'center', padding: '16px 0' }}>아직 리뷰가 없습니다</p>
                ) : (
                  reviews.map((rev, i) => (
                    <div key={rev.review_id || i} className="party-review-card">
                      <div className="party-reviewer-avatar">{(rev.nickname || '?')[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{rev.nickname || '익명'}</span>
                          <span style={{ color: 'var(--color-accent)', fontSize: '.82rem' }}>{'★'.repeat(Math.round(rev.rating || 0))}</span>
                        </div>
                        <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rev.content}</p>
                        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{rev.created_at}</span>
                      </div>
                    </div>
                  ))
                )}
              
              </div>
            )}

            {/* ── 사이드 컬럼 ── */}
          </main>
          <aside className="order-1 space-y-4">
            <div className="party-info-box mb-4">
              <div className="text-xs text-gray-500 mb-1">파티 참여</div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-extrabold text-lg">{party.restaurant?.name ?? '식당'}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${isRecruiting
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {isRecruiting ? "모집 중" : "모집마감"}
                </span>
              </div>

              {/* 호스트 전용: 파티 종료 */}
              {party.is_host && party.status === 'CLOSED' && (
                <button
                  onClick={async () => {
                    if (!window.confirm('파티를 종료하시겠습니까?')) return
                    try {
                      await api.patch(`/api/party/${partyId}/finish`)
                      alert('파티가 종료되었습니다.')
                      navigate('/party')
                    } catch (e) { alert(e.response?.data?.message || '종료 실패') }
                  }}
                  style={{
                    width: '100%', marginBottom: 8, padding: '10px 0',
                    background: 'var(--color-secondary)', color: '#fff',
                    border: 'none', borderRadius: 8,
                    fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  🏁 파티 종료하기
                </button>
              )}

              {/* 호스트 전용: 파티 취소 */}
              {party.is_host && party.status !== 'COMPLETED' && (
                <button
                  onClick={handleCancelParty}
                  className="w-full rounded-[8px] bg-[var(--color-primary)] mb-3 px-4 py-3 font-black text-white transition hover:bg-[var(--color-primary-dark)]"
                >
                  파티 취소하기
                </button>
              )}

              {/* 1. 호스트 전용: 모집 중일 때 마감 버튼 */}
              {party.is_host && isRecruiting && (
                <button
                  onClick={handleStatusChange.bind(null, 'CLOSED')}
                  className="w-full rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 font-black text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-2)]"
                >
                  모집 마감하기
                </button>
              )}

              {/* 2. 일반 사용자/참여자 액션 영역 */}
              {!isHost && (
                <div className="mt-4">
                  {!user ? (
                    <Link
                      to="/login"
                      className="block w-full text-center mb-2 py-[10px] bg-[var(--color-primary)] text-white rounded-[8px] text-sm font-bold transition-colors hover:bg-[var(--color-primary-dark)]"
                    >
                      로그인 후 참여
                    </Link>
                  ) : isMember ? (
                    <div className="flex flex-col gap-2">
                      <button className="btn btn-secondary btn-block" disabled>✅ 참여 중</button>
                      {!isRecruiting && (
                        <button className="btn btn-info btn-block" onClick={() => setActiveTab('chat')}>
                          💬 채팅방 입장
                        </button>
                      )}
                    </div>
                  ) : isRecruiting ? (
                    <button className="btn btn-primary btn-block btn-lg" onClick={handleJoin}>
                      🍴 파티 참여하기
                    </button>
                  ) : (
                    <button className="btn btn-muted btn-block" disabled>모집 마감</button>
                  )}
                </div>
              )}

            </div>

            <div className="profile-section">
              <div className="flex items-center justify-between mb-3.5">
                {/* 타이틀은 단단하고 깔끔한 기본 텍스트 색상 */}
                <h3 className="text-base font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                  <sapn><svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 fill-[#F46C6F]"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg></sapn> 참여 인원
                </h3>

                {/* 보여주신 하단 스타일처럼 튀지 않고 은은하게 매칭한 인원수 표시 */}
                <span className="text-[0.82rem] font-bold text-[var(--text-muted)]">
                  {party.member_count} / {party.max_people}명
                </span>
              </div>
              {voteMsg && (
                <div style={{
                  fontSize: '.78rem', padding: '6px 10px', borderRadius: 6, marginBottom: 8,
                  background: voteMsg.includes('모두') || voteMsg.includes('실패') ? '#FFF5F5' : '#F0FFF4',
                  color: voteMsg.includes('모두') || voteMsg.includes('실패') ? '#C53030' : '#276749'
                }}>
                  {voteMsg}
                </div>
              )}
              {user && voteRemaining > 0 && (
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  오늘 남은 투표: <strong>{voteRemaining}회</strong>
                </div>
              )}
              {(party.members ?? []).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="avatar-sm">{m.user?.nickname?.[0] ?? '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{m.user?.nickname ?? '알 수 없음'}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{m.is_host ? '호스트' : '참여자'}</div>
                  </div>


                  {/* 호스트가 타인 강퇴 */}
                  {user && party.is_host && !m.is_host && (
                    <button
                      onClick={() => {
                        if (window.confirm(`${m.user?.nickname}님을 정말로 강퇴하시겠습니까?`)) {
                          handleKick(m.user.user_id)
                        }
                      }}
                      style={{
                        marginRight: 4, fontSize: '0.72rem', padding: '3px 8px',
                        color: 'var(--color-danger)', border: '1px solid var(--color-danger)',
                        borderRadius: 6, cursor: 'pointer', background: 'transparent', fontWeight: 700
                      }}
                    >
                      강퇴
                    </button>
                  )}
                  {user && m.user?.user_id !== user.user_id && isMember && (
                    <button
                      onClick={() => openReportModal(m.user.user_id)}
                      className="text-xs text-red-500 border border-red-500 rounded px-2"
                      style={{
                        marginRight: 4, fontSize: '0.72rem', padding: '3px 8px',
                        color: 'var(--color-danger)', border: '1px solid var(--color-danger)',
                        borderRadius: 6, cursor: 'pointer', background: 'transparent', fontWeight: 700
                      }}>
                      신고

                    </button>
                  )}


                  {/* 일반 참여자 본인 탈퇴 버튼 */}
                  {user && !party.is_host && m.user?.user_id === user.user_id && (
                    <button
                      onClick={handleLeaveParty}
                      style={{
                        marginRight: 4, fontSize: '0.72rem', padding: '3px 8px',
                        color: 'var(--text-muted)', border: '1px solid var(--border-color)',
                        borderRadius: 6, cursor: 'pointer', background: 'transparent', fontWeight: 700
                      }}
                    >
                      탈퇴

                    </button>
                  )}

                  {/* 호스트 본인 행 — 파티 중단(취소) 버튼 */}
                  {user && party.is_host && m.user?.user_id === user.user_id && party.status !== 'COMPLETED' && (
                    <button
                      onClick={() => {
                        // 파티원(본인 포함)이 1명 초과일 때(즉, 다른 사람이 있을 때) 경고
                        if (party.members.length > 1) {
                          alert('다른 파티원이 참여 중이므로 파티를 중단할 수 없습니다. 강퇴하거나 멤버가 모두 나간 뒤 시도해주세요.');
                          return;
                        }
                        handleCancelParty();
                      }}
                      style={{
                        marginRight: 4,
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        // 파티원이 있을 때는 회색(비활성 느낌), 없으면 빨간색(활성)
                        color: party.members.length > 1 ? '#999' : 'var(--color-danger)',
                        border: `1px solid ${party.members.length > 1 ? '#ccc' : 'var(--color-danger)'}`,
                        borderRadius: 6,
                        cursor: party.members.length > 1 ? 'not-allowed' : 'pointer',
                        background: 'transparent',
                        fontWeight: 700
                      }}
                    >
                      {party.members.length > 1 ? '중단 불가' : '파티중단'}
                    </button>
                  )}

                  {user && m.user?.user_id !== user.user_id && (
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button onClick={() => handleVote(m.user.user_id, true)}
                        disabled={votedToday.includes(m.user?.user_id) || voteRemaining <= 0}
                        title="매너 좋아요 +1°"
                        style={{
                          border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer',
                          background: votedToday.includes(m.user?.user_id) ? '#F0FFF4' : 'var(--bg-surface)',
                          fontSize: '.75rem', opacity: voteRemaining <= 0 && !votedToday.includes(m.user?.user_id) ? .4 : 1
                        }}>
                        👍
                      </button>
                      <button onClick={() => handleVote(m.user.user_id, false)}
                        disabled={votedToday.includes(m.user?.user_id) || voteRemaining <= 0}
                        title="매너 싫어요 -1°"
                        style={{
                          border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer',

                          background: 'var(--bg-surface)', fontSize: '.75rem',
                          opacity: voteRemaining <= 0 && !votedToday.includes(m.user?.user_id) ? .4 : 1
                        }}>
                        👎
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {party.restaurant && (
                <div style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid var(-border-color)' }}>
                  <div className="form-label">약속 장소</div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>

                    <button
                      type="button"
                      style={{
                        backgroundColor: '#F3E7DD',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                      }}
                      className="rounded-xs text-[0.85rem] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#EAD8C9]"

                      onClick={() => navigate(`/menu/${party.restaurant.id}`)}

                    >
                      {party.restaurant.name}
                    </button>
                  </div>
                  <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{party.restaurant.address}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      {isReportModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="font-bold mb-4">사용자 신고</h3>
            <textarea
              className="form-control w-full mb-4"
              placeholder="신고 사유를 입력하세요"
              value={reportReason} // 상태값 연결
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsReportModalOpen(false)} className="btn btn-secondary">취소</button>
              <button
                onClick={() => handleReport(targetReportId, reportReason)}
                className="btn btn-danger"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
