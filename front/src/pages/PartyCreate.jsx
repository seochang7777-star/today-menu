import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { createParty, getRestaurants } from '../api/services'

export default function PartyCreate() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [searchParams] = useSearchParams()

  // MenuDetail → navigate('/party/create', { state: { restaurant: rest } }) 로 전달
  const preselected = location.state?.restaurant ?? null

  const [restaurants, setRestaurants] = useState([])
  const [form, setForm] = useState({
    title:         '',
    restaurant_id: preselected?.restaurant_id ?? preselected?.id ?? searchParams.get('rest') ?? '',
    meeting_time:  '',
    max_people:    4,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 })
      .then((d) => setRestaurants(d.items ?? []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.restaurant_id) {
      alert('식당을 선택해주세요.')
      return
    }
    setLoading(true)
    try {
      const data = await createParty({
        ...form,
        restaurant_id: Number(form.restaurant_id),
        max_people:    Number(form.max_people),
      })
      navigate(`/party/${data.party_id}`)
    } catch (err) {
      alert(err.response?.data?.message ?? '파티 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const getNowISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  // 선택된 식당명 표시
  const selectedName = preselected?.name ||
    restaurants.find(r => String(r.restaurant_id ?? r.id) === String(form.restaurant_id))?.name ||
    '선택된 식당 없음'

  return (
    <>
      <div style={{ padding: '20px 20px 0 20px' }}>
        <button
          type="button"
          onClick={() => navigate('/party')}
          className="inline-flex items-center gap-1 text-[.85rem] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-0 cursor-pointer"
        >
          ← 목록으로
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
        <div className="text-center mb-[24px]">
          <div className="site-logo relative justify-center min-h-[40px] pl-3 flex items-center">
            <img
              src="/img/icon/logo.png"
              alt="오늘 뭐먹지 로고"
              className="absolute right-full h-7 w-auto object-contain"
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>밥친구 파티 만들기</span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-white)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-xl)',
          padding: 32,
          maxWidth: 560,
          width: '100%'
        }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">파티 제목 *</label>
              <input
                type="text"
                className="form-control"
                placeholder="예: 강남역 근처 삼겹살 같이 먹어요!"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">선택 식당</label>
              <div
                className="form-control"
                style={{
                  color: form.restaurant_id ? 'var(--text-primary)' : 'var(--text-muted)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span>{selectedName}</span>
                {!preselected && (
                  <button
                    type="button"
                    onClick={() => navigate('/menu')}
                    style={{
                      background: 'var(--color-primary)', color: '#fff',
                      border: 'none', borderRadius: 6, padding: '3px 10px',
                      fontSize: '.78rem', cursor: 'pointer', fontWeight: 700,
                    }}
                  >
                    식당 선택
                  </button>
                )}
              </div>
              {!form.restaurant_id && (
                <div style={{ fontSize: '.78rem', color: 'var(--color-danger)', marginTop: 4 }}>
                  메뉴 페이지에서 식당을 선택한 후 파티를 만들어주세요.
                </div>
              )}
            </div>

            <input type="hidden" value={form.restaurant_id} />

            <div className="form-group">
              <label className="form-label">약속 일시 *</label>
              <input
                type="datetime-local"
                className="form-control"
                required
                value={form.meeting_time}
                min={getNowISO()}
                onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">최대 인원 *</label>
              <input
                type="number"
                className="form-control"
                min={2} max={10}
                required
                value={form.max_people}
                onChange={(e) => setForm({ ...form, max_people: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 text-lg font-semibold rounded-[12px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors mt-[8px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '파티 생성하기'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
