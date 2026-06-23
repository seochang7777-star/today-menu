import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import {
  getParties, getParty, createParty,
  joinParty, sendPartyChat, getRestaurants,
} from '../api/services'

const STATUS_LABEL = { RECRUITING: '모집 중', CLOSED: '마감', COMPLETED: '완료' }
const STATUS_BADGE = { RECRUITING: 'badge-success', CLOSED: 'badge-muted', COMPLETED: 'badge-info' }

export default function Party() {
  const { user } = useAuth()

  // 목록
  const [parties,     setParties]     = useState([])
  const [status,      setStatus]      = useState('RECRUITING')
  const [listLoading, setListLoading] = useState(false)

  // 상세
  const [selected,    setSelected]    = useState(null)
  const [messages,    setMessages]    = useState([])
  const [chatInput,   setChatInput]   = useState('')
  const chatEndRef = useRef(null)

  // 파티 생성 폼
  const [showCreate,   setShowCreate]   = useState(false)
  const [restaurants,  setRestaurants]  = useState([])
  const [form, setForm] = useState({ title: '', restaurant_id: '', meeting_time: '', max_people: 4 })
  const [creating, setCreating] = useState(false)

  // ── 목록 조회 ──
  useEffect(() => {
    setListLoading(true)
    getParties({ status })
      .then(setParties)
      .catch(() => {})
      .finally(() => setListLoading(false))
  }, [status])

  // ── 식당 목록 (파티 생성용) ──
  useEffect(() => {
    if (showCreate && restaurants.length === 0) {
      getRestaurants({ cat: '전체', page: 1 })
        .then((d) => setRestaurants(d.items ?? []))
        .catch(() => {})
    }
  }, [showCreate, restaurants.length])

  // ── 채팅 스크롤 ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── 파티 상세 열기 ──
  const openParty = async (partyId) => {
    try {
      const data = await getParty(partyId)
      setSelected(data)
      setMessages(data.messages ?? [])
    } catch {}
  }

  // ── 참여 ──
  const handleJoin = async (e, partyId) => {
    e.stopPropagation()
    try {
      await joinParty(partyId)
      openParty(partyId)
      getParties({ status }).then(setParties)
    } catch (err) {
      alert(err.response?.data?.message ?? '오류가 발생했습니다.')
    }
  }

  // ── 채팅 전송 ──
  const handleChat = async () => {
    if (!chatInput.trim() || !selected) return
    try {
      const msg = await sendPartyChat(selected.party_id, chatInput)
      setMessages((prev) => [...prev, msg])
      setChatInput('')
    } catch {}
  }

  // ── 파티 생성 ──
  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createParty({
        ...form,
        restaurant_id: Number(form.restaurant_id),
        max_people:    Number(form.max_people),
      })
      setShowCreate(false)
      setForm({ title: '', restaurant_id: '', meeting_time: '', max_people: 4 })
      getParties({ status }).then(setParties)
    } catch (err) {
      alert(err.response?.data?.message ?? '오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleFormChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const pct = (p) => Math.min(Math.round((p.member_count / p.max_people) * 100), 100)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black">👥 밥친구 매칭</h1>
        {user ? (
          <button onClick={() => setShowCreate((s) => !s)} className="btn-primary">
            {showCreate ? '취소' : '+ 파티 만들기'}
          </button>
        ) : (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
            ⚠️ 파티 참여 및 생성은 회원 전용입니다
          </p>
        )}
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {Object.entries(STATUS_LABEL).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${status === s
                ? 'border-red-500 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${selected ? 'md:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
        {/* ── 왼쪽: 목록 + 생성 폼 ── */}
        <div className="space-y-3 min-w-0">

          {/* 파티 생성 폼 */}
          {showCreate && user && (
            <form onSubmit={handleCreate}
              className="card p-5 border-2 border-red-100 space-y-3">
              <h3 className="font-bold text-sm text-gray-800">🍽️ 새 파티 만들기</h3>

              <input required name="title" className="input"
                placeholder="파티 제목 *"
                value={form.title} onChange={handleFormChange} />

              <select required name="restaurant_id" className="input"
                value={form.restaurant_id} onChange={handleFormChange}>
                <option value="">식당 선택 *</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                ))}
              </select>

              <input required name="meeting_time" type="datetime-local" className="input"
                value={form.meeting_time} onChange={handleFormChange} />

              <input required name="max_people" type="number" min={2} max={10} className="input"
                placeholder="최대 인원"
                value={form.max_people} onChange={handleFormChange} />

              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? '생성 중...' : '파티 생성'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  취소
                </button>
              </div>
            </form>
          )}

          {/* 파티 목록 */}
          {listLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 h-28 animate-pulse bg-gray-50" />
            ))
          ) : parties.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-3">👥</p>
              <p className="text-sm">파티가 없습니다</p>
            </div>
          ) : (
            parties.map((p) => (
              <div
                key={p.party_id}
                onClick={() => openParty(p.party_id)}
                className={`card p-4 cursor-pointer ${
                  selected?.party_id === p.party_id ? 'border-red-300 shadow-md' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`badge ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.is_member && <span className="badge badge-primary">✅ 참여중</span>}
                    </div>
                    <p className="font-bold text-sm truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">🍽️ {p.restaurant?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      🕐 {p.meeting_time
                        ? new Date(p.meeting_time).toLocaleString('ko-KR', {
                            month: 'numeric', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : ''}{' '}
                      · 👤 {p.host?.nickname} · {p.member_count}/{p.max_people}명
                    </p>
                  </div>

                  {user && !p.is_member && p.status === 'RECRUITING' && (
                    <button
                      onClick={(e) => handleJoin(e, p.party_id)}
                      className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
                    >
                      참여
                    </button>
                  )}
                </div>

                {/* 진행바 */}
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      p.member_count >= p.max_people ? 'bg-red-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${pct(p)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── 오른쪽: 파티 상세 + 채팅 ── */}
        {selected && (
          <div className="card p-5 flex flex-col gap-4 h-fit sticky top-20">
            {/* 헤더 */}
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className={`badge ${STATUS_BADGE[selected.status]} mb-1`}>
                  {STATUS_LABEL[selected.status]}
                </span>
                <h3 className="font-bold mt-1">{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-0.5">
              <p>🍽️ {selected.restaurant?.name} · {selected.restaurant?.category}</p>
              <p>👤 {selected.host?.nickname} · {selected.member_count}/{selected.max_people}명</p>
              <p>🕐 {selected.meeting_time ? new Date(selected.meeting_time).toLocaleString('ko-KR') : ''}</p>
            </div>

            {/* 채팅 영역 */}
            <div className="bg-gray-50 rounded-xl p-3 h-56 overflow-y-auto flex flex-col gap-2">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-xs m-auto">아직 대화가 없습니다</p>
              ) : (
                messages.map((m, i) => {
                  const mine = m.sender?.user_id === user?.user_id
                  return (
                    <div key={i} className={`flex flex-col max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                      {!mine && (
                        <span className="text-[11px] text-gray-400 mb-0.5">{m.sender?.nickname}</span>
                      )}
                      <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        mine
                          ? 'bg-gray-900 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {m.content}
                      </div>
                      <span className="text-[10px] text-gray-300 mt-0.5">
                        {m.created_at ? new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 채팅 입력 */}
            {user && selected.is_member ? (
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="메시지 입력..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                />
                <button onClick={handleChat} className="btn-dark text-sm px-3">전송</button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-400">채팅은 파티 참여 후 이용 가능합니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
