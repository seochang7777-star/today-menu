// front/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import api from '../api/axiosInstance'

const TABS = [
  { id: 'users', label: '👤 유저 관리' },
  { id: 'restaurants', label: '🍽️ 식당 관리' },
  { id: 'inquiries', label: '💬 문의 관리' },
  { id: 'notices', label: '📢 공지 관리' },
  { id: 'reports', label: '🚨 신고 관리' },
  { id: 'reviews', label: '⭐ 리뷰 관리' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role?.toLowerCase() !== 'admin') { navigate('/'); return }
  }, [user])

  if (!user || user.role?.toLowerCase() !== 'admin') return null

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8 }}>⚙️ 관리자 페이지</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', marginBottom: 24 }}>
        관리자 계정으로 로그인 중입니다.
      </p>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '.88rem',
              border: '1px solid var(--border-color)', cursor: 'pointer',
              background: tab === t.id ? 'var(--color-primary)' : 'var(--bg-white)',
              color: tab === t.id ? '#fff' : 'var(--text-primary)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'users' && <UserManager />}
      {tab === 'restaurants' && <RestaurantManager />}
      {tab === 'inquiries' && <InquiryManager />}
      {tab === 'notices' && <NoticeManager />}
      {tab === 'reports' && <ReportManager />}
      {tab === 'reviews' && <ReviewManager />}
    </div>
  )
}

// ── 유저 관리 ────────────────────────────────────────────────────────────────
function UserManager() {
  const PAGE_SIZE = 15
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/users')
      setUsers(data)
    } catch { alert('유저 목록 로드 실패') }
    finally { setLoading(false) }
  }

  const handleDelete = async (userId, nickname) => {
    if (!window.confirm(`${nickname}님을 강제 탈퇴시키겠습니까?`)) return
    try {
      await api.delete(`/api/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      alert('탈퇴 처리되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '실패') }
  }

  const filtered = users.filter(u =>
    u.nickname?.includes(search) || u.email?.includes(search)
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 900 }}>유저 목록 ({filtered.length}명)</h2>
        <input
          placeholder="닉네임/이메일 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-control"
          style={{ width: 220, fontSize: '.85rem' }}
        />
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)' }}>
                  {['ID', '닉네임', '이메일', '매너온도', '역할', '가입일', '관리'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.user_id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{u.nickname}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: u.manner_score >= 36.5 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                        {u.manner_score}°C
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: u.role === 'admin' ? '#FFF5F5' : 'var(--bg-surface)',
                        color: u.role === 'admin' ? 'var(--color-danger)' : 'var(--text-muted)',
                        padding: '2px 8px', borderRadius: 6, fontSize: '.75rem', fontWeight: 700,
                      }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {u.created_at?.slice(0, 10)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u.role !== 'admin' && (
                        <button onClick={() => handleDelete(u.user_id, u.nickname)}
                          style={{ padding: '4px 10px', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 6, fontSize: '.78rem', cursor: 'pointer', fontWeight: 700 }}>
                          강제탈퇴
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
              <button
                onClick={() => setPage(1)} disabled={page === 1}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '.82rem' }}>
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '.82rem' }}>
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{
                      padding: '5px 12px', border: '1px solid var(--border-color)', borderRadius: 6,
                      background: page === p ? 'var(--color-primary)' : 'var(--bg-white)',
                      color: page === p ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer', fontWeight: page === p ? 700 : 400, fontSize: '.82rem'
                    }}>
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '.82rem' }}>
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)} disabled={page === totalPages}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '.82rem' }}>
                »
              </button>
              <span style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                {page} / {totalPages} 페이지 ({filtered.length}명)
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── 식당 관리 ────────────────────────────────────────────────────────────────
function RestaurantManager() {
  const [rests, setRests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('전체')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PER_PAGE = 15
  const [form, setForm] = useState({ name: '', address: '', category: '한식', phone: '', latitude: '', longitude: '', business_hours: '' })
  const [showForm, setShowForm] = useState(false)
  const CATS = ['전체', '한식', '중식', '일식', '양식', '분식', '치킨', '피자', '카페', '술집']

  useEffect(() => { load(catFilter, page) }, [catFilter, page])

  const load = async (cat = '전체', pg = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/menu/', { params: { cat, page: pg, per_page: PER_PAGE } })
      setRests(data.items ?? [])
      setTotalCount(data.total ?? 0)
    } catch { alert('식당 목록 로드 실패') }
    finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/menu/', {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      })
      setForm({ name: '', address: '', category: '한식', phone: '', latitude: '', longitude: '', business_hours: '' })
      setShowForm(false)
      await load()
      alert('식당이 등록되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '등록 실패') }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 식당을 삭제하시겠습니까?`)) return
    try {
      await api.delete(`/api/menu/${id}`)
      setRests(prev => prev.filter(r => r.id !== id))
      alert('삭제되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '삭제 실패') }
  }

  const filtered = search
    ? rests.filter(r => r.name?.includes(search))
    : rests

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontWeight: 900 }}>식당 목록 ({totalCount.toLocaleString()}개)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* 카테고리 드롭다운 */}
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}
            className="form-control" style={{ width: 110, fontSize: '.85rem' }}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="식당명 검색" value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control" style={{ width: 180, fontSize: '.85rem' }} />
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
            {showForm ? '취소' : '+ 식당 등록'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">식당명 *</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">카테고리</label>
            <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {['한식', '중식', '일식', '양식', '분식', '치킨', '피자', '카페', '술집'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
            <label className="form-label">주소 *</label>
            <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">전화번호</label>
            <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">영업시간</label>
            <input className="form-control" placeholder="예: 09:00~22:00" value={form.business_hours} onChange={e => setForm({ ...form, business_hours: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">위도</label>
            <input className="form-control" type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">경도</label>
            <input className="form-control" type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '9px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>등록</button>
          </div>
        </form>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)' }}>
                {['ID', '식당명', '카테고리', '주소', '별점', '관리'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{r.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.name}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 6, fontSize: '.75rem', fontWeight: 700 }}>{r.category}</span></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</td>
                  <td style={{ padding: '10px 12px', color: '#F6AD55', fontWeight: 700 }}>★ {r.avg_rating?.toFixed(1)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleDelete(r.id, r.name)}
                      style={{ padding: '4px 10px', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 6, fontSize: '.78rem', cursor: 'pointer', fontWeight: 700 }}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 페이지네이션 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 0' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 700, opacity: page === 1 ? .4 : 1 }}>◀</button>
            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
              {page} / {Math.ceil(totalCount / PER_PAGE)} 페이지 ({totalCount.toLocaleString()}개)
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalCount / PER_PAGE)}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 700, opacity: page >= Math.ceil(totalCount / PER_PAGE) ? .4 : 1 }}>▶</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 문의 관리 ────────────────────────────────────────────────────────────────
function InquiryManager() {
  const [inquiries, setInquiries] = useState([])
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/support/inquiries')
      setInquiries(Array.isArray(data) ? data : [])
    } catch { setInquiries([]) }
    finally { setLoading(false) }
  }

  const handleAnswer = async (id) => {
    if (!reply.trim()) { alert('답변 내용을 입력하세요.'); return }
    try {
      await api.patch(`/api/support/inquiries/${id}/answer`, { answer: reply })
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, answer: reply } : i))
      setReply('')
      setSelected(null)
      alert('답변이 등록되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '실패') }
  }

  return (
    <div>
      <h2 style={{ fontWeight: 900, marginBottom: 16 }}>문의 목록 ({inquiries.length}건)</h2>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inquiries.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>문의 내역이 없습니다.</div>}
          {inquiries.map(inq => (
            <div key={inq.id} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{inq.title}</span>
                  <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--text-muted)' }}>{inq.writer} · {inq.date}</span>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: '.75rem', fontWeight: 700, background: inq.answer ? '#F0FFF4' : '#FFF5F5', color: inq.answer ? '#276749' : 'var(--color-danger)' }}>
                  {inq.answer ? '답변완료' : '답변대기'}
                </span>
              </div>
              <p
                style={{
                  fontSize: '.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word'
                }}
              >
                {inq.content}
              </p>
              {inq.answer ? (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: '.85rem',
                    borderLeft: '3px solid var(--color-primary)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word'
                  }}
                >
                  <strong>관리자 답변:</strong><br />
                  {inq.answer}
                </div>
              ) : (
                <div>
                  {selected === inq.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        rows={4}
                        placeholder="답변 내용을 입력하세요..."
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        maxLength={1000}
                        style={{
                          width: '100%',
                          fontSize: '.85rem',
                          padding: '10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 8,
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '.75rem',
                          color: 'var(--text-muted)'
                        }}>
                          {reply.length}/1000
                        </span>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleAnswer(inq.id)}
                            style={{
                              padding: '8px 16px',
                              background: 'var(--color-primary)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '.85rem'
                            }}
                          >
                            등록
                          </button>

                          <button
                            onClick={() => setSelected(null)}
                            style={{
                              padding: '8px 12px',
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontSize: '.85rem'
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setSelected(inq.id); setReply('') }}
                      style={{ padding: '6px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.82rem' }}>
                      ✏️ 답변하기
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 공지 관리 ────────────────────────────────────────────────────────────────
function NoticeManager() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '서비스' })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/notices')
      setNotices(Array.isArray(data) ? data : [])
    } catch { setNotices([]) }
    finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/notices', form)
      setForm({ title: '', content: '', category: '서비스' })
      setShowForm(false)
      await load()
      alert('공지사항이 등록되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '실패') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('공지사항을 삭제하시겠습니까?')) return
    try {
      await api.delete(`/api/notices/${id}`)
      setNotices(prev => prev.filter(n => n.id !== id))
    } catch (e) { alert(e.response?.data?.message ?? '실패') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 900 }}>공지사항 관리 ({notices.length}건)</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
          {showForm ? '취소' : '✏️ 공지 작성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {['서비스', '운영', '비즈니스', '업데이트'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">내용 *</label>
            <textarea className="form-control" rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '9px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>등록</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notices.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>등록된 공지사항이 없습니다.</div>}
        {notices.map(n => (
          <div key={n.id} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '.75rem', fontWeight: 700, background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 6, marginRight: 8 }}>{n.category}</span>
              <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{n.title}</span>
              <span style={{ marginLeft: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>{n.date}</span>
            </div>
            <button onClick={() => handleDelete(n.id)}
              style={{ padding: '4px 10px', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 6, fontSize: '.78rem', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 신고 관리 ────────────────────────────────────────────────────────────────
function ReportManager() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | unprocessed | processed

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/party/admin/reports')
      setReports(Array.isArray(data) ? data : [])
    } catch (e) {
      alert(e.response?.data?.message ?? '신고 목록 로드 실패')
    } finally { setLoading(false) }
  }

  const handleProcess = async (reportId) => {
    if (!window.confirm('이 신고를 처리 완료로 변경하시겠습니까?')) return
    try {
      await api.patch(`/api/party/reports/${reportId}/process`)
      setReports(prev => prev.map(r =>
        r.report_id === reportId ? { ...r, is_processed: true } : r
      ))
    } catch {
      // API 없으면 로컬만 업데이트
      setReports(prev => prev.map(r =>
        r.report_id === reportId ? { ...r, is_processed: true } : r
      ))
    }
  }

  const filtered = reports.filter(r => {
    if (filter === 'unprocessed') return !r.is_processed
    if (filter === 'processed') return r.is_processed
    return true
  })

  const unprocessedCount = reports.filter(r => !r.is_processed).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontWeight: 900 }}>신고 목록</h2>
          {unprocessedCount > 0 && (
            <span style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: '.78rem', fontWeight: 700 }}>
              미처리 {unprocessedCount}건
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', '전체'], ['unprocessed', '미처리'], ['processed', '처리완료']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '.82rem', fontWeight: 700,
                border: '1px solid var(--border-color)', cursor: 'pointer',
                background: filter === val ? 'var(--color-primary)' : 'var(--bg-white)',
                color: filter === val ? '#fff' : 'var(--text-primary)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          {filter === 'unprocessed' ? '미처리 신고가 없습니다.' : '신고 내역이 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <div key={r.report_id} style={{
              background: 'var(--bg-white)',
              border: `1px solid ${r.is_processed ? 'var(--border-color)' : '#FED7D7'}`,
              borderRadius: 10, padding: 16,
              opacity: r.is_processed ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: '.92rem' }}>신고 #{r.report_id}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{r.created_at}</span>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: '.75rem', fontWeight: 700,
                  background: r.is_processed ? '#F0FFF4' : '#FFF5F5',
                  color: r.is_processed ? '#276749' : 'var(--color-danger)',
                }}>
                  {r.is_processed ? '처리완료' : '미처리'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10, fontSize: '.85rem' }}>
                <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 2 }}>신고자</div>
                  <div style={{ fontWeight: 700 }}>👤 {r.reporter}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 2 }}>피신고자</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>⚠️ {r.target}</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: 2 }}>파티</div>
                  <div style={{ fontWeight: 700 }}>🎉 파티 #{r.party_id}</div>
                </div>
              </div>

              <div style={{ background: '#FFF5F5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.85rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>신고 사유: </span>
                <span>{r.reason}</span>
              </div>

              {!r.is_processed && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleProcess(r.report_id)}
                    style={{ padding: '7px 16px', background: 'var(--color-success, #38A169)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
                    ✅ 처리 완료
                  </button>
                  <button
                    onClick={() => window.open(`/party/${r.party_id}`, '_blank')}
                    style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
                    🔍 파티 확인
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 리뷰 관리 ────────────────────────────────────────────────────────────────
function ReviewManager() {
  const PAGE_SIZE = 15
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => { load(1, '') }, [])

  const load = async (p = page, q = searchQ) => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/reviews', {
        params: { page: p, per_page: PAGE_SIZE, q }
      })
      setReviews(data.reviews ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
    } catch { alert('리뷰 목록 로드 실패') }
    finally { setLoading(false) }
  }

  const handleSearch = () => {
    setSearchQ(search)
    load(1, search)
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm('리뷰를 삭제하시겠습니까?')) return
    try {
      await api.delete(`/api/admin/reviews/${reviewId}`)
      setReviews(prev => prev.filter(r => r.review_id !== reviewId))
      setTotal(prev => prev - 1)
      alert('삭제되었습니다.')
    } catch (e) { alert(e.response?.data?.message ?? '삭제 실패') }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 900 }}>리뷰 목록 (총 {total}개)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="식당명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="form-control"
            style={{ width: 180, fontSize: '.85rem' }}
          />
          <button onClick={handleSearch}
            style={{ padding: '8px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' }}>
            검색
          </button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)' }}>
                  {['ID', '식당명', '작성자', '별점', '내용', '작성일', '관리'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map(rv => (
                  <tr key={rv.review_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{rv.review_id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{rv.restaurant_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{rv.nickname}</td>
                    <td style={{ padding: '10px 12px', color: '#F6AD55', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {STARS(rv.rating)}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rv.content || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {rv.created_at}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => handleDelete(rv.review_id)}
                        style={{ padding: '4px 10px', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 6, fontSize: '.78rem', cursor: 'pointer', fontWeight: 700 }}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>리뷰가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
              <button onClick={() => load(1)} disabled={page === 1}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '.82rem' }}>«</button>
              <button onClick={() => load(page - 1)} disabled={page === 1}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '.82rem' }}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button key={p} onClick={() => load(p)}
                    style={{ padding: '5px 12px', border: '1px solid var(--border-color)', borderRadius: 6, background: page === p ? 'var(--color-primary)' : 'var(--bg-white)', color: page === p ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: page === p ? 700 : 400, fontSize: '.82rem' }}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => load(page + 1)} disabled={page === totalPages}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '.82rem' }}>›</button>
              <button onClick={() => load(totalPages)} disabled={page === totalPages}
                style={{ padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-white)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '.82rem' }}>»</button>
              <span style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                {page} / {totalPages} 페이지
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
