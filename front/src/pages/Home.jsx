import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRestaurants, getNearby } from '../api/services'
import RestaurantCard from '../components/RestaurantCard'

const CAT_LIST = [
  { name: '한식', icon: '🍚' }, { name: '일식', icon: '🍣' },
  { name: '중식', icon: '🥟' }, { name: '양식', icon: '🥩' },
  { name: '분식', icon: '🍜' }, { name: '치킨', icon: '🍗' },
  { name: '피자', icon: '🍕' }, { name: '카페', icon: '☕' },
]

export default function Home() {
  const [trending,   setTrending]   = useState([])
  const [nearby,     setNearby]     = useState([])
  const [locStatus,  setLocStatus]  = useState('idle') // idle | loading | done | error

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 })
      .then((d) => setTrending(d.items?.slice(0, 8) ?? []))
      .catch(() => {})
  }, [])

  const findNearby = () => {
    if (!navigator.geolocation) return alert('위치 서비스를 지원하지 않는 브라우저입니다.')
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getNearby({ lat: coords.latitude, lng: coords.longitude })
          setNearby(data)
          setLocStatus('done')
        } catch {
          setLocStatus('error')
        }
      },
      () => setLocStatus('error'),
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

      {/* 히어로 */}
      <section className="bg-gray-900 rounded-2xl px-8 py-12 text-white">
        <h1 className="text-3xl md:text-4xl font-black mb-3">오늘 뭐 먹지? 🤔</h1>
        <p className="text-gray-300 text-lg mb-7">AI가 내 취향에 맞는 메뉴를 찾아드려요</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={findNearby}
            disabled={locStatus === 'loading'}
            className="btn-primary"
          >
            {locStatus === 'loading' ? '📡 위치 확인 중...' : '📍 내 주변 식당'}
          </button>
          <Link to="/menu"  className="btn-outline text-white border-white/30 hover:bg-white/10">
            🍽️ 전체 메뉴
          </Link>
          <Link to="/party" className="btn-outline text-white border-white/30 hover:bg-white/10">
            👥 밥친구 찾기
          </Link>
        </div>
      </section>

      {/* 카테고리 */}
      <section>
        <h2 className="text-lg font-bold mb-4">카테고리</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {CAT_LIST.map(({ name, icon }) => (
            <Link
              key={name}
              to={`/menu?cat=${name}`}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-full bg-white border border-gray-200 hover:border-gray-400
                              flex items-center justify-center text-2xl transition-colors shadow-sm">
                {icon}
              </div>
              <span className="text-xs font-semibold text-gray-600">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 내 주변 */}
      {locStatus === 'error' && (
        <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">
          위치 권한을 허용해주세요
        </p>
      )}
      {locStatus === 'done' && (
        <section>
          <h2 className="text-lg font-bold mb-4">
            📍 내 주변 500m
            <span className="ml-2 text-sm font-normal text-gray-400">({nearby.length}개)</span>
          </h2>
          {nearby.length === 0 ? (
            <p className="text-gray-400 text-sm">주변 500m 내 등록된 식당이 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {nearby.slice(0, 8).map((r) => (
                <RestaurantCard key={r.id} rest={r} showDist />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 인기 맛집 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">🔥 인기 맛집 TOP 8</h2>
          <Link to="/menu" className="text-sm text-blue-500 hover:underline">전체 보기 →</Link>
        </div>
        {trending.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍴</p>
            <p className="text-sm">등록된 식당이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trending.map((r) => (
              <RestaurantCard key={r.id} rest={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
