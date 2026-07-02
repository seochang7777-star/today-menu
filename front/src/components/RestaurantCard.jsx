import { useNavigate } from 'react-router-dom'
import RestaurantImage from './RestaurantImage'

const cardClass =
  'block overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-white text-inherit no-underline shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow)]'
const imageWrapClass = 'h-[250px] overflow-hidden bg-[#FFF4EA] max-[540px]:h-[130px]'
const bodyClass = 'px-[18px] pb-[18px] pt-7 max-[540px]:p-[14px]'
const categoryBadgeClass =
  'inline-flex rounded-[var(--border-radius)] bg-[var(--color-primary)] px-2 py-[5px] text-[0.78rem] font-extrabold text-white'
const titleClass = 'mt-5 mb-1.5 text-[1.08rem] font-black text-[var(--text-primary)]'
const metaClass = 'mt-1.3 mb-[5px] flex items-center gap-1 text-[0.88rem] text-[var(--text-secondary)]'
const scoreClass = 'font-black text-[var(--color-primary)]'
const addressClass = 'overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] text-[var(--text-secondary)]'
const phoneClass = 'mt-1 text-[0.72rem] text-[var(--text-muted)]'
const badgeRowClass = 'mt-2 flex flex-wrap gap-3'
const mutedBadgeClass =
  'inline-flex rounded-[var(--border-radius)] bg-[var(--bg-surface)] px-2 py-[5px] text-[0.7rem] font-semibold text-[var(--text-muted)]'
const partyBadgeClass =
  'inline-flex rounded-[var(--border-radius)] bg-[#F0FFF4] px-2 py-[5px] text-[0.7rem] font-semibold text-[var(--color-success)]'

function getStars(rating) {
  const score = Math.min(Math.max(Math.round(rating ?? 0), 0), 5)
  return '★'.repeat(score).padEnd(5, '☆')
}
// const stars = '★'.repeat(score) + '☆'.repeat(5 - score)
export default function RestaurantCard({
  restaurant,
  r,
  to,
  showPartyBadge = false,
  showReviewBadge = true,
  showPhone = true,
  className = '',
  onClick,
}) {
  const navigate = useNavigate()
  const item = restaurant ?? r

  if (!item) return null

  const rating = item.avg_rating ?? 0

  //const category = item.category || ''는 식당 데이터에 카테고리가 있으면 그 값을 쓰고, 없으면 빈 문자열을 쓰겠다는 뜻이에요.
  const category = item.category || ''
  const reviewCount = item.review_count ?? Math.floor(rating * 10)
  const content = (
    <>
      <div className={imageWrapClass}>
        <RestaurantImage
          imageUrl={item.image_url ?? item.image}
          category={item.category}
          name={item.name}
          height="100%"
        />
      </div>

      <div className={bodyClass}>
        <span className={categoryBadgeClass}>{category}</span>
        <div className={titleClass}>{item.name}</div>
        <div className={metaClass}>
          <span className={scoreClass}>{getStars(rating)}</span>
          <span className={scoreClass}>{rating.toFixed(1)}</span>
        </div>
        <div className={addressClass}>{item.address}</div>

        {showPhone && item.phone && (
          <div className={phoneClass}>
            {'📞'} {item.phone}
          </div>
        )}

        {(showReviewBadge || showPartyBadge) && (
          <div className={badgeRowClass}>
            {showReviewBadge && (
              <span className={mutedBadgeClass}>
                {'리뷰'} {reviewCount}
              </span>
            )}
            {showPartyBadge && (
              <span className={partyBadgeClass}>
                {'파티참여가능'}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )

  const mergedClassName = `${cardClass} ${className}`.trim()

  if (to) {
    return (
      <div className={mergedClassName} onClick={()=>{navigate(to)}}
      // onClick={onClick}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      className={mergedClassName}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content}
    </div>
  )
}
