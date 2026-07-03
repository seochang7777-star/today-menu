import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createParty, getRestaurants } from '../api/services'

export default function PartyCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [restaurants, setRestaurants] = useState([])
  const [form, setForm] = useState({ title: '', restaurant_id: searchParams.get('rest') ?? '', meeting_time: '', max_people: 4 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 }).then((d) => setRestaurants(d.items ?? [])).catch(() => { })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await createParty({
        ...form,
        restaurant_id: Number(form.restaurant_id),
        max_people: Number(form.max_people),
      })
      navigate(`/party/${data.party_id}`)
    } catch (e) {
      alert(e.response?.data?.message ?? '파티 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ padding: '20px 20px 0 20px' }}>
        <button
          type="button"
          onClick={() => navigate("/party")}
          className="inline-flex items-center gap-1 text-[.85rem] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-0 cursor-pointer"
        >
          ← 목록으로
        </button>
      </div>

      {/* 텍스트와 블록 상자들을 중앙으로 모아주는 부모 컨테이너 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>

        {/* [중앙 팻말] 로그인 창의 로고 및 폰트 구조 적용 */}
        <div className="text-center mb-[24px]">
          <div className="site-logo relative justify-center min-h-[40px] pl-3 flex items-center">
            <img
              src="/img/icon/logo.png"
              alt="밥친구 로고"
              className="absolute right-full h-7 w-auto object-contain"
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>밥친구 파티 만들기</span>
          </div>
        </div>

        {/* [파티생성창] 원래 디자인 크기(maxWidth: 560, padding: 32)와 스타일 유지 */}
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
              <input type="text" className="form-control" placeholder="예: 강남역 근처 삼겹살 같이 먹어요!" required
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">선택 식당</label>
              <div className="form-control">
                {restaurants.find(r => r.id == form.restaurant_id)?.name || '선택된 식당 없음'}
              </div>
            </div>

            <input type="hidden" value={form.restaurant_id} />
            <div className="form-group">
              <label className="form-label">약속 일시 *</label>
              <input type="datetime-local"  className="form-control" required
                value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">최대 인원 *</label>
              <input type="number" className="form-control" min={2} max={10} required
                value={form.max_people} onChange={(e) => setForm({ ...form, max_people: e.target.value })} />
            </div>

            {/* [로그인 스타일 시그니처 버튼] 적용 */}
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