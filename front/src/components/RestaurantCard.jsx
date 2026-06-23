const CAT_ICON = {
  한식: '🍚', 일식: '🍣', 중식: '🥟', 양식: '🥩', 분식: '🍜',
  치킨: '🍗', 피자: '🍕', 카페: '☕', 술집: '🍺',
}

export default function RestaurantCard({ rest, showDist = false, onClick }) {
  const icon  = CAT_ICON[rest.category] ?? '🍴'
  const score = Math.min(Math.max(Math.round(rest.avg_rating ?? 0), 0), 5)
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score)

  return (
    <div
      onClick={onClick}
      className={`card p-0 overflow-hidden flex flex-col ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 썸네일 */}
      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center text-4xl">
        {icon}
      </div>

      {/* 정보 */}
      <div className="p-3 flex flex-col gap-1">
        <span className="badge badge-primary">{rest.category ?? '기타'}</span>
        <p className="font-bold text-sm mt-0.5 truncate">{rest.name}</p>
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-xs tracking-widest leading-none">{stars}</span>
          <span className="text-xs text-gray-400">{(rest.avg_rating ?? 0).toFixed(1)}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{rest.address}</p>
        {showDist && rest.dist != null && (
          <p className="text-xs text-green-600 font-semibold">🚶 {rest.dist}m</p>
        )}
      </div>
    </div>
  )
}
