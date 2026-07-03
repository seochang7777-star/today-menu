import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getParties } from '../api/services'
import { useAuth } from '../App'
import RestaurantImage from '../components/RestaurantImage'

const STATUS_LABEL = { RECRUITING: '모집 중', CLOSED: '마감', COMPLETED: '완료' }

export default function Party() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'RECRUITING'

  const [allParties, setAllParties] = useState([])
  const [loading, setLoading] = useState(false)

  // 페이지 로드 시 전체 데이터 단 1회 요청
  useEffect(() => {
    setLoading(true)
    getParties({}) 
      .then((d) => setAllParties(Array.isArray(d) ? d : []))
      .catch(() => setAllParties([]))
      .finally(() => setLoading(false))
  }, [])

  const pct = (p) => Math.min(Math.round((p.member_count / p.max_people) * 100), 100)

  // 실시간 전체 카운팅 연동
  const getStatusCount = (s) => allParties.filter(p => p.status === s).length

  // 현재 탭에 맞춰 프론트엔드 필터링
  const filteredParties = allParties.filter(p => p.status === status)

  return (
    <div className="max-w-[800px] mx-auto px-4 pb-12">
      {/* 상단 배너 영역 */}
      <div className="mb-8 p-6 bg-[#FFF8F5] rounded-2xl flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1">
            <span className="text-[#FF5A5A]">👥</span> 밥친구 매칭
          </h1>
          <p className="text-sm text-gray-500 font-medium">같은 식당을 가고 싶은 사람들과 함께해요!</p>
        </div>
      </div>

      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium flex justify-between items-center">
          <span>⚠️ 파티 참여 및 생성은 회원만 가능합니다.</span>
          <Link to="/login" className="text-blue-600 font-bold hover:underline">로그인하기</Link>
        </div>
      )}

      {/* 컨트롤 바 (상태 탭) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          {['RECRUITING', 'CLOSED', 'COMPLETED'].map((s) => {
            const isActive = status === s;
            return (
              <button
                key={s}
                onClick={() => setSearchParams({ status: s })}
                className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[#FF5A5A] bg-[#FFF5F5] text-[#FF5A5A]'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {STATUS_LABEL[s]}
                <span className={`inline-block px-1.5 py-0.2 text-[11px] rounded-full ${
                  isActive ? 'bg-[#FF5A5A] text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getStatusCount(s)}
                </span>
              </button>
            )
          })}
        </div>

        {user && status === 'RECRUITING' && (
          <Link
            to="/party/create"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#FF5A5A] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#E54E4E] transition-colors text-center"
          >
            + 모임방 만들기
          </Link>
        )}
      </div>

      {/* 파티 리스트 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 font-medium">로딩 중...</div>
      ) : filteredParties.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 text-sm font-medium">
            {STATUS_LABEL[status]}인 파티가 없습니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredParties.map((p) => (
            <div 
              key={p.party_id} 
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5"
            >
              {/* 왼쪽: 이미지 영역 (기존 크기 규격에 맞춰 조립) */}
              <div className="w-full md:w-[180px] h-[130px] rounded-xl overflow-hidden relative bg-gray-100 flex-shrink-0">
                <RestaurantImage 
                  imageUrl={p.restaurant?.image_url} 
                  category={p.restaurant?.category} 
                  name={p.restaurant?.name}
                  height={130} 
                  iconSize="2rem" 
                />
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-[6px] text-[11px] font-black tracking-tight z-10 ${
                  p.status === 'RECRUITING' ? 'bg-green-600 text-white' : p.status === 'CLOSED' ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>

              {/* 오른쪽: 콘텐츠 영역 */}
              <div className="flex-1 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <h3 className="text-lg font-black text-gray-900">{p.title}</h3>
                    <span className="text-xs text-gray-400 font-semibold">
                      {p.restaurant?.category}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-500 mb-3">
                    <span className="flex items-center gap-1 text-rose-500/90">
                      📅 {p.meeting_time ? new Date(p.meeting_time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-500">
                      👤 {p.member_count}/{p.max_people}명
                    </span>
                    <span className="text-gray-400 font-normal">
                      호스트: {p.host?.nickname ?? ''}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 font-medium">
                    🍽️ {p.restaurant?.name ?? '식당 정보 없음'}
                  </p>
                </div>

                {/* 하단 영역: 프로그레스 바 + 상세보기 */}
                <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-auto">
                  <div className="flex items-center gap-3 w-1/2 max-w-[200px]">
                    <div className="h-2 bg-gray-100 rounded-full flex-1 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          p.member_count >= p.max_people ? 'bg-amber-500' : 'bg-[#FF5A5A]'
                        }`}
                        style={{ width: `${pct(p)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-gray-600">{pct(p)}%</span>
                  </div>

                  <Link
                    to={`/party/${p.party_id}`}
                    className="px-4 py-1.5 bg-[#FFF5F5] hover:bg-[#FFEAE6] text-[#FF5A5A] text-xs font-black rounded-lg border border-[#FFE2E2] transition-colors flex items-center gap-0.5"
                  >
                    자세히 보기 <span className="text-[10px]">→</span>
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}