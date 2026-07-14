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
  const q = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(q)

  const [allParties, setAllParties] = useState([])
  const [loading, setLoading] = useState(false)

  // 페이지 로드 시 전체 데이터 단 1회 요청
  useEffect(() => {
  setLoading(true)
  getParties({}) 
    .then((d) => {
      setAllParties(Array.isArray(d) ? d : [])
    })
    .catch(() => setAllParties([]))
    .finally(() => setLoading(false))
}, [status])

  const pct = (p) => Math.min(Math.round((p.member_count / p.max_people) * 100), 100)

  // 실시간 전체 카운팅 연동
  const getStatusCount = (s) => allParties.filter(p => p.status === s).length

  const handleSearch = () => {
    const keyword = searchInput.trim()
    setSearchParams(keyword ? { status, q: keyword } : { status })
  }

  // 현재 탭에 맞춰 프론트엔드 필터링
  const filteredParties = allParties.filter((p) => {
    const keyword = q.trim().toLowerCase()
    const matchesStatus = p.status === status
    if (!keyword) return matchesStatus

    return (
      matchesStatus &&
      [p.title, p.restaurant?.name, p.restaurant?.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    )
  })
  const joinedParties = allParties.filter((p) => {
    if (!user) return false

    const isCompleted = p.status === 'COMPLETED' || p.status === 'CANCELLED';
    if (isCompleted) return false;

    return (
      p.is_member ||
      p.isMember ||
      p.joined ||
      p.members?.some((m) => m.user?.user_id === user.user_id || m.user_id === user.user_id)
    )
  })

  return (
    <div className="max-w-[1400px] pb-13">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-start">
        <main className="min-w-0">
      {/* 상단 배너 영역 */}
      <div className="my-[2px] flex items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1 mt-5">
            <span className="text-[#FF5A5A]">
              <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8 fill-[#F46C6F]"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
            </span>
            밥친구 매칭
          </h1>
          <p className="text-sm text-gray-500 font-medium">같은 식당을 가고 싶은 사람들과 함께해요!</p>
        </div>
      </div>
      <div className="-mt-3 flex flex-col sm:flex-row justify-between items-center gap-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex h-12 w-full max-w-[420px] items-center gap-4 max-[540px]:order-last max-[540px]:pb-5"
        >
          <input
            type="text"
            placeholder="식당명을 검색하세요"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-[rgba(244,108,111,0.8)] bg-white px-8 text-[0.92rem] font-semibold text-[var(--text-primary)] shadow-[0_4px_18px_rgba(244,108,111,0.08)] outline-none placeholder:text-[#9D8C86]"
          />
          <button
            type="submit"
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-0 bg-[linear-gradient(135deg,var(--color-primary),#F98082)] text-[1.8rem] font-bold text-white shadow-[0_4px_18px_rgba(244,108,111,0.16)] transition hover:brightness-105 hover:shadow-md"
            aria-label="검색"
          >
            <span className="relative -top-[4px] leading-none">⌕</span>
          </button>
        </form>

        <img
          src="/img/banner/party_diner.png"
          alt="식사하는 사람들"
          className="w-[200px] md:w-[240px] h-auto object-contain flex-shrink-0 select-none max-[540px]:order-first max-[540px]:pt-4"
        />
      </div>

      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium flex justify-between items-center">
          <span>⚠️ 파티 참여 및 생성은 회원만 가능합니다.</span>
          <Link to="/login" className="text-blue-600 font-bold hover:underline">로그인하기</Link>
        </div>
      )}

      {/* 하나의 흰색 박스: 컨트롤 바 + 파티 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* 컨트롤 바 (상태 탭) */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {['RECRUITING', 'CLOSED', 'COMPLETED'].map((s) => {
            const isActive = status === s;
            return (
              <button
                key={s}
                onClick={() => setSearchParams(q ? { status: s, q } : { status: s })}
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
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 text-sm font-medium">
            {STATUS_LABEL[status]}인 파티가 없습니다
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredParties.map((p) => (
            <div 
              key={p.party_id} 
              className="p-4 hover:bg-gray-50/60 transition-colors flex flex-col md:flex-row gap-5"
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
                    자세히 보기 <span className='pl-1 pr-0'>›</span>
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
      </div>
      {/* 흰색 박스 끝 */}
        </main>

        <aside className="mt-5 rounded-2xl border border-[#FFE2E2] ml-7 bg-[#FFFDF7] shadow-sm lg:sticky lg:top-24 max-[540px]:ml-0">
          <div className="border-b border-[#FFE2E2] px-5 py-4">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-[#F46C6F]"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <h2 className="text-base font-black text-gray-900">내가 참여 중인 모임</h2>
              <span className="rounded-full bg-[#F46C6F] px-2 py-0.5 text-xs font-black text-white">
                {joinedParties.length}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-gray-500">
              현재 참여하고 있는 모임이에요
            </p>
          </div>

          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
            {!user ? (
              <div className="rounded-xl bg-[#FFF8F5] px-4 py-8 text-center">
                <p className="text-sm font-bold text-gray-700">로그인이 필요해요</p>
                <p className="mt-1 text-xs text-gray-500">참여 중인 모임은 로그인 후 볼 수 있어요.</p>
              </div>
            ) : joinedParties.length === 0 ? (
              <div className="rounded-xl bg-[#FFF8F5] px-4 py-8 text-center">
                <div className="mb-2 text-3xl">🍽️</div>
                <p className="text-sm font-bold text-gray-700">참여 중인 모임이 없어요</p>
                <p className="mt-1 text-xs text-gray-500">마음에 드는 밥친구 모임에 참여해보세요.</p>
              </div>
            ) : (
              joinedParties.map((p) => (
                <Link
                  key={p.party_id}
                  to={`/party/${p.party_id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-[#F46C6F]/50 hover:shadow-md"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <RestaurantImage
                      imageUrl={p.restaurant?.image_url}
                      category={p.restaurant?.category}
                      name={p.restaurant?.name}
                      height="100%"
                      iconSize="1.5rem"
                    />
                  </div>

                  <div className="min-w-2 flex-1">
                    <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                      p.status === 'COMPLETED' 
                        ? 'bg-gray-100 text-gray-500' 
                        : 'bg-[#FFF1F1] text-[#F46C6F]'
                    }`}>
                      {p.status === 'COMPLETED' ? '참여 종료' : '참여 중'}
                    </span>

                    <h3 className="truncate text-sm font-black text-gray-900">
                      {p.title}
                    </h3>

                    <p className="mt-1 truncate text-xs font-medium text-gray-500">
                      {p.restaurant?.name ?? '식당 정보 없음'}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-gray-500">
                      <span>👥 {p.member_count}/{p.max_people}명</span>
                      <span>
                        {p.meeting_time
                          ? new Date(p.meeting_time).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  <span className="self-center text-lg text-gray-300">›</span>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
