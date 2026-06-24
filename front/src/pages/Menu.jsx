import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import { useAuth } from '../App'

const CAT_ICON = { 한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜', 치킨:'🍗', 피자:'🍕', 카페:'☕' }
const CATEGORIES = ['전체','한식','일식','중식','양식','분식','치킨','피자','카페','술집']

export default function Menu() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCat = searchParams.get('cat') ?? '전체'
  const page      = Number(searchParams.get('page') ?? 1)
  const q         = searchParams.get('q') ?? ''

  const [restaurants, setRestaurants] = useState([])
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1, page: 1, has_prev: false, has_next: false })
  const [loading,     setLoading]     = useState(false)
  const [searchInput, setSearchInput] = useState(q)

  useEffect(() => {
    setLoading(true)
    getRestaurants({ cat: activeCat, q, page })
      .then((d) => { setRestaurants(d.items ?? []); setPagination(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeCat, q, page])

  const go = (params) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    Object.entries(params).forEach(([k, v]) => v == null ? next.delete(k) : next.set(k, String(v)))
    return next
  })

  // 페이지 번호 배열 생성
  const pageRange = () => {
    const pages = []
    for (let i = 1; i <= pagination.pages; i++) pages.push(i)
    return pages
  }

  return (
    <>
      <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 24 }}>글쓰기</h1>

      {/* 상단 배너 */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius-lg)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 600 }}>
        광고 배너 영역
      </div>

      {/* 필터 바 */}
      <div className="menu-filter-bar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '.9rem', fontWeight: 600 }}>카테고리</span>
          <div className="cat-scroll">
            {CATEGORIES.map((c) => (
              <button key={c} className={`cat-pill${activeCat === c ? ' active' : ''}`}
                onClick={() => go({ cat: c, page: 1, q: '' })}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar">
            <input type="text" className="form-control" placeholder="식당명 검색..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go({ q: searchInput, page: 1 })}
              style={{ borderRadius: 24, minWidth: 200 }} />
            <button className="btn btn-dark btn-sm" style={{ borderRadius: 24 }}
              onClick={() => go({ q: searchInput, page: 1 })}>검색</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="filter-count">총 {pagination.total}개</span>
          <select className="sort-select">
            <option value="rating">평점순</option>
            <option value="name">이름순</option>
            <option value="new">최신순</option>
          </select>
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 220, background: 'var(--bg-surface)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍴</div>
          <p>{q ? `「${q}」 검색 결과가 없습니다` : '등록된 식당이 없습니다'}</p>
          {q && <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => go({ q: '', page: 1 })}>전체 보기</button>}
        </div>
      ) : (
        <div className="grid-4" id="menuGrid">
          {restaurants.map((r) => (
            <Link to={`/menu/${r.id}`} className="card rest-card" key={r.id}>
              <div className="card-img">{CAT_ICON[r.category] ?? '🍴'}</div>
              <div className="card-body">
                <span className="badge badge-primary">{r.category || '기타'}</span>
                <div className="card-title mt-8">{r.name}</div>
                <div className="rest-meta" style={{ marginTop: 6 }}>
                  <span className="stars">{'★'.repeat(Math.round(r.avg_rating ?? 0)).padEnd(5, '☆')}</span>
                  <span className="rest-rating">{(r.avg_rating ?? 0).toFixed(1)}</span>
                </div>
                <div className="rest-addr">{r.address}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-muted" style={{ fontSize: '.7rem' }}>리뷰 {Math.floor((r.avg_rating ?? 0) * 10)}</span>
                  {user && <span className="badge badge-success" style={{ fontSize: '.7rem' }}>파티 참여 가능</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination.pages > 1 && (
        <div className="pagination">
          {pagination.has_prev && (
            <button className="page-btn" onClick={() => go({ page: page - 1 })}>‹</button>
          )}
          {pageRange().map((p) => (
            <button key={p} className={`page-btn${p === pagination.page ? ' active' : ''}`}
              onClick={() => go({ page: p })}>
              {p}
            </button>
          ))}
          {pagination.has_next && (
            <button className="page-btn" onClick={() => go({ page: page + 1 })}>›</button>
          )}
        </div>
      )}
    </>
  )
}
