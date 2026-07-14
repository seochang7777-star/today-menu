import ReviewModal from '../components/ReviewModal'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createReview, logRestaurantClick, getRestaurant, getReviews, toggleLike, createLikeLog } from '../api/services'
import { useAuth } from '../App'
import KakaoMap from '../components/KakaoMap'
import RestaurantImage from '../components/RestaurantImage'

function clampRating(value) {
  return Math.min(Math.max(Math.round(Number(value) || 0), 0), 5)
}

function Stars({ value, size = 'text-sm', interactive = false, onSelect, hovered = 0, onHover }) {
  const active = hovered || clampRating(value)

  const likeButtonClass =
  'grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[1.45rem] leading-none text-[#5B4038] shadow-[0_4px_9px_rgba(0,0,0,0.14)] transition hover:scale-105 active:scale-95'
const likedButtonClass = 'text-[var(--color-primary)]'

  return (
    <div className={`inline-flex items-center gap-[1px] ${size}`} aria-label={`별점 ${active}점`}>
      {[1, 2, 3, 4, 5].map((score) => {
        const filled = score <= active

        if (!interactive) {
          return (
            <span key={score} className={filled ? 'text-[var(--color-accent)]' : 'text-[#E7DCD2]'}>
              ★
            </span>
          )
        }

        return (
          <button
            key={score}
            type="button"
            onClick={() => onSelect?.(score)}
            onMouseEnter={() => onHover?.(score)}
            onMouseLeave={() => onHover?.(0)}
            className={`text-xl leading-none transition ${filled ? 'text-[var(--color-accent)]' : 'text-[#E7DCD2]'
              }`}
            aria-label={`${score}점 선택`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export default function MenuDetail() {
  const { restId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [rest, setRest] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewAvg, setReviewAvg] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleToggleLike = async () => {
  if (!user) {
    navigate('/login');
    return;
  }

  const previousLiked = rest.is_liked;
  const previousLogId = rest.log_id;

  // 1. UI 낙관적 업데이트
  setRest(prev => ({
    ...prev,
    is_liked: !prev.is_liked,
    like_count: prev.is_liked ? prev.like_count - 1 : prev.like_count + 1
  }));

  try {
    if (previousLogId) {
      const res = await toggleLike(previousLogId)
      setRest(prev => ({ ...prev, is_liked: res.liked }))
    } else {
      const res = await createLikeLog(rest.id)
      setRest(prev => ({ ...prev, is_liked: true, log_id: res.log_id }))
    }
  } catch (error) {
    // 3. 실패 시 롤백
    setRest(prev => ({
      ...prev,
      is_liked: previousLiked,
      like_count: previousLiked ? prev.like_count + 1 : prev.like_count - 1
    }));
    alert('찜 처리 중 오류가 발생했습니다.');
  }
};

  const loadReviews = useCallback(() => {
    getReviews(restId)
      .then((data) => {
        const nextReviews = data.reviews ?? []
        setReviews(nextReviews)
        setReviewAvg(data.avg_rating ?? 0)
        setReviewCount(data.count ?? nextReviews.length)

        if (user) {
          const mine = nextReviews.find((review) => review.user_id === user.user_id)
          if (mine) {
            setRating(mine.rating ?? 0)
            setContent(mine.content ?? '')
          }
        }
      })
      .catch(() => {
        setReviews([])
        setReviewAvg(0)
        setReviewCount(0)
      })
  }, [restId, user])

  useEffect(() => {
    getRestaurant(restId)
      .then(setRest)
      .catch(() => navigate('/menu'))

      logRestaurantClick(restId)
    .catch(err => console.error('조회수 기록 실패:', err))
    
  }, [navigate, restId])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const avgRating = reviewCount ? reviewAvg : rest?.avg_rating ?? 0

  const ratingBreakdown = useMemo(() => {
    return [5, 4, 3, 2, 1].map((score) => {
      const count = reviews.filter((review) => clampRating(review.rating) === score).length
      return {
        score,
        count,
        percent: reviewCount ? Math.round((count / reviewCount) * 100) : 0,
      }
    })
  }, [reviewCount, reviews])

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!rating) {
      setMessage('별점을 선택해 주세요.')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      await createReview(restId, { rating, content })
      setMessage('리뷰가 등록되었습니다.')
      await loadReviews()
    } catch (error) {
      setMessage(error.response?.data?.message || '리뷰 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!rest) {
    return (
      <div className="py-16 text-center text-[var(--text-muted)]">
        로딩 중...
      </div>
    )
  }
  

  
  return (
    <>
      <div className="mx-auto max-w-[1134px] pb-12">
        
        <section className="overflow-hidden rounded-[8px] border border-[var(--border-color)] bg-white shadow-[var(--shadow-sm)]">
          <div className="relative h-[220px] overflow-hidden sm:h-[260px] lg:h-[300px]">
            <RestaurantImage
              imageUrl={rest.image_url ?? rest.image}
              category={rest.category}
              name={rest.name}
              id={rest.id ?? rest.restaurant_id ?? restId}
              height="100%"
              iconSize="5rem"
            />

            {/* 뒤로가기 버튼 */}
            <button
              type="button"
              onClick={() => navigate('/menu')}
              aria-label="목록으로 이동"
              className="absolute top-4 left-4 z-20 transition hover:scale-160"
            >
              <img
                src="/img/icon/arrow_left.png" alt="뒤로가기"
                className="h-10 w-10"
              />
            </button>
            
          </div>

          <div className="relative px-5 py-5 sm:px-7">
             <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleToggleLike} // 찜하기 로직 함수
                className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[1.4rem] shadow-sm transition hover:scale-105 active:scale-95"
              >
                <span className={rest.is_liked ? "text-[var(--color-primary)]" : "text-[#D1D1D1]"}>
                  ♥
                </span>
              </button>
              <span className="text-xs font-bold text-[var(--text-primary)] drop-shadow-md">
                {rest.like_count ?? 0}
              </span>
            </div>

            <div className="mb-2 text-sm font-bold text-[var(--text-muted)]">
              {rest.category || '음식'}
            </div>

            <h1 className="mb-2 text-[1.55rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.8rem]">
              {rest.name}
            </h1>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Stars value={avgRating} size="text-base" />
              <span className="font-black text-[var(--color-primary)]">
                {Number(avgRating).toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                리뷰 {reviewCount.toLocaleString()}개
              </span>
            </div>

            <p className="text-sm font-semibold text-[var(--text-muted)]">
              {rest.address}
            </p>

            {rest.phone && (
              <a
                href={`tel:${rest.phone}`}
                className="mt-1 inline-block text-sm font-bold text-[var(--color-info)]"
              >
                {rest.phone}
              </a>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[8px] border border-[var(--border-color)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <h2 className="mb-4 text-sm font-black text-[var(--text-primary)]">
                매장 정보
              </h2>

              <div className="space-y-3 text-sm font-semibold text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => navigate('/party/create', { state: { restaurant: rest } })}
                  className="w-full rounded-[8px] bg-[var(--color-primary)] px-4 py-3 font-black text-white transition hover:bg-[var(--color-primary-dark)]"
                >
                  같이 먹을 파티 만들기
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/party')}
                  className="w-full rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 font-black text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-2)]"
                >
                  모집 중인 파티 보기
                </button>
              </div>
            </section>

            <section className="rounded-[8px] border border-[var(--border-color)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <h2 className="mb-3 text-sm font-black text-[var(--text-primary)]">
                위치 정보
              </h2>

              <p className="mb-3 text-sm font-semibold leading-6 text-[var(--text-muted)]">
                {rest.address}
              </p>
              {rest.business_hours && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: '.85rem' }}>
                  <span>🕐</span>
                  <span style={{ fontWeight: 700 }}>{rest.business_hours}</span>
                </div>
              )}

              {rest.latitude && rest.longitude ? (
                <>
                  <KakaoMap
                    center={{ lat: rest.latitude, lng: rest.longitude }}
                    markers={[
                      {
                        lat: rest.latitude,
                        lng: rest.longitude,
                        name: rest.name,
                        category: rest.category,
                      },
                    ]}
                    height="220px"
                  />

                  <a
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(rest.name)},${rest.latitude},${rest.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-[8px] border border-[var(--border-color)] bg-white px-4 py-2.5 text-center text-sm font-black text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface)]"
                  >
                    카카오맵에서 보기
                  </a>
                </>
              ) : (
                <div className="flex h-[180px] items-center justify-center rounded-[8px] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-muted)]">
                  위치 정보가 없습니다.
                </div>
              )}
            </section>
          </aside>

          <main className="space-y-4">
            <section className="rounded-[8px] border border-[var(--border-color)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
              <div className="grid gap-6 sm:grid-cols-[120px_1fr] sm:items-center">
                <div>
                  <div className="text-[2.8rem] font-black leading-none text-[var(--text-primary)]">
                    {Number(avgRating).toFixed(1)}
                  </div>
                  <div className="mt-2">
                    <Stars value={avgRating} size="text-base" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">
                    리뷰 {reviewCount.toLocaleString()}개
                  </p>
                </div>

                <div className="space-y-2">
                  {ratingBreakdown.map(({ score, percent }) => (
                    <div
                      key={score}
                      className="grid grid-cols-[18px_1fr_38px] items-center gap-2 text-xs font-bold text-[var(--text-muted)]"
                    >
                      <span>{score}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-right">{percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[8px] border border-[var(--border-color)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
              <h2 className="mb-3 text-base font-black text-[var(--text-primary)]">
                리뷰 작성
              </h2>

              {user ? (
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <Stars
                      value={rating}
                      interactive
                      hovered={hoveredRating}
                      onSelect={setRating}
                      onHover={setHoveredRating}
                    />
                    <span className="text-sm font-bold text-[var(--text-muted)]">
                      {rating ? `${rating}점` : '별점을 선택해 주세요'}
                    </span>
                  </div>

                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={3}
                    placeholder="방문 경험을 남겨주세요."
                    className="w-full resize-none rounded-[8px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--color-primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(244,108,111,0.14)]"
                  />

                  {message && (
                    <p className="mt-2 text-sm font-bold text-[var(--color-primary)]">
                      {message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-3 rounded-[8px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? '등록 중...' : '리뷰 등록'}
                  </button>
                </div>
              ) : (
                <div className="rounded-[8px] bg-[var(--bg-surface)] px-4 py-4">
                  <p className="mb-3 text-sm font-bold text-[var(--text-muted)]">
                    로그인한 사용자만 리뷰를 작성할 수 있습니다. 다른 사람들의 리뷰는 아래에서 볼 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="rounded-[8px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[var(--color-primary-dark)]"
                  >
                    로그인하고 리뷰 쓰기
                  </button>
                </div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {reviews.length === 0 ? (
                <div className="col-span-full rounded-[8px] border border-dashed border-[var(--border-color)] bg-white px-4 py-10 text-center text-sm font-bold text-[var(--text-muted)]">
                  아직 등록된 리뷰가 없습니다.
                </div>
              ) : (
                reviews.map((review) => (
                  <article
                    key={review.review_id}
                    className="rounded-[8px] border border-[var(--border-color)] bg-white p-4 shadow-[var(--shadow-sm)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--bg-surface)] text-sm font-black text-[var(--color-primary)]">
                          {review.nickname?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-[var(--text-primary)]">
                            {review.nickname || '사용자'}
                          </div>
                          <div className="text-xs font-bold text-[var(--text-muted)]">
                            {review.created_at}
                          </div>
                        </div>
                      </div>

                      <Stars value={review.rating} size="text-sm" />
                    </div>

                    <p className="text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                      {review.content || '내용 없이 별점만 남긴 리뷰입니다.'}
                    </p>
                  </article>
                ))
              )}
            </section>
          </main>
        </div>
      </div>
      {showReview && (
        <ReviewModal
          restId={rest?.restaurant_id ?? rest?.id}
          restName={rest?.name}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  )
}
