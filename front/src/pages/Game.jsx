import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { getAllMenus, getRandomMenus } from '../api/services'

// ── 카테고리 아이콘 (룰렛 시각용 & 결과 출력용 통일) ───────────────────────────
const CAT_ICON = {
  한식: '/img/category/korean.png',
  일식: '/img/category/japanese.webp',
  중식: '/img/category/chinese.webp',
  양식: '/img/category/steak.webp',
  분식: '/img/category/snack.webp',
  치킨: '/img/category/chicken.webp',
  카페: '/img/category/coffee.webp',
  술집: '/img/category/beer.webp'
}

const getCategoryIconPath = (categoryName) => {
  const normalizedCategory = categoryName === '피자' ? '양식' : categoryName;
  return CAT_ICON[normalizedCategory];
}

const CategoryIcon = ({ category, size = '3rem', style }) => {
  const iconPath = getCategoryIconPath(category);

  if (!iconPath) {
    return <span style={{ fontSize: size, ...style }}>🍴</span>;
  }

  return (
    <img
      src={iconPath}
      alt={category ?? '카테고리'}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  );
}

// 카테고리 선택 목록
const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '치킨', '카페', '술']


// ── 💡 [공통 추가] 모든 확장자(.jpg, .png, .webp) 대응 만능 이미지 컴포넌트 ──
// 파일 최상단에 두었기 때문에 Roulette, WorldCup 등 파일 내 모든 곳에서 공유 가능합니다.
const normalizeMenuName = (name) =>
  String(name ?? '').replace(/\s+/g, '').toLowerCase()

const SIMILAR_MENU_GROUPS = [
  {
    triggers: ['깐풍기', '깐풍새우', '라조기', '유린기', '깐쇼새우'],
    candidates: ['탕수육', '사천탕수육', '꿔바로우', '깐풍기', '깐풍새우', '라조기', '유린기'],
  },
  {
    triggers: ['해물짬뽕', '홍합짬뽕', '굴짬뽕', '삼선짬뽕', '차돌짬뽕', '짬뽕'],
    candidates: ['짬뽕', '삼선짬뽕', '차돌짬뽕', '홍합짬뽕', '굴짬뽕'],
  },
  {
    triggers: ['유니짜장', '고추짜장', '해물짜장', '사천짜장', '짜장'],
    candidates: ['짜장면', '간짜장', '쟁반짜장', '사천짜장'],
  },
  {
    triggers: ['치즈돈까스', '등심돈까스', '왕돈까스', '돈까스', '돈가스'],
    candidates: ['돈가스', '치즈돈가스'],
  },
  {
    triggers: ['마늘치킨', '간장치킨', '양념치킨', '크리스피치킨', '후라이드치킨', '치킨'],
    candidates: ['후라이드치킨', '양념치킨', '간장치킨', '마늘치킨', '핫크리스피'],
  },
]

const CATEGORY_MENU_FALLBACKS = [
  {
    category: '중식',
    keywords: ['중식', '중국', '짜장', '짬뽕', '탕수', '깐풍', '마라', '볶음밥', '새우', '딤섬', '만두'],
    candidates: ['짜장면', '짬뽕', '탕수육', '볶음밥', '마라탕'],
  },
  {
    category: '한식',
    keywords: ['찌개', '국밥', '불고기', '비빔밥', '김치', '제육', '갈비', '한식'],
    candidates: ['김치찌개', '된장찌개', '비빔밥', '제육볶음', '불고기'],
  },
  {
    category: '일식',
    keywords: ['초밥', '스시', '라멘', '우동', '돈까스', '돈가스', '가츠', '일식'],
    candidates: ['초밥', '돈가스', '라멘', '우동'],
  },
  {
    category: '양식',
    keywords: ['파스타', '스테이크', '리조또', '필라프', '양식'],
    candidates: ['토마토파스타', '크림파스타', '스테이크', '리조또'],
  },
  {
    category: '분식',
    keywords: ['떡볶이', '김밥', '순대', '라면', '튀김', '분식'],
    candidates: ['떡볶이', '김밥', '라면', '순대'],
  },
  {
    category: '치킨',
    keywords: ['치킨', '닭', '파닭', '콤보'],
    candidates: ['후라이드치킨', '양념치킨', '간장치킨'],
  },
]

const findMenuByNames = (menus, names) => {
  const wantedNames = names.map(normalizeMenuName)
  return menus.find((menu) => wantedNames.includes(normalizeMenuName(menu.name)))
}

const findBestMenuMatch = (input, menus) => {
  const inputName = normalizeMenuName(input)
  if (!inputName) return null

  const exactMatch = menus.find((menu) => normalizeMenuName(menu.name) === inputName)
  if (exactMatch) return exactMatch

  const containedMatch = menus
    .filter((menu) => {
      const menuName = normalizeMenuName(menu.name)
      return menuName && (inputName.includes(menuName) || menuName.includes(inputName))
    })
    .sort((a, b) => normalizeMenuName(b.name).length - normalizeMenuName(a.name).length)[0]
  if (containedMatch) return containedMatch

  const similarGroup = SIMILAR_MENU_GROUPS.find((group) =>
    [...group.triggers, ...group.candidates].some((name) => {
      const keyword = normalizeMenuName(name)
      return inputName.includes(keyword) || keyword.includes(inputName)
    })
  )
  if (similarGroup) {
    const groupMatch = findMenuByNames(menus, similarGroup.candidates)
    if (groupMatch) return groupMatch
  }

  const categoryFallback = CATEGORY_MENU_FALLBACKS.find((fallback) =>
    fallback.keywords.some((keyword) => inputName.includes(normalizeMenuName(keyword)))
  )
  if (categoryFallback) {
    return (
      findMenuByNames(menus, categoryFallback.candidates) ||
      menus.find((menu) => menu.category === categoryFallback.category)
    )
  }

  return null
}

const MenuImage = ({ item, size = '100%', height = 160, objectFit = 'cover' }) => {
  const extensions = ['jpg', 'png', 'webp', 'jpeg'];
  const [extIndex, setExtIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(`/img/menus/${item.id}.${extensions[0]}`);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setExtIndex(0);
    setImgSrc(`/img/menus/${item.id}.${extensions[0]}`);
    setIsError(false);
  }, [item.id]);

  const handleError = () => {
    const nextIndex = extIndex + 1;
    if (nextIndex < extensions.length) {
      setExtIndex(nextIndex);
      setImgSrc(`/img/menus/${item.id}.${extensions[nextIndex]}`);
    } else {
      setIsError(true);
    }
  };

  return (

    <div style={{
      width: size,
      height: '160px', // 💡 [핵심] 이미지 상자의 세로 높이를 160px로 절대 고정!
      margin: '0 auto',
      height,
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid var(--border-color)' // 글자 구분을 위한 하단 선 추가
    }}>
      {!isError ? (

        <img
          src={imgSrc}
          alt={item.name}
          // 💡 height: '100%'와 objectFit: 'cover' 덕분에 사진이 찌그러지지 않고 고정된 160px 안에 이쁘게 꽉 찹니다.
          style={{ width: '100%', height: '100%', objectFit }}
          onError={handleError}

        />
      ) : (
        // 사진이 없을 때 뜨는 아이콘 영역도 높이 균형을 맞춰줍니다.
        <CategoryIcon category={item.category} size="3rem" />
      )}
    </div>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// 게임 1 — 룰렛
// ══════════════════════════════════════════════════════════════════════════════
function Roulette() {

  const navigate = useNavigate()

  const canvasRef = useRef(null)
  const spinning = useRef(false)
  const angleRef = useRef(0)

  const [result, setResult] = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [category, setCategory] = useState('전체')
  const [items, setItems] = useState([])
  const [fetching, setFetching] = useState(false)

  // 1️⃣ 카테고리 바뀔 때마다 API에서 메뉴 새로 불러오기
  useEffect(() => {
    setFetching(true)
    setResult(null)
    angleRef.current = 0
    getRandomMenus(30, category)
      .then(data => {
        setItems(data)
      })

      .catch(() => setItems([]))

      .finally(() => setFetching(false))
  }, [category])

  const slice = (2 * Math.PI) / (items.length || 1)
  const COLORS = ['#E53E3E', '#DD6B20', 'var(--color-accent)', '#38A169', '#3182CE', '#6B46C1', '#D53F8C']

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    const ctx = canvas.getContext('2d')
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 8
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    items.forEach((item, i) => {
      const start = angle + i * slice
      const end = start + slice

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + slice / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(9, 13 - items.length * .1)}px sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,.4)'
      ctx.shadowBlur = 2
      const name = item.name.length > 7 ? item.name.slice(0, 7) + '…' : item.name
      ctx.fillText(name, r - 8, 4)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#1a202c'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 4)
  }, [items, slice])

  useEffect(() => {
    angleRef.current = 0
    setResult(null)
    draw(0)
  }, [draw])

  const spin = () => {
    if (spinning.current || items.length === 0) return
    spinning.current = true
    setIsSpinning(true)
    setResult(null)

    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI
    const targetAngle = angleRef.current + extraSpins
    const duration = 4000
    const start = performance.now()
    const startAngle = angleRef.current

    const animate = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)

      const ease = 1 - Math.pow(1 - t, 3)

      const cur = startAngle + (targetAngle - startAngle) * ease

      angleRef.current = cur
      draw(cur)

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        spinning.current = false
        setIsSpinning(false)
        const norm = (((-cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
        const idx = Math.floor(norm / slice) % items.length
        setResult(items[idx])
      }
    }
    requestAnimationFrame(animate)
  }

  const goToCategoryPage = () => {
    if (result) {
      const targetCategory = result.category === '피자' ? '양식' : result.category;
      navigate(`/menu?cat=${targetCategory}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ alignSelf: 'flex-start' }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--border-color)',
            fontSize: '.88rem', fontWeight: 700, background: 'var(--bg-white)',
            color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
          }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {category !== '전체' && (
          <span style={{ marginLeft: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
            {items.length}개 메뉴
          </span>
        )}
      </div>

      {fetching ? (
        <div style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🍽️</div>
          <div style={{ fontWeight: 700 }}>메뉴 불러오는 중...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>😅</div>
          <div style={{ fontWeight: 700 }}>{category} 메뉴가 없습니다</div>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '50%', right: -10, transform: 'translateY(-50%)',
              width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
              borderRight: '20px solid #E53E3E', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))',
            }} />
            <canvas ref={canvasRef} width={300} height={300}
              style={{ borderRadius: '50%', boxShadow: '0 4px 20px rgba(0,0,0,.15)', cursor: isSpinning ? 'default' : 'pointer' }}
              onClick={spin}
            />
          </div>

          <button className='inline-flex min-h-[44px] items-center justify-center mt-[12px] mr-[15px] gap-2 rounded-[12px] bg-[var(--bg-surface)] px-6 text-[0.94rem] font-black text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--color-accent)]'
            onClick={spin} disabled={isSpinning}>
            {isSpinning ? '🌀 돌아가는 중...' : '🎰 룰렛 돌리기!'}
          </button>

          {/* 3️⃣ 당첨 결과 출력 영역 */}
          {result && (
            <div style={{
              width: '100%', background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
              border: '2px solid var(--color-accent)', borderRadius: 20, padding: '24px 28px', textAlign: 'center',
              boxSizing: 'border-box',
              boxShadow: '0 8px 24px rgba(244,108,111,.2)',
            }}>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>🎉 오늘의 메뉴 당첨!</div>

              {/* 💡 [수정] 이모지 영역 대신 다중 확장자를 커버하는 MenuImage 컴포넌트 장착! */}

              <MenuImage item={result} size="230px" />


              <div className="text-[1.5rem] max-[540px]:mt-2 max-[540px]:text-[1.1rem]" style={{ fontWeight: 900, marginBottom: 4, color: 'var(--text-primary)' }}>{result.name}</div>

              <div style={{ display: 'inline-block', background: 'rgba(244,108,111,.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12 }}>
                {result.category === '피자' ? '양식' : result.category}
              </div>

              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>이 카테고리의 모든 메뉴를 확인해 볼까요?</div>

              <button
                onClick={goToCategoryPage}
                style={{
                  display: 'inline-block', padding: '10px 28px', borderRadius: 50,
                  background: 'var(--color-primary)', color: '#fff',
                  fontSize: '.9rem', fontWeight: 800, textDecoration: 'none',
                  border: 'none', cursor: 'pointer', outline: 'none'
                }}>
                {result.category === '피자' ? '양식' : result.category} 전체 메뉴 보러가기 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 2 — 스무고개
// ══════════════════════════════════════════════════════════════════════════════
const TWENTY_QS = [
  { q: '따뜻한 국물이 있나요?', yes: ['한식', '분식'], no: ['일식', '양식', '카페'] },
  { q: '밥과 함께 먹는 음식인가요?', yes: ['한식'], no: ['카페', '양식'] },
  { q: '면 요리인가요?', yes: ['분식', '일식', '중식'], no: ['한식', '양식', '치킨'] },
  { q: '고기 요리인가요?', yes: ['한식', '양식', '치킨'], no: ['카페', '분식'] },
  { q: '1만원 이하로 먹을 수 있나요?', yes: ['분식', '한식'], no: ['양식', '일식'] },
  { q: '외국 음식인가요?', yes: ['일식', '중식', '양식', '피자'], no: ['한식', '분식'] },
  { q: '매운 음식인가요?', yes: ['한식', '분식', '중식'], no: ['양식', '카페', '일식'] },
  { q: '배달로 자주 시키는 음식인가요?', yes: ['치킨', '피자', '중식'], no: ['카페', '양식'] },
  { q: '달콤한 맛이 나나요?', yes: ['카페'], no: ['한식', '분식', '치킨'] },
  { q: '혼자 먹기 좋은 음식인가요?', yes: ['분식', '일식'], no: ['한식', '양식'] },
]

function TwentyQ({ menus }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])
  const [target, setTarget] = useState(null)
  const [guess, setGuess] = useState(null)
  const [reveal, setReveal] = useState(false)
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (menus.length > 0)
      setTarget(menus[Math.floor(Math.random() * menus.length)])
  }, [menus])

  const q = TWENTY_QS[step]

  const navigate = useNavigate()

  const answer = (yn) => {
    const newA = [...answers, yn]
    setAnswers(newA)
    if (newA.length >= TWENTY_QS.length) {
      const score = {}
      newA.forEach((a, i) => {
        const q = TWENTY_QS[i]
        const cats = a === 'yes' ? q.yes : q.no
        cats.forEach(c => { score[c] = (score[c] ?? 0) + 1 })
      })
      const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0]
      const candidates = menus.filter(m => m.category === best)
      setGuess(candidates[Math.floor(Math.random() * candidates.length)] ?? menus[0])
      setStep(10)
    } else {
      setStep(step + 1)
    }
  }

  const goToCategoryPage = () => {
    if (!guess) return

    const targetCategory =
      guess.category === '피자' ? '양식' : guess.category

    navigate(`/menu?cat=${targetCategory}`)
  }

  const reset = () => {
    setStarted(false);
    setStep(0);
    setAnswers([]);
    setGuess(null);
    setReveal(false);
    setTarget(menus[Math.floor(Math.random() * menus.length)]);
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {!started && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', margin: '12px 0' }}>🕵️</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>스무고개로 메뉴 맞추기!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', lineHeight: 1.7, marginBottom: 20 }}>
            Yes/No! 10개 질문으로 오늘 먹을 메뉴를 알아맞혀드려요.<br />솔직하게 대답할수록 정확해져요!
          </p>
          <button className="inline-flex min-h-[44px] items-center justify-center mt-[24px] mr-[15px] gap-2 rounded-[12px] bg-white px-6 text-[0.94rem] font-black text-[var(--color-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5"
            onClick={() => setStarted(true)}>시작하기</button>
        </div>
      )}
      {started && step < 10 && answers.length <= step && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '.8rem', color: 'var(--text-muted)' }}>
            <span>질문 {step + 1} / {TWENTY_QS.length}</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {TWENTY_QS.map((_, i) => (
                <div key={i} style={{ width: 18, height: 5, borderRadius: 3, background: i < answers.length ? 'var(--color-primary)' : i === step ? 'var(--color-secondary)' : 'var(--bg-surface)' }} />
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--bg-white)', borderRadius: 16, padding: '24px 20px', border: '1px solid var(--border-color)', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🤔</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.5 }}>{q.q}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['yes', '✅ 예!', '#F0FFF4', '#276749'], ['no', '❌ 아니오', '#FFF5F5', '#C53030']].map(([val, label, bg, color]) => (
              <button key={val} onClick={() => answer(val)}
                style={{ padding: 20, borderRadius: 14, border: `2px solid ${color}`, background: bg, fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', color, transition: 'transform .1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 10 && guess && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', width: 80, height: 80 }}>
            <img src="/img/icon/light.png" alt="과녁" style={{ width: 90, height: 90, objectFit: 'contain', display: 'block' }} />
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: 16 }}>AI의 추천 메뉴는...</div>
          <div
            style={{
              width: 'min(100%, 500px)',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
              borderRadius: 20,
              overflow: 'hidden',
              padding: 0,
              border: '3px solid var(--color-accent)',
            }}
          >
            <MenuImage item={guess} size="100%" height={300} />

            <div style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                <CategoryIcon category={guess.category} size="4rem" />
              </div>

              <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 4 }}>
                {guess.name}
              </div>

              <div
                style={{
                  fontSize: '.82rem',
                  color: 'var(--text-muted)'
                }}
              >
                <div style={{ display: 'inline-block', background: 'rgba(244,108,111,.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12 }}>
                  {guess.category === '피자' ? '양식' : guess.category}
                </div>
                <div
                  style={{
                    fontSize: '.85rem',
                    color: 'var(--text-muted)',
                    marginTop: 12,
                    marginBottom: 16,
                  }}
                >
                  이 카테고리의 모든 메뉴를 확인해 볼까요?
                </div>

                <button
                  onClick={goToCategoryPage}
                  style={{
                    display: 'inline-block',
                    padding: '10px 28px',
                    borderRadius: 50,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontSize: '.9rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {guess.category === '피자' ? '양식' : guess.category} 전체 메뉴 보러가기 →
                </button>
              </div>
            </div>
          </div>
          {reveal && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: '.88rem' }}>
              {target?.name} ({target?.category})

            </div>
          )}
          <button className="mx-auto inline-flex items-center justify-center gap-0.5 px-4 py-1.5 bg-[#FFF5F5] hover:bg-[#FFEAE6] text-[#FF5A5A] text-xs font-black rounded-lg border border-[#FFE2E2] transition-colors" onClick={reset}>다시하기</button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 3 — 월드컵
// ══════════════════════════════════════════════════════════════════════════════
function WorldCup({ menus }) {
  const POOL = 32
  const [bracket, setBracket] = useState([])
  const [round, setRound] = useState(0)
  const [winners, setWinners] = useState([])
  const [roundNum, setRoundNum] = useState(0)
  const [champion, setChampion] = useState(null)
  const [choosing, setChoosing] = useState(null)

  const navigate = useNavigate()

  const init = () => {
    const pool = [...menus].sort(() => Math.random() - .5).slice(0, POOL)
    setBracket(pool); setRound(0); setWinners([]); setChampion(null)
  }
  useEffect(() => { if (menus.length >= 4) init() }, [menus])

  const left = bracket[round * 2]
  const right = bracket[round * 2 + 1]
  const totalMatches = bracket.length / 2
  const roundLabel = bracket.length === 2 ? '결승' : bracket.length === 4 ? '준결승' : bracket.length === 8 ? '8강' : bracket.length === 16 ? '16강' : '32강'

  const goToCategoryPage = () => {
    if (!champion) return

    const targetCategory =
      champion.category === '피자' ? '양식' : champion.category

    navigate(`/menu?cat=${targetCategory}`)
  }

  const pick = (winner) => {
    if (choosing) return
    setChoosing(winner.id)
    setTimeout(() => {
      setChoosing(null)
      const newWinners = [...winners, winner]
      const nextRound = round + 1
      if (nextRound >= totalMatches) {
        if (newWinners.length === 1) {
          setChampion(newWinners[0])
        } else {
          setBracket(newWinners); setRound(0); setWinners([])
        }
      } else {
        setRound(nextRound); setWinners(newWinners)
      }
    }, 350)
  }

  if (!bracket.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>메뉴 불러오는 중...</div>

  // 챔피언 결과 창
  if (champion) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <img
          src="/img/icon/1st-prize.png"
          alt="우승"
          style={{
            width: 72,
            height: 72,
            objectFit: 'contain',
            display: 'block',
          }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      <div style={{
        background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
        border: '3px solid var(--color-accent)',
        borderRadius: 20,
        overflow: 'hidden', // 라운딩 밖으로 사진 안 나가게 가둠
        padding: 0, // 패딩 제로화
        margin: '16px auto',
        display: 'block',
        width: 'min(400px, calc(100% - 32px))', // 우승 박스 전체 가로 크기 제한
        boxSizing: 'border-box'
      }}>

        {/* 대결창과 똑같이 깔끔하게 채워집니다 */}
        <MenuImage item={champion} />
        <div className="text-[1.5rem] max-[540px]:mt-2 max-[540px]:text-[1.1rem]" style={{ fontWeight: 900, padding: '14px 8px 4px' }}>{champion.name}</div>
        <div style={{ display: 'inline-block', background: 'rgba(244,108,111,.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12 }}>
          {champion.category === '피자' ? '양식' : champion.category}
        </div>
        <div
          style={{
            fontSize: '.85rem',
            color: 'var(--text-muted)',
            margin: '0 auto 16px',
            maxWidth: 'calc(100% - 24px)',
            whiteSpace: 'normal',
            wordBreak: 'keep-all',
            boxSizing: 'border-box'
          }}
        >
          이 카테고리의 모든 메뉴를 확인해 볼까요?
        </div>

        <button
          onClick={goToCategoryPage}
          style={{
            display: 'inline-block',
            padding: '10px 28px',
            borderRadius: 50,
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: '.9rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            marginBottom: 16,
            maxWidth: 'calc(100% - 24px)',
            whiteSpace: 'normal',
            wordBreak: 'keep-all',
            boxSizing: 'border-box'
          }}
        >
          {champion.category === '피자' ? '양식' : champion.category} 전체 메뉴 보러가기 →
        </button>
      </div>



      <div><button className="btn btn-secondary" onClick={init}>🔄 다시하기</button></div>
    </div>
  )

  // ⚔️ 토너먼트 진행 창
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 800 }}>{roundLabel} ({round + 1}/{totalMatches})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>

        {/* 왼쪽 음식 버튼 */}
        {left && (
          <button
            onClick={() => pick(left)}
            style={{
              border: `3px solid ${choosing === left.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 20,
              padding: 0, // 💡 내부 여백을 없애서 이미지가 꽉 차게 만듭니다.
              overflow: 'hidden', // 💡 이미지가 카드 모서리 라운딩 밖으로 안 빠져나가게 가둡니다.
              cursor: 'pointer',
              background: 'var(--bg-white)',
              width: '100%',
              transition: 'border-color 0.2s'

            }}
          >
            {/* 💡 카드의 가로폭을 100% 다 쓰도록 가로 길이를 채우고 높이를 늘렸습니다. */}
            <MenuImage item={left} size="100%" />

            {/* 💡 글자는 이미지 아래에 여백을 조금 주고 배치합니다. */}
            <div style={{ fontWeight: 800, fontSize: '1.1rem', padding: '14px 8px' }}>
              {left.name}
            </div>
          </button>
        )}


        <div style={{ fontWeight: 900, color: 'var(--color-primary)', padding: '0 4px' }}>VS</div>

        {/* 오른쪽 음식 버튼 */}
        {right && (
          <button
            onClick={() => pick(right)}
            style={{
              border: `3px solid ${choosing === right.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 20,
              padding: 0,
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'var(--bg-white)',
              width: '100%',
              transition: 'border-color 0.2s'
            }}
          >
            <MenuImage item={right} size="100%" />


            <div style={{ fontWeight: 800, fontSize: '1.1rem', padding: '14px 8px' }}>
              {right.name}
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 4 — 뽑기 (긁기)
// ══════════════════════════════════════════════════════════════════════════════
function ScratchCard({ menus }) {
  const canvasRef = useRef(null)
  const scratching = useRef(false)
  const [prize, setPrize] = useState(null)
  const [revealed, setRevealed] = useState(0)
  const [done, setDone] = useState(false)
  const TARGET = 60

  const navigate = useNavigate()

  const pick = useCallback(() => menus.length > 0 ? menus[Math.floor(Math.random() * menus.length)] : null, [menus])

  const goToCategoryPage = () => {
    if (!prize) return

    const targetCategory =
      prize.category === '피자' ? '양식' : prize.category

    navigate(`/menu?cat=${targetCategory}`)
  }

  const initCard = useCallback(() => {
    const p = pick()
    if (!p) return
    setPrize(p); setRevealed(0); setDone(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#C0C0C0')
    grad.addColorStop(.5, '#E8E8E8')
    grad.addColorStop(1, '#A8A8A8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#888'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🪙 긁어서 메뉴를 확인하세요!', w / 2, h / 2 - 8)
    ctx.font = '13px sans-serif'
    ctx.fillText('마우스 또는 손가락으로 긁기', w / 2, h / 2 + 16)
  }, [pick])

  useEffect(() => { if (menus.length > 0) initCard() }, [menus, initCard])

  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas || done) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, 2 * Math.PI)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let cleared = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) cleared++
    const pct = (cleared / (canvas.width * canvas.height)) * 100
    setRevealed(Math.round(pct))
    if (pct >= TARGET && !done) { setDone(true); ctx.clearRect(0, 0, canvas.width, canvas.height) }
  }, [done])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const onStart = (e) => { e.preventDefault(); scratching.current = true; scratch(...Object.values(getPos(e, canvasRef.current))) }
  const onMove = (e) => { e.preventDefault(); if (!scratching.current) return; scratch(...Object.values(getPos(e, canvasRef.current))) }
  const onEnd = () => { scratching.current = false }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-muted)' }}>🎟️ 오늘의 메뉴 복권</div>
      <div style={{ position: 'relative', width: 300, height: 160, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '3px solid var(--color-accent)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {prize && (<><div style={{ fontSize: '2rem', marginBottom: 0 }}><CategoryIcon category={prize.category} size="4rem" /></div><div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{prize.name}</div><div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{prize.category}</div></>)}
        </div>
        <canvas ref={canvasRef} width={300} height={160}
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none', width: '100%', height: '100%' }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
      </div>
      {!done && (
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>긁은 정도</span><span>{revealed}% / {TARGET}% 완성</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-accent)', width: `${Math.min(revealed / TARGET * 100, 100)}%`, transition: 'width .1s' }} />
          </div>
        </div>
      )}
      {done && prize && (
        <div style={{ textAlign: 'center', animation: 'popIn .4s ease' }}>
          <div style={{
            background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
            borderRadius: 20,
            overflow: 'hidden',
            border: '2px solid var(--color-accent)', textAlign: 'center',
            width: 300,
            margin: '0 auto 16px'
          }}>
            <MenuImage item={prize} />

            <div style={{
              fontWeight: 900,
              fontSize: '1.3rem',
              padding: '14px 8px 4px'
            }}>
              
            </div>

            <div style={{
              fontSize: '.85rem',
              color: 'var(--text-muted)',
              paddingBottom: '14px'
            }}>
            </div>
            <div
              style={{
                fontSize: '.85rem',
                color: 'var(--text-muted)',
                marginBottom: 16
              }}
            >
              이 카테고리의 모든 메뉴를 확인해 볼까요?
            </div>

            <button
              onClick={goToCategoryPage}
              style={{
                display: 'inline-block',
                padding: '10px 28px',
                borderRadius: 50,
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: '.9rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              {prize.category === '피자' ? '양식' : prize.category} 전체 메뉴 보러가기 →
            </button>
          </div>

        </div>
      )}
      <button onClick={initCard}
        style={{ padding: '10px 32px', borderRadius: 50, border: 'none', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem' }}>
        🎟️ 새 복권 뽑기
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 5 — 사다리타기
// ══════════════════════════════════════════════════════════════════════════════
function Ladder({ menus, allMenus = [] }) {
  const MAX = 6
  const NUM_ROWS = 10
  const COLORS = ['#E53E3E', '#DD6B20', '#F6AD55', '#38A169', '#3182CE', '#6B46C1']
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [items, setItems] = useState([])
  const [inputVal, setInputVal] = useState('')
  // ladder: { rungs: [{row,col}], yPositions: [y0,y1,...] } — yPositions는 실제 픽셀 Y값
  const [ladder, setLadder] = useState({ rungs: [], yPositions: [] })
  const [result, setResult] = useState(null)
  const [animPath, setAnimPath] = useState(null)
  const [fetching, setFetching] = useState(false)
  const goToCategoryPage = () => {
    if (!resultMenu) return

    const targetCategory =
      resultMenu.category === '피자' ? '양식' : resultMenu.category

    navigate(`/menu?cat=${targetCategory}`)
  }

  // ── 사다리 생성 핵심 규칙 ─────────────────────────────────────────────────
  // 규칙: 같은 row에서 어떤 세로줄도 좌우 동시에 연결 금지 (Y자 교차 방지)
  const buildLadder = useCallback((n, canvasH) => {
    const PAD = 36, TOP = 52, BOT = canvasH - 52

    // 1) 각 row의 Y 위치를 불균등하게 생성
    //    → 구간을 NUM_ROWS+1 등분 후, 각 구간 내 랜덤 위치 선택
    const segH = (BOT - TOP) / (NUM_ROWS + 1)
    const yPositions = Array.from({ length: NUM_ROWS }, (_, i) => {
      const base = TOP + (i + 1) * segH
      // 각 구간의 ±35% 범위 내 랜덤
      const jitter = segH * (0.15 + Math.random() * 0.7 - 0.35)
      return Math.round(base + jitter)
    })

    // 2) 가로줄 생성: connectedLines로 Y자 교차 완전 방지
    const rungs = []
    for (let row = 0; row < NUM_ROWS; row++) {
      const connectedLines = new Set() // 이 row에서 이미 연결된 세로줄
      const gaps = Array.from({ length: n - 1 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)

      for (const gap of gaps) {
        // gap은 세로줄 gap과 gap+1을 연결
        // 두 세로줄 모두 아직 이 row에서 연결 안 됐을 때만 추가
        if (!connectedLines.has(gap) && !connectedLines.has(gap + 1) && Math.random() > 0.38) {
          rungs.push({ row, col: gap })
          connectedLines.add(gap)
          connectedLines.add(gap + 1)
        }
      }
    }
    return { rungs, yPositions }
  }, [])

  // ── 경로 추적 ─────────────────────────────────────────────────────────────
  const tracePath = useCallback((topIdx, rungs) => {
    let col = topIdx
    const path = [{ row: -1, col }]
    for (let row = 0; row < NUM_ROWS; row++) {
      const goRight = rungs.find(r => r.row === row && r.col === col)
      const goLeft = rungs.find(r => r.row === row && r.col === col - 1)
      if (goRight) col += 1
      else if (goLeft) col -= 1
      path.push({ row, col })
    }
    return { bottomIdx: col, path }
  }, [])

  // ── 캔버스 그리기 ─────────────────────────────────────────────────────────
  const draw = useCallback((highlightPath = null) => {
    const canvas = canvasRef.current
    if (!canvas || items.length < 2 || ladder.yPositions.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const n = items.length
    const PAD = 36
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 540
    const TOP = 52
    const BOT = isMobile ? H - 38 : H - 52
    const step = (W - PAD * 2) / (n - 1)
    const topButtonRadius = isMobile ? 21 : 14
    const topButtonFontSize = isMobile ? 18 : 12
    const bottomFontSize = isMobile ? 17 : 11
    const bottomResultFontSize = isMobile ? 18 : 12
    const bottomTextY = isMobile ? BOT + 24 : BOT + 20

    ctx.clearRect(0, 0, W, H)

    const xOf = (col) => PAD + col * step
    const yOf = (row) => {
      const baseY = ladder.yPositions[row] ?? (TOP + (row + 1) * (BOT - TOP) / (NUM_ROWS + 1))

      if (!isMobile) return baseY

      const sourceTop = 52
      const sourceBot = 420 - 52
      const ratio = (baseY - sourceTop) / (sourceBot - sourceTop)
      return TOP + ratio * (BOT - TOP)
    }

    // 세로줄
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.moveTo(xOf(i), TOP)
      ctx.lineTo(xOf(i), BOT)
      ctx.strokeStyle = '#D1C4BE'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // 가로줄
    ladder.rungs.forEach(({ row, col }) => {
      ctx.beginPath()
      ctx.moveTo(xOf(col), yOf(row))
      ctx.lineTo(xOf(col + 1), yOf(row))
      ctx.strokeStyle = '#A09090'
      ctx.lineWidth = 3
      ctx.stroke()
    })

    // 하이라이트 경로
    if (highlightPath && highlightPath.length >= 2) {
      const color = COLORS[highlightPath[0].col % COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(xOf(highlightPath[0].col), TOP)
      for (let i = 1; i < highlightPath.length; i++) {
        const prev = highlightPath[i - 1]
        const cur = highlightPath[i]
        const y = yOf(cur.row)
        if (prev.col !== cur.col) {
          ctx.lineTo(xOf(prev.col), y)
          ctx.lineTo(xOf(cur.col), y)
        } else {
          ctx.lineTo(xOf(cur.col), y)
        }
      }
      ctx.lineTo(xOf(highlightPath[highlightPath.length - 1].col), BOT)
      ctx.stroke()
    }

    // 상단 번호
    for (let i = 0; i < n; i++) {
      const hl = highlightPath && highlightPath[0].col === i
      ctx.beginPath()
      ctx.arc(xOf(i), TOP - 14, topButtonRadius, 0, 2 * Math.PI)
      ctx.fillStyle = hl ? COLORS[i % COLORS.length] : '#F3E7DD'
      ctx.fill()
      ctx.fillStyle = hl ? '#fff' : '#7A5C52'
      ctx.font = `bold ${topButtonFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(i + 1, xOf(i), isMobile ? TOP - 8 : TOP - 10)
    }

    // 하단 메뉴명
    for (let i = 0; i < n; i++) {
      const isRes = highlightPath && highlightPath[highlightPath.length - 1].col === i
      ctx.fillStyle = isRes ? COLORS[highlightPath[0].col % COLORS.length] : '#5E4A44'
      ctx.font = `bold ${isRes ? bottomResultFontSize : bottomFontSize}px sans-serif`
      ctx.textAlign = 'center'
      const label =
        items[i].name.length > 4
          ? items[i].name.slice(0, 4) + '...'
          : items[i].name;
      ctx.fillText(label, xOf(i), bottomTextY)
    }
  }, [items, ladder])

  useEffect(() => { draw(animPath) }, [draw, animPath])

  // ── 메뉴 추가 ─────────────────────────────────────────────────────────────
  const addItem = () => {
    const v = inputVal.trim()
    if (!v || items.length >= MAX) return
    const matchSourceMenus = allMenus.length ? allMenus : menus
    const matchedMenu = findBestMenuMatch(v, matchSourceMenus)


    const next = [
      ...items,
      matchedMenu ? {
        ...matchedMenu,
        name: v,
        imageSourceName: matchedMenu.name,
      } : {
        id: null,
        name: v,
        category: '직접입력'
      }
    ];
    setItems(next)
    setInputVal('')
    setResult(null)
    setAnimPath(null)
    setLadder(buildLadder(next.length, 420))
  }

  const resultMenu = result
    ? items[result.bottomIdx]
    : null;

  //   console.log('결과 메뉴명:', items[result?.bottomIdx]);
  // console.log('찾은 메뉴:', resultMenu);

  const removeItem = (idx) => {
    const next = items.filter((_, i) => i !== idx)
    setItems(next)
    setResult(null)
    setAnimPath(null)
    if (next.length >= 2) setLadder(buildLadder(next.length, 420))
    else setLadder({ rungs: [], yPositions: [] })
  }

  // ── 랜덤 메뉴 불러오기 ───────────────────────────────────────────────────
  const loadRandom = () => {
    setFetching(true)
    getRandomMenus(MAX)
      .then((data) => {
        const selectedMenus = data.slice(0, MAX);
        setItems(selectedMenus);
        setResult(null)
        setAnimPath(null)
        setLadder(buildLadder(selectedMenus.length, 420));
      })
      .catch(() => { })
      .finally(() => setFetching(false))
  }

  // ── 사다리 다시 생성 ──────────────────────────────────────────────────────
  const regenerate = () => {
    if (items.length < 2) return
    setResult(null)
    setAnimPath(null)
    setLadder(buildLadder(items.length, 420))
  }

  // ── 번호 클릭 → 경로 추적 ────────────────────────────────────────────────
  const handlePick = (topIdx) => {
    if (items.length < 2) return
    const { bottomIdx, path } = tracePath(topIdx, ladder.rungs)
    setAnimPath(path)
    setResult({ topIdx, bottomIdx })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 메뉴 입력 영역 */}
      <div>
        <div style={{ fontSize: '.89rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
          메뉴 목록 ({items.length}/{MAX}) — 최소 2개 이상 필요
        </div>

        {/* 추가된 메뉴 태그 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, minHeight: 32 }}>
          {items.map((item, i) => (
            <span key={i} style={{
              background: COLORS[i % COLORS.length], color: '#fff',
              borderRadius: 20, padding: '4px 12px', fontSize: '.79rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>

              {i + 1}. {item.name}
              <button onClick={() => removeItem(i)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.8)', cursor: 'pointer', padding: 0, fontSize: '.9rem', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
          {items.length === 0 && (
            <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>메뉴를 추가하거나 랜덤으로 불러오세요</span>
          )}
        </div>

        {/* 직접 입력 */}
        {items.length < MAX && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="form-control"
              style={{ flex: 1 }}
              placeholder="메뉴명 직접 입력 후 Enter"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <button
              onClick={addItem}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              추가
            </button>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadRandom} disabled={fetching}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--color-primary)', background: '#FFF5F5', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '.85rem' }}>
            {fetching ? '...' : '🎲 랜덤 메뉴'}
          </button>
          {items.length >= 2 && (
            <button onClick={regenerate}
              className='inline-flex min-h-[44px] items-center justify-center mt-[12px] mr-[15px] gap-2 rounded-[12px] bg-[var(--bg-surface)] px-6 text-[0.94rem] font-black text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--color-accent)]'>
              사다리 재생성
            </button>
          )}
        </div>
      </div>

      {/* 사다리 캔버스 */}
      {items.length >= 2 ? (
        <>
          <canvas ref={canvasRef} width={540} height={typeof window !== 'undefined' && window.innerWidth <= 540 ? 600 : 400}
            style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border-color)', background: '#FFFDF7', cursor: 'pointer' }}
            onClick={(e) => {
              const canvas = canvasRef.current
              if (!canvas || items.length < 2) return
              const rect = canvas.getBoundingClientRect()
              const scaleX = canvas.width / rect.width
              const clickX = (e.clientX - rect.left) * scaleX
              const PAD = 36
              const step = (canvas.width - PAD * 2) / (items.length - 1)
              // 클릭 위치에서 가장 가까운 세로줄 번호 계산
              const col = Math.round((clickX - PAD) / step)
              if (col >= 0 && col < items.length) handlePick(col)
            }}
          />

          {/* 초기화 버튼만 유지 */}
          {animPath && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => { setAnimPath(null); setResult(null) }}
                style={{ padding: '8px 20px', borderRadius: 21, border: '1.5px solid var(--border-color)', background: 'var(--bg-white)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem' }}>
                초기화
              </button>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div
              style={{
                background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
                border: `2px solid ${COLORS[result.topIdx % COLORS.length]}`,
                borderRadius: 20,
                overflow: 'hidden',
                textAlign: 'center',
                animation: 'popIn .4s ease',
              }}
            >
              {resultMenu && (
                <MenuImage item={resultMenu} height={300} />
              )}

              <div style={{ padding: '16px 20px' }}>
                <div
                  style={{
                    fontSize: '.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}
                >
                  🎉 {result.topIdx + 1}번 선택 결과
                </div>

                <div
                  style={{
                    fontWeight: 900,
                    fontSize: '1.4rem',
                    color: COLORS[result.topIdx % COLORS.length],
                  }}
                >
                  {items[result.bottomIdx].name}
                </div>

                {resultMenu && (
                  <div
                    style={{
                      fontSize: '.82rem',
                      color: 'var(--text-muted)',
                      marginTop: 6,
                    }}
                  >
                    <div style={{ display: 'inline-block', background: 'rgba(244,108,111,.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 12 }}>
                      {resultMenu.category === '피자' ? '양식' : resultMenu.category}
                    </div>
                    <div
                      style={{
                        fontSize: '.85rem',
                        color: 'var(--text-muted)',
                        marginTop: 16,
                        marginBottom: 16,
                      }}
                    >
                      이 카테고리의 모든 메뉴를 확인해 볼까요?
                    </div>

                    <button
                      onClick={goToCategoryPage}
                      style={{
                        display: 'inline-block',
                        padding: '10px 28px',
                        borderRadius: 50,
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: '.9rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {resultMenu.category === '피자' ? '양식' : resultMenu.category} 전체 메뉴 보러가기 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 12 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🪜</div>
          <div style={{ fontWeight: 700 }}>메뉴를 2개 이상 추가하면 사다리가 나타나요</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인 Game 페이지
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'roulette', label: '🎰 룰렛', desc: '30개 메뉴 중 랜덤' },
  { id: 'twentyq', label: '🕵️ 스무고개', desc: '예/아니오로 맞추기' },
  { id: 'worldcup', label: '🏆 월드컵', desc: '32개 토너먼트' },
  { id: 'scratch', label: '🎟️ 뽑기', desc: '긁어서 메뉴 확인' },
  { id: 'ladder', label: '🪜 사다리', desc: '사다리 타기' },
]

const splitTabLabel = (label) => {
  const [icon, ...text] = label.split(' ')
  return { icon, text: text.join(' ') }
}

export default function Game() {
  const [activeTab, setActiveTab] = useState('roulette')
  const [menus, setMenus] = useState([])
  const [allMenus, setAllMenus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRandomMenus(64),
      getAllMenus().catch(() => []),
    ])
      .then(([randomMenus, menuCatalog]) => {
        setMenus(randomMenus)
        setAllMenus(menuCatalog)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="game-wrap" style={{ maxWidth: 640 }}>
      <div className="max-[540px]:!ml-0 max-[540px]:text-center" style={{ marginLeft: -20 }}>
        <h1
          className="max-[540px]:justify-center"
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            marginBottom: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <img
            src="/img/icon/logo.png"
            alt="오늘 뭐먹지?"
            className="max-[540px]:!ml-0"
            style={{
              height: 38,
              width: 38,
              objectFit: 'contain',
              marginLeft: 20
            }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />

          게임창
        </h1>

        <p
          className="max-[540px]:!ml-0"
          style={{
            color: 'var(--text-muted)',
            fontSize: '.88rem',
            marginBottom: 24,
            marginLeft: 20

          }}
        >
          게임으로 오늘 메뉴를 정해보세요!
        </p>
      </div>

      {/* 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
        {TABS.map(({ id, label, desc }) => {
          const { icon, text } = splitTabLabel(label)
          return (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              border: `2px solid ${activeTab === id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 12, padding: '10px 6px', cursor: 'pointer', textAlign: 'center',
              background: activeTab === id ? '#FFF5F5' : 'var(--bg-white)',
              transition: 'all .15s',
            }}>
            <div className="hidden max-[540px]:flex max-[540px]:flex-col max-[540px]:items-center max-[540px]:gap-1" style={{ fontWeight: 800 }}>
              <span className="leading-none" style={{ fontSize: '1.1rem' }}>{icon}</span>
              <span className="leading-tight" style={{ fontSize: '.72rem' }}>{text}</span>
            </div>
            <div className="max-[540px]:hidden" style={{ fontSize: '.95rem', fontWeight: 800 }}>{label}</div>
            <div className="max-[540px]:hidden" style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
          </button>
          )
        })}
      </div>

      {/* 게임 카드 */}
      <div className="game-card" style={{ minHeight: 420 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, color: 'var(--text-muted)', gap: 8 }}>
            <span>🍽️</span> 메뉴 불러오는 중...
          </div>
        ) : (
          <>
            {activeTab === 'roulette' && <Roulette />}
            {activeTab === 'twentyq' && <TwentyQ menus={menus} />}
            {activeTab === 'worldcup' && <WorldCup menus={menus} />}
            {activeTab === 'scratch' && <ScratchCard menus={menus} />}
            {activeTab === 'ladder' && <Ladder menus={menus} allMenus={allMenus} />}
          </>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(.85); opacity: 0; }
          to   { transform: scale(1);  opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
