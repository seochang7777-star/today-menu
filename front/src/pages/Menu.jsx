import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import { useAuth } from '../App'
import RestaurantCard from '../components/RestaurantCard';
import RandomBanner from '../components/RandomBanner'

const CAT_ICON = {
  한식: './img/category/korean.png',
  일식: './img/category/japanese.webp',
  중식: './img/category/chinese.webp',
  양식: './img/category/steak.webp',
  분식: './img/category/snack.webp',
  치킨: './img/category/chicken.webp',
  카페: './img/category/coffee.webp',
  술집: './img/category/beer.webp'
}
const CATEGORIES = [
  '전체',
  '한식',
  '일식',
  '중식',
  '양식',
  '분식',
  '치킨',
  '카페',
  '술집',
]
const adBannerClass =
  'w-full overflow-hidden rounded-[12px] bg-white max-md:h-[70px]'
const adBannerLinkClass = 'block h-full w-full'
const adBannerImageClass =
  'h-full w-full object-contain object-center'


export default function Menu() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeCat = searchParams.get('cat') ?? '전체'
  const page = Number(searchParams.get('page') ?? 1)
  const q = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'rating'

  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, has_prev: false, has_next: false })
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(q)

  const handleRestaurantLike = (item) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === item.id ? { ...r, is_liked: !r.is_liked } : r
      )
    )
  }

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

  const handleSearch = () => {
    const keyword = searchInput.trim()
    if (keyword) {
      try {
        const saved = localStorage.getItem('trendKeywords')
        const keywords = saved ? JSON.parse(saved) : []
        const exists = keywords.find(k => k.name === keyword)
        let updated
        if (exists) {
          updated = keywords.map(k => k.name === keyword ? { ...k, count: k.count + 1 } : k)
        } else {
          updated = [...keywords, { name: keyword, count: 1 }]
        }
        const sorted = updated.sort((a, b) => b.count - a.count || Math.random() - 0.5).slice(0, 8)
        localStorage.setItem('trendKeywords', JSON.stringify(sorted))
      } catch {}
    }
    go({ q: searchInput, page: 1 })
  }

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
      <h1 className="mb-6 text-[2.2rem] font-black">맛집찾기</h1>

      <section className={adBannerClass}>
        <RandomBanner />
      </section>

      {/* 카테고리 필터 */}
      <div className="mt-8 mb-13 flex flex-wrap items-center gap-7">
        <span className="shrink-0 text-[0.95rem] font-bold">
          카테고리
        </span>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`
                cursor-pointer whitespace-nowrap
                rounded-full
                bg-[var(--color-white)]
                px-3 py-2
                text-[0.85rem]
                font-bold
                text-black
                shadow-sm
                flex items-center justify-center gap-0
                transition-all duration-150
                hover:bg-[var(--color-accent)] hover:shadow-md
                ${activeCat === c ? "scale-105 shadow-md ring-2 ring-white/60" : ""}
              `}
              onClick={() => go({ cat: c, page: 1, q: "" })}
            >
              {/* 홈에서 사용한 방식과 동일하게 img 태그 삽입 */}
              {CAT_ICON[c] && (
                <img 
                  src={CAT_ICON[c]} 
                  alt={c} 
                  className="h-6 w-8 object-contain mr-0.5" // 버튼 크기에 맞게 조절
                  onError={(e) => { e.target.style.display = 'none' }} 
                />
              )}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 검색창 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-[420px]">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex h-12 items-center gap-3"
          >
            <input
              type="text"
              placeholder="식당명을 검색하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-[rgba(244,108,111,0.8)] bg-white px-5 text-[0.92rem] font-semibold text-[var(--text-primary)] shadow-[0_4px_18px_rgba(244,108,111,0.08)] outline-none placeholder:text-[#9D8C86]"
            />
            <button
              type="submit"
              className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-0 bg-[linear-gradient(135deg,var(--color-primary),#F98082)] text-[1.8rem] font-bold text-white shadow-[0_4px_18px_rgba(244,108,111,0.16)] transition hover:brightness-105 hover:shadow-md"
              aria-label="검색"
            >
              <span className="relative -top-[2px] leading-none">⌕</span>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[0.85rem] text-[var(--text-muted)]">
            총 {pagination.total.toLocaleString()}개
          </span>
          <select
            className="rounded-[var(--border-radius)] border border-[var(--border-color)] bg-[var(--bg-white)] px-3 py-[7px] text-[0.85rem] outline-none"
            value={sort}
            onChange={(e) => go({ sort: e.target.value, page: 1 })}
          >
            <option value="rating">평점순</option>
            <option value="likes">찜 많은 순</option>
            <option value="name">이름순</option>
            <option value="new">최신순</option>
          </select>
        </div>
      </div>

      {/* 그리드카드 */}
      {
        loading ? (
          <div className="grid-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="card h-[220px] bg-[var(--bg-surface)] animate-pulse-1500"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p>{q ? `"${q}" 검색 결과가 없습니다.` : '등록된 식당이 없습니다.'}</p>
            {q && (
              <button className="btn btn-secondary btn-sm 
              mt-[12px]"
                onClick={() => { setSearchInput(''); go({ q: '', page: 1 }) }}>
                전체보기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-[15px] gap-y-[30px] max-lg:grid-cols-2 max-[540px]:grid-cols-2" id="menuGrid">
            {items.map((r) => (
              <RestaurantCard
                key={r.id}
                r={r}
                to={`/menu/${r.id}`}
                showPartyBadge={!!user}
                liked={Boolean(r.is_liked)}
                onToggleLike={handleRestaurantLike}
              />
            ))}
          </div>
        )
      }


      {/* 페이지네이션 */}
      {pagination.pages > 1 && (
        <div className="pagination">
          {pagination.page > 1 && (
            <button className="page-btn" onClick={() => go({ page: 1 })}>{'<<'}</button>
          )}
          {pagination.has_prev && (
            <button className="page-btn" onClick={() => go({ page: page - 1 })}>{'<'}</button>
          )}
          {pageNums().map((p) => (
            <button key={p}
              className={`page-btn${p === pagination.page ? ' active' : ''}`}
              onClick={() => go({ page: p })}>
              {p}
            </button>
          ))}
          {pagination.has_next && (
            <button className="page-btn" onClick={() => go({ page: page + 1 })}>{'>'}</button>
          )}
          {pagination.page < pagination.pages && (
            <button className="page-btn" onClick={() => go({ page: pagination.pages })}>{'>>'}</button>
          )}
        </div>
      )}
    </>
  )
}
