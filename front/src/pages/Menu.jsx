import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import { useAuth } from '../App'
import RestaurantCard from '../components/RestaurantCard';

const CAT_ICON = {
  '한식': '🍚',
  '일식': '🍣',
  '중식': '🥟',
  '양식': '🥩',
  '분식': '🍜',
  '치킨': '🍗',
  '피자': '🍕',
  '카페': '☕',
  '술집': '🍺',
}
const CATEGORIES = [
  '전체',
  '한식',
  '일식',
  '중식',
  '양식',
  '분식',
  '치킨',
  '피자',
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

  // 페이지네이션
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
      <h1 className="mb-6 text-[2.2rem] font-black">
        맛집찾기
      </h1>

      <section className={adBannerClass}>
        <Link
          to="/party"
          className={adBannerLinkClass}
          aria-label="베너1"
        >
          <img
            src="/img/banner/banner2.png"
            alt="배너1"
            className={adBannerImageClass}
          />
        </Link>
      </section>

      <div className="mt-8 mb-13 flex flex-wrap items-center gap-7">
        <span className="shrink-0 text-[0.95rem] font-bold">
          카테고리
        </span>

        <div className="flex flex-wrap gap-5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`
    cursor-pointer whitespace-nowrap
    rounded-full
    bg-[var(--color-white)]
    px-4 py-2
    text-[0.85rem]
    font-bold
    text-black
    shadow-sm
    transition-all duration-150
    hover:bg-[var(--color-accent)] hover: shadow-md
    ${activeCat === c ? "scale-105 shadow-md ring-2 ring-white/60" : ""}
  `}
              onClick={() => go({ cat: c, page: 1, q: "" })}
            >
              {CAT_ICON[c] && <span className="mr-1">{CAT_ICON[c]}</span>}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 검색창-2 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-[420px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
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
      </div >


      {/* 그리드카드 */}
      {
        loading ? (
          <div className="grid-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card" style={{ height: 220, background: 'var(--bg-surface)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p>{q ? `"${q}" 검색 결과가 없습니다.` : '등록된 식당이 없습니다.'}</p>
            {q && (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}
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
              />
            ))}
          </div>
        )
      }


      {/* 페이지네이션 */}
      {
        pagination.pages > 1 && (
          <div className="pagination">
            {/* 처음 */}
            {pagination.page > 1 && (
              <button className="page-btn" onClick={() => go({ page: 1 })}>{'<<'}</button>
            )}
            {/* 이전 */}
            {pagination.has_prev && (
              <button className="page-btn" onClick={() => go({ page: page - 1 })}>{'<'}</button>
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
              <button className="page-btn" onClick={() => go({ page: page + 1 })}>{'>'}</button>
            )}
            {/* 끝 */}
            {pagination.page < pagination.pages && (
              <button className="page-btn" onClick={() => go({ page: pagination.pages })}>{'>>'}</button>
            )}
          </div>
        )
      }
    </>
  )
}
