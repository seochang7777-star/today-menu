import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createParty, getRestaurants } from '../api/services'

export default function PartyCreate() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [form, setForm] = useState({ title: '', restaurant_id: '', meeting_time: '', max_people: 4 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 }).then((d) => setRestaurants(d.items ?? [])).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await createParty({
        ...form,
        restaurant_id: Number(form.restaurant_id),
        max_people:    Number(form.max_people),
      })
      navigate(`/party/${data.party_id}`)
    } catch (e) {
      alert(e.response?.data?.message ?? '파티 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Link to="/party" className="btn btn-sm btn-secondary" style={{ marginBottom: 16 }}>← 목록으로</Link>
      <h2 style={{ marginBottom: 24 }}>🍽️ 밥친구 파티 만들기</h2>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 32, maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">파티 제목 *</label>
            <input type="text" className="form-control" placeholder="예: 강남역 근처 삼겹살 같이 먹어요!" required
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">식당 선택 *</label>
            <select className="form-control" required value={form.restaurant_id}
              onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })}>
              <option value="">-- 식당을 선택하세요 --</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.category}) - {r.address?.slice(0, 30)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">약속 일시 *</label>
            <input type="datetime-local" className="form-control" required
              value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">최대 인원 *</label>
            <input type="number" className="form-control" min={2} max={10} required
              value={form.max_people} onChange={(e) => setForm({ ...form, max_people: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            {loading ? '생성 중...' : '파티 생성하기'}
          </button>
        </form>
      </div>
    </>
  )
}
