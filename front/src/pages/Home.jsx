import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRestaurants, getNearby } from '../api/services'
import RestaurantCard from '../components/RestaurantCard'

export default function Home() {
  const [trending, setTrending] = useState([])
  const [nearby,   setNearby]   = useState([])
  const [locStatus, setLocStatus] = useState('idle')  // idle | loading | done | error

  useEffect(() => {
    getRestaurants({ cat: '전체', page: 1 })
      .then(d => setTrending(d.items?.slice(0, 8) ?? []))
      .catch(() => {})
  }, [])

  const findNearby = () => {
    if (!navigator.geolocation) return alert('위치 서비스 미지원')
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
      () => setLocStatus('error')
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

      {/* 히어로 */}
      <section className="bg-gray-900 rounded-2xl p-8 md:p-12 text-white">
        <h1 className="text-3xl md:text-4xl font-black mb-3">오늘 뭐 먹지? 🤔</h1>
        <p className="text-gray-300 mb-6 text-lg">AI가 내 취향에 맞는 메뉴를 찾아드려요</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={findNearby}
            disabled={locStatus === 'loading'}
            className="btn-primary">
            {locStatus === 'loading' ? '📡 확인 중...' : '📍 내 주변 식당'}
          </button>
          <Link to="/menu" className="btn-secondary text-gray-900">🍽️ 전체 메뉴 보기</Link>
          <Link to="/party" className="btn-secondary text-gray-900">👥 밥친구 찾기</Link>
        </div>
      </section>

      {/* 카테고리 */}
      <section>
        <h2 className="text-lg font-bold mb-4">카테고리</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['한식','일식','중식','양식','분식','치킨','피자','카페'].map(cat => (
            <Link key={cat} to={`/menu?cat=${cat}`}
              className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl transition-colors">
                {{'한식':'🍚','일식':'🍣','중식':'🥟','양식':'🥩','분식':'🍜','치킨':'🍗','피자':'🍕','카페':'☕'}[cat]}
              </div>
              <span className="text-xs font-semibold text-gray-600">{cat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 내 주변 */}
      {locStatus === 'done' && (
        <section>
          <h2 className="text-lg font-bold mb-4">📍 내 주변 500m ({nearby.length}개)</h2>
          {nearby.length === 0
            ? <p className="text-gray-400 text-sm">주변 식당이 없습니다</p>
            : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {nearby.slice(0, 8).map(r => (
                  <RestaurantCard key={r.id} rest={r} showDist />
                ))}
              </div>
          }
        </section>
      )}
      {locStatus === 'error' && (
        <p className="text-red-500 text-sm">위치 권한을 허용해주세요</p>
      )}

      {/* 인기 맛집 */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">🔥 인기 맛집</h2>
          <Link to="/menu" className="text-sm text-blue-500 hover:underline">전체 보기 →</Link>
        </div>
        {trending.length === 0
          ? <p className="text-gray-400 text-sm">등록된 식당이 없습니다</p>
          : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trending.map(r => <RestaurantCard key={r.id} rest={r} />)}
            </div>
        }
      </section>
    </div>
  )
}
