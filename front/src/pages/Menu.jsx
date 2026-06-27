import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRestaurants } from '../api/services'
import RestaurantCard from '../components/RestaurantCard'

const CATEGORIES = ['전체','한식','일식','중식','양식','분식','치킨','피자','카페','술집']

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items,      setItems]      = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 })
  const [loading,    setLoading]    = useState(false)
  const [q,          setQ]          = useState(searchParams.get('q') || '')

  const cat  = searchParams.get('cat') || '전체'
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    setLoading(true)
    getRestaurants({ cat, q, page })
      .then(d => { setItems(d.items); setPagination({ total: d.total, pages: d.pages, page: d.page }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cat, page, q])

  const go = (params) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    Object.entries(params).forEach(([k, v]) => next.set(k, v))
    return next
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6">🍽️ 메뉴 찾기</h1>

      {/* 검색 */}
      <div className="flex gap-2 mb-4">
        <input className="input flex-1" placeholder="식당명 검색..."
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go({ q, page: 1 })} />
        <button onClick={() => go({ q, page: 1 })} className="btn-dark">검색</button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => go({ cat: c, page: 1 })}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-colors
              ${cat === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* 결과 카운트 */}
      <p className="text-sm text-gray-400 mb-4">총 {pagination.total}개</p>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-56 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🍴</div>
          <p>검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(r => <RestaurantCard key={r.id} rest={r} />)}
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8 flex-wrap">
          {page > 1 && (
            <button onClick={() => go({ page: page - 1 })}
              className="px-3 py-1.5 rounded-lg border text-sm font-semibold hover:bg-gray-100">‹</button>
          )}
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => go({ page: p })}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold
                ${p === page ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-100'}`}>
              {p}
            </button>
          ))}
          {page < pagination.pages && (
            <button onClick={() => go({ page: page + 1 })}
              className="px-3 py-1.5 rounded-lg border text-sm font-semibold hover:bg-gray-100">›</button>
          )}
        </div>
      )}
    </div>
  )
}
