const CAT_ICON = {
  한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜',
  치킨:'🍗', 피자:'🍕', 카페:'☕', 술집:'🍺',
}

export default function RestaurantCard({ rest, showDist = false, onClick }) {
  const icon  = CAT_ICON[rest.category] ?? '🍴'
  const score = Math.min(Math.max(Math.round(rest.avg_rating ?? 0), 0), 5)
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score)

  return (
    <div onClick={onClick} className="card rest-card"
      style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="card-img" style={{ fontSize: '2.5rem' }}>{icon}</div>
      <div className="card-body">
        <span className="badge badge-primary">{rest.category ?? '기타'}</span>
        <div className="card-title mt-8">{rest.name}</div>
        <div className="rest-meta" style={{ marginTop: 6 }}>
          <span className="stars" style={{ letterSpacing: 1 }}>{stars}</span>
          <span className="rest-rating">{(rest.avg_rating ?? 0).toFixed(1)}</span>
        </div>
        <div className="rest-addr">{rest.address}</div>
        {rest.phone && (
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
            📞 {rest.phone}
          </div>
        )}
        {showDist && rest.dist != null && (
          <div className="rest-dist" style={{ marginTop: 3 }}>🚶 {rest.dist}m</div>
        )}
      </div>
    </div>
  )
}
