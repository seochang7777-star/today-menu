import { useState, useEffect } from 'react'
import { getParties, getParty, createParty, joinParty, sendPartyChat, getRestaurants } from '../api/services'
import { useAuth } from '../App'

export default function Party() {
  const { user } = useAuth()
  const [parties,    setParties]   = useState([])
  const [status,     setStatus]    = useState('RECRUITING')
  const [selected,   setSelected]  = useState(null)   // 상세 파티
  const [messages,   setMessages]  = useState([])
  const [chatInput,  setChatInput] = useState('')
  const [showCreate, setShowCreate]= useState(false)
  const [restaurants,setRestaurants]= useState([])
  const [form, setForm] = useState({ title:'', restaurant_id:'', meeting_time:'', max_people: 4 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getParties({ status }).then(setParties).catch(() => {})
  }, [status])

  useEffect(() => {
    if (showCreate) getRestaurants({ cat: '전체' }).then(d => setRestaurants(d.items ?? [])).catch(() => {})
  }, [showCreate])

  const openParty = async (partyId) => {
    const data = await getParty(partyId)
    setSelected(data)
    setMessages(data.messages || [])
  }

  const handleJoin = async (partyId) => {
    try {
      await joinParty(partyId)
      openParty(partyId)
      getParties({ status }).then(setParties)
    } catch (e) {
      alert(e.response?.data?.message ?? '오류가 발생했습니다.')
    }
  }

  const handleChat = async () => {
    if (!chatInput.trim() || !selected) return
    try {
      const msg = await sendPartyChat(selected.party_id, chatInput)
      setMessages(prev => [...prev, msg])
      setChatInput('')
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createParty({ ...form, restaurant_id: Number(form.restaurant_id), max_people: Number(form.max_people) })
      setShowCreate(false)
      setForm({ title:'', restaurant_id:'', meeting_time:'', max_people: 4 })
      getParties({ status }).then(setParties)
    } catch (e) {
      alert(e.response?.data?.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black">👥 밥친구 매칭</h1>
        {user
          ? <button onClick={() => setShowCreate(s => !s)} className="btn-primary">+ 파티 만들기</button>
          : <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg">⚠️ 파티 참여/생성은 회원 전용입니다</p>
        }
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {['RECRUITING','CLOSED','COMPLETED'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${status === s ? 'border-red-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {s === 'RECRUITING' ? '모집 중' : s === 'CLOSED' ? '마감' : '완료'}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${selected ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* 파티 목록 */}
        <div className="space-y-3">
          {/* 파티 생성 폼 */}
          {showCreate && user && (
            <form onSubmit={handleCreate} className="card p-5 border-2 border-red-100 space-y-3">
              <h3 className="font-bold text-sm">🍽️ 새 파티 만들기</h3>
              <input required className="input" placeholder="파티 제목 *"
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <select required className="input" value={form.restaurant_id}
                onChange={e => setForm({...form, restaurant_id: e.target.value})}>
                <option value="">식당 선택 *</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name} ({r.category})</option>)}
              </select>
              <input required type="datetime-local" className="input"
                value={form.meeting_time} onChange={e => setForm({...form, meeting_time: e.target.value})} />
              <input required type="number" min={2} max={10} className="input" placeholder="최대 인원"
                value={form.max_people} onChange={e => setForm({...form, max_people: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? '생성 중...' : '파티 생성'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">취소</button>
              </div>
            </form>
          )}

          {parties.length === 0
            ? <div className="text-center py-16 text-gray-400"><div className="text-5xl mb-3">👥</div><p>파티가 없습니다</p></div>
            : parties.map(p => (
                <div key={p.party_id} onClick={() => openParty(p.party_id)}
                  className={`card p-4 cursor-pointer ${selected?.party_id === p.party_id ? 'border-red-300' : ''}`}>
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className={`badge ${p.status === 'RECRUITING' ? 'badge-success' : 'badge-info'} mb-1`}>
                        {p.status === 'RECRUITING' ? '모집 중' : p.status}
                      </span>
                      <p className="font-bold text-sm mt-1 truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">🍽️ {p.restaurant?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        🕐 {p.meeting_time ? new Date(p.meeting_time).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                        &nbsp;· 👤 {p.host?.nickname} · {p.member_count}/{p.max_people}명
                      </p>
                    </div>
                    {user && !p.is_member && p.status === 'RECRUITING' && (
                      <button onClick={e => { e.stopPropagation(); handleJoin(p.party_id) }}
                        className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
                        참여
                      </button>
                    )}
                    {p.is_member && <span className="badge badge-success flex-shrink-0">✅ 참여중</span>}
                  </div>
                  {/* 진행바 */}
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.member_count >= p.max_people ? 'bg-red-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min((p.member_count / p.max_people) * 100, 100)}%` }} />
                  </div>
                </div>
              ))
          }
        </div>

        {/* 파티 상세 + 채팅 */}
        {selected && (
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500">🍽️ {selected.restaurant?.name} · 👤 {selected.host?.nickname} · {selected.member_count}/{selected.max_people}명</p>

            {/* 채팅 */}
            <div className="flex-1 bg-gray-50 rounded-xl p-3 h-56 overflow-y-auto flex flex-col gap-2">
              {messages.length === 0
                ? <p className="text-center text-gray-400 text-sm my-auto">아직 대화가 없습니다</p>
                : messages.map((m, i) => {
                    const mine = m.sender?.user_id === user?.user_id
                    return (
                      <div key={i} className={`flex flex-col max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                        {!mine && <span className="text-xs text-gray-400 mb-0.5">{m.sender?.nickname}</span>}
                        <div className={`px-3 py-2 rounded-xl text-sm ${mine ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            {user && selected.is_member ? (
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="메시지 입력..."
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()} />
                <button onClick={handleChat} className="btn-dark">전송</button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400">채팅은 파티 참여 후 이용 가능합니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

