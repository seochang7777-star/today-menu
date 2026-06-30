import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import { useAuth } from '../App'
import RestaurantImage from "../components/RestaurantImage";

const CAT_ICON = { 한식: '🍚', 일식: '🍣', 중식: '🥟', 양식: '🥩', 분식: '🍜', 치킨: '🍗', 피자: '🍕', 카페: '☕', 술집: '🍺' }
const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '술집']
const adBannerClass =
  'h-[88px] w-full overflow-hidden rounded-[12px] bg-white max-md:h-[70px]'
const adBannerLinkClass = 'block h-full w-full'
const adBannerImageClass =
  'h-full w-full object-contain object-center'


export default function Menu() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeCat = searchParams.get('cat') ?? '전체'
  const page = Number(searchParams.get('page') ?? 1)
  const q    = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'rating'

  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, has_prev: false, has_next: false })
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(q)

  const fetchData = useCallback(() => {
    setLoading(true)
    getRestaurants({ cat: activeCat, q, page, sort })
      .then((d) => { setItems(d.items ?? []); setPagination(d) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [activeCat, q, page, sort])

  useEffect(() => { fetchData() }, [fetchData])

  const go = (params) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(params).forEach(([k, v]) => {
        if (v == null || v === '') next.delete(k)
        else next.set(k, String(v))
      })
      return next
    })

  const handleSearch = () => go({ q: searchInput, page: 1 })

  // 페이지 번호 배열 (최대 10개)
  const pageNums = () => {
    const total = pagination.pages
    if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1)
    const cur = pagination.page
    let start = Math.max(1, cur - 4)
    const end = Math.min(total, start + 9)
    if (end - start < 9) start = Math.max(1, end - 9)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <>
      <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 24 }}>맛집 찾기</h1>

      {/* 광고 배너 */}
      {/* <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius-lg)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 600 }}>
        광고 배너 영역
      </div> */}
      <section className={adBannerClass}>
          <Link to="/party" className={adBannerLinkClass} aria-label="파티 페이지로 이동">
            <img className={adBannerImageClass} src="/img/banner1.png" alt="파티 만들기 배너" />
          </Link>
        </section>

      {/* 카테고리 필터 */}
      <div className="menu-filter-bar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.9rem', fontWeight: 600, flexShrink: 0 }}>카테고리</span>
          <div className="cat-scroll">
            {CATEGORIES.map((c) => (
              <button key={c}
                className={`cat-pill${activeCat === c ? ' active' : ''}`}
                onClick={() => go({ cat: c, page: 1, q: '' })}>
                {CAT_ICON[c] && <span>{CAT_ICON[c]}</span>} {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 420 }}>
          <input
            type="text" className="form-control"
            placeholder="식당명 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ borderRadius: 24 }}
          />
          <button className="btn btn-dark btn-sm" style={{ borderRadius: 24 }}
            onClick={handleSearch}>검색</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="filter-count">총 {pagination.total.toLocaleString()}개</span>
          <select className="sort-select"
            value={sort}
            onChange={(e) => go({ sort: e.target.value, page: 1 })}>
            <option value="rating">평점순</option>
            <option value="likes">찜 많은순</option>
            <option value="name">이름순</option>
            <option value="new">최신순</option>
          </select>
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 220, background: 'var(--bg-surface)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍴</div>
          <p>{q ? `"${q}" 검색 결과가 없습니다` : '등록된 식당이 없습니다'}</p>
          {q && (
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}
              onClick={() => { setSearchInput(''); go({ q: '', page: 1 }) }}>
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <div className="grid-4" id="menuGrid">
          {items.map((r) => (
            <Link to={`/menu/${r.id}`} key={r.id} className="card rest-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              {/* 썸네일 */}
              {/* ── Menu.jsx 썸네일 구역 교체 ── */}
              <div className="card-img">
                <RestaurantImage
                  imageUrl={r.image_url}
                  category={r.category}
                  name={r.name}
                />
              </div>
              <div className="card-body">
                <span className="badge badge-primary">{r.category || '기타'}</span>
                <div className="card-title mt-8">{r.name}</div>
                <div className="rest-meta" style={{ marginTop: 6 }}>
                  <span className="stars">
                    {'★'.repeat(Math.round(r.avg_rating ?? 0)).padEnd(5, '☆')}
                  </span>
                  <span className="rest-rating">{(r.avg_rating ?? 0).toFixed(1)}</span>
                </div>
                <div className="rest-addr">{r.address}</div>
                {r.phone && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    📞 {r.phone}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-muted" style={{ fontSize: '.7rem' }}>
                    리뷰 {Math.floor((r.avg_rating ?? 0) * 10)}
                  </span>
                  {user && (
                    <span className="badge badge-success" style={{ fontSize: '.7rem' }}>파티 참여 가능</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination.pages > 1 && (
        <div className="pagination">
          {/* 처음 */}
          {pagination.page > 1 && (
            <button className="page-btn" onClick={() => go({ page: 1 })}>«</button>
          )}
          {/* 이전 */}
          {pagination.has_prev && (
            <button className="page-btn" onClick={() => go({ page: page - 1 })}>‹</button>
          )}
          {/* 번호 */}
          {pageNums().map((p) => (
            <button key={p}
              className={`page-btn${p === pagination.page ? ' active' : ''}`}
              onClick={() => go({ page: p })}>
              {p}
            </button>
          ))}
          {/* 다음 */}
          {pagination.has_next && (
            <button className="page-btn" onClick={() => go({ page: page + 1 })}>›</button>
          )}
          {/* 끝 */}
          {pagination.page < pagination.pages && (
            <button className="page-btn" onClick={() => go({ page: pagination.pages })}>»</button>
          )}
        </div>
      )}
    </>
  )
}
