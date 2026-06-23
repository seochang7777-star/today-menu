import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import RestaurantCard from '../components/RestaurantCard'

const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '치킨', '피자', '카페', '술집']

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cat  = searchParams.get('cat')  ?? '전체'
  const page = Number(searchParams.get('page') ?? 1)
  const q    = searchParams.get('q')   ?? ''

  const [items,      setItems]      = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 })
  const [loading,    setLoading]    = useState(false)
  const [searchInput, setSearchInput] = useState(q)

  const fetchData = useCallback(() => {
    setLoading(true)
    getRestaurants({ cat, q, page })
      .then((d) => {
        setItems(d.items ?? [])
        setPagination({ total: d.total, pages: d.pages, page: d.page })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cat, q, page])

  useEffect(() => { fetchData() }, [fetchData])

  const go = (params) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(params).forEach(([k, v]) => {
        if (v == null) next.delete(k)
        else next.set(k, String(v))
      })
      return next
    })

  const handleSearch = () => go({ q: searchInput, page: 1 })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6">🍽️ 메뉴 찾기</h1>

      {/* 검색 */}
      <div className="flex gap-2 mb-5">
        <input
          className="input flex-1"
          placeholder="식당명 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="btn-dark">검색</button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => go({ cat: c, page: 1, q: '' })}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors
              ${cat === c
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 결과 수 */}
      <p className="text-sm text-gray-400 mb-4">총 {pagination.total}개</p>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🍴</p>
          <p className="text-sm">
            {q ? `"${q}" 검색 결과가 없습니다` : '등록된 식당이 없습니다'}
          </p>
          {q && (
            <button onClick={() => { setSearchInput(''); go({ q: '', page: 1 }) }}
              className="btn-secondary mt-4 text-sm">
              전체 보기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((r) => <RestaurantCard key={r.id} rest={r} />)}
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-1.5 mt-8 flex-wrap">
          {page > 1 && (
            <button onClick={() => go({ page: page - 1 })}
              className="btn-outline px-3 py-1.5 text-sm">‹</button>
          )}
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => go({ page: p })}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
                ${p === page
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 hover:bg-gray-100'
                }`}
            >
              {p}
            </button>
          ))}
          {page < pagination.pages && (
            <button onClick={() => go({ page: page + 1 })}
              className="btn-outline px-3 py-1.5 text-sm">›</button>
          )}
        </div>
      )}
    </div>
  )
}
