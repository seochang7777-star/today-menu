import { Link, useNavigate } from 'react-router-dom'
import RestaurantImage from './RestaurantImage'

const cardClass =
  'group block h-full overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-white text-inherit no-underline shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow)]'
const imageWrapClass =
  'relative h-[250px] overflow-hidden bg-[#FFF4EA] max-[540px]:h-[130px]'
const likeButtonClass =
  'absolute right-3 top-3 grid h-[30px] w-[30px] place-items-center rounded-full bg-white/90 text-[1.45rem] leading-none text-[#5B4038] shadow-[0_4px_12px_rgba(0,0,0,0.14)] transition hover:scale-105'
const likedButtonClass = 'text-[var(--color-primary)]'
const bodyClass = 'px-[18px] pb-[18px] pt-4 max-[540px]:p-[14px]'
const titleClass = 'mb-1.5 text-[1.08rem] font-black text-[var(--text-primary)]'
const metaClass =
  'mb-[5px] flex items-center gap-1 text-[0.88rem] text-[var(--text-secondary)]'
const scoreClass = 'font-black text-[var(--color-primary)]'
const reviewClass = 'text-[var(--text-secondary)]'
const addressClass =
  'mb-[14px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] text-[var(--text-secondary)]'
const tagRowClass = 'flex flex-wrap gap-[7px]'
const tagClass =
  'rounded-[7px] bg-[#FFF0E4] px-2 py-[5px] text-[0.78rem] font-extrabold text-[var(--color-primary)] max-[540px]:text-[0.72rem]'

function getStars(rating) {
  const score = Math.min(Math.max(Math.round(rating ?? 0), 0), 5)
  return '★'.repeat(score).padEnd(5, '☆')
}

export default function Cafeteria({
  item,
  to,
  liked = false,
  onToggleLike,
  className = '',
  fallbackImage,
}) {
  if (!item) return null

  const rating = item.avg_rating ?? 0
  const category = item.category || '기타'
  const address = item.address || '오늘 뭐먹지 추천 맛집'
  const tags = item.tags ?? [`#${category || '맛집'}`, '#추천', '#오늘뭐먹지']

  const handleLikeClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onToggleLike?.(item)
  }

  const content = (
    <>
      <div className={imageWrapClass}>
        <RestaurantImage
          imageUrl={item.image_url ?? item.image ?? fallbackImage}
          category={category}
          name={item.name}
          id={item.id ?? item.restaurant_id}
          height={250}
        />

        <button
          type="button"
          className={`${likeButtonClass} ${liked ? likedButtonClass : ''}`}
          onClick={handleLikeClick}
          aria-label={liked ? '찜 해제' : '찜하기'}
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>

      <div className={bodyClass}>
        <div className={titleClass}>{item.name}</div>

        <div className={metaClass}>
          <span className={scoreClass}>{getStars(rating)}</span>
          <span className={scoreClass}>{rating.toFixed(1)}</span>
          <span className={reviewClass}>({item.review_count ?? 0})</span>
        </div>

        <div className={addressClass}>
          {category} {'·'} {address}
        </div>

        <div className={tagRowClass}>
          {tags.slice(0, 3).map((tag) => (
            <span className={tagClass} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </>
  )

  const mergedClassName = `${cardClass} ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={mergedClassName}>
        {content}
      </Link>
    )
  }

  return <div className={mergedClassName}>{content}</div>
}
