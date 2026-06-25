import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { getRandomMenus } from '../api/services'

// ── 카테고리 아이콘 ──────────────────────────────────────────────────────────
const CAT_ICON = { 한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜', 치킨:'🍗', 피자:'🍕', 카페:'☕', 술집:'🍺' }
const catIcon = (c) => CAT_ICON[c] ?? '🍴'

// ══════════════════════════════════════════════════════════════════════════════
// 게임 1 — 룰렛
// ══════════════════════════════════════════════════════════════════════════════
function Roulette({ menus }) {
  const canvasRef  = useRef(null)
  const spinning   = useRef(false)
  const angleRef   = useRef(0)
  const [result,   setResult]   = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)

  const items  = menus.slice(0, 30)
  const slice  = (2 * Math.PI) / items.length
  const COLORS = ['#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE','#6B46C1','#D53F8C']

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    const ctx = canvas.getContext('2d')
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r  = cx - 8
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    items.forEach((item, i) => {
      const start = angle + i * slice
      const end   = start + slice

      // 파이 조각
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 텍스트
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + slice / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.max(9, 13 - items.length * .1)}px sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,.4)'
      ctx.shadowBlur  = 2
      const name = item.name.length > 7 ? item.name.slice(0, 7) + '…' : item.name
      ctx.fillText(name, r - 8, 4)
      ctx.restore()
    })

    // 중앙 원
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

  useEffect(() => { draw(0) }, [draw])

  const spin = () => {
    if (spinning.current || items.length === 0) return
    spinning.current = true
    setIsSpinning(true)
    setResult(null)

    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI
    const targetAngle = angleRef.current + extraSpins
    const duration    = 4000
    const start       = performance.now()
    const startAngle  = angleRef.current

    const animate = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      const cur  = startAngle + (targetAngle - startAngle) * ease

      angleRef.current = cur
      draw(cur)

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        spinning.current = false
        setIsSpinning(false)

        // 화살표가 가리키는 조각 계산 (오른쪽 12시 방향 = -π/2 기준)
        const norm   = (((-cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
        const idx    = Math.floor(norm / slice) % items.length
        setResult(items[idx])
      }
    }
    requestAnimationFrame(animate)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        {/* 화살표 */}
        <div style={{
          position: 'absolute', top: '50%', right: -10,
          transform: 'translateY(-50%)',
          width: 0, height: 0,
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '20px solid #E53E3E',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))',
        }} />
        <canvas ref={canvasRef} width={300} height={300}
          style={{ borderRadius: '50%', boxShadow: '0 4px 20px rgba(0,0,0,.15)', cursor: isSpinning ? 'default' : 'pointer' }}
          onClick={spin}
        />
      </div>

      <button
        onClick={spin}
        disabled={isSpinning}
        style={{
          padding: '12px 40px', borderRadius: 50,
          background: isSpinning ? 'var(--bg-surface)' : 'var(--color-primary)',
          color: isSpinning ? 'var(--text-muted)' : '#fff',
          border: 'none', fontWeight: 800, fontSize: '1rem', cursor: isSpinning ? 'default' : 'pointer',
          transition: 'all .2s',
        }}>
        {isSpinning ? '🌀 돌아가는 중...' : '🎰 룰렛 돌리기!'}
      </button>

      {result && (
        <div style={{
          background: 'linear-gradient(135deg,#FFF5F5,#FED7D7)',
          border: '2px solid var(--color-primary)',
          borderRadius: 16, padding: '20px 28px', textAlign: 'center',
          animation: 'popIn .4s ease',
        }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>{catIcon(result.category)}</div>
          <div style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: 4 }}>{result.name}</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{result.address}</div>
          <Link to={`/menu/${result.id}`}
            style={{ display: 'inline-block', marginTop: 10, padding: '6px 18px', borderRadius: 20, background: 'var(--color-primary)', color: '#fff', fontSize: '.82rem', fontWeight: 700, textDecoration: 'none' }}>
            식당 보러가기 →
          </Link>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 2 — 스무고개
// ══════════════════════════════════════════════════════════════════════════════
const TWENTY_QS = [
  { q: '따뜻한 국물이 있나요?',     yes: ['한식','분식'], no: ['일식','양식','카페'] },
  { q: '밥과 함께 먹는 음식인가요?', yes: ['한식'], no: ['카페','양식'] },
  { q: '면 요리인가요?',             yes: ['분식','일식','중식'], no: ['한식','양식','치킨'] },
  { q: '고기 요리인가요?',           yes: ['한식','양식','치킨'], no: ['카페','분식'] },
  { q: '1만원 이하로 먹을 수 있나요?',yes: ['분식','한식'], no: ['양식','일식'] },
  { q: '외국 음식인가요?',           yes: ['일식','중식','양식','피자'], no: ['한식','분식'] },
  { q: '매운 음식인가요?',           yes: ['한식','분식','중식'], no: ['양식','카페','일식'] },
  { q: '배달로 자주 시키는 음식인가요?',yes: ['치킨','피자','중식'], no: ['카페','양식'] },
  { q: '달콤한 맛이 나나요?',        yes: ['카페'], no: ['한식','분식','치킨'] },
  { q: '혼자 먹기 좋은 음식인가요?', yes: ['분식','일식'], no: ['한식','양식'] },
]

function TwentyQ({ menus }) {
  const [step,     setStep]     = useState(0)  // -1=인트로, 0~9=질문, 10=결과
  const [answers,  setAnswers]  = useState([]) // 'yes'|'no'
  const [target,   setTarget]   = useState(null)
  const [guess,    setGuess]    = useState(null)
  const [reveal,   setReveal]   = useState(false)

  useEffect(() => {
    if (menus.length > 0)
      setTarget(menus[Math.floor(Math.random() * menus.length)])
  }, [menus])

  const answer = (yn) => {
    const newA = [...answers, yn]
    setAnswers(newA)

    if (newA.length >= TWENTY_QS.length) {
      // 카테고리 점수 계산
      const score = {}
      newA.forEach((a, i) => {
        const q = TWENTY_QS[i]
        const cats = a === 'yes' ? q.yes : q.no
        cats.forEach(c => { score[c] = (score[c] ?? 0) + 1 })
      })
      const best = Object.entries(score).sort((a,b) => b[1]-a[1])[0]?.[0]
      const candidates = menus.filter(m => m.category === best)
      setGuess(candidates[Math.floor(Math.random() * candidates.length)] ?? menus[0])
      setStep(10)
    } else {
      setStep(step + 1)
    }
  }

  const reset = () => { setStep(0); setAnswers([]); setGuess(null); setReveal(false); setTarget(menus[Math.floor(Math.random()*menus.length)]) }
  const q = TWENTY_QS[step]

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      {/* 인트로 */}
      {step === 0 && answers.length === 0 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', margin: '12px 0' }}>🕵️</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>스무고개로 메뉴 맞추기!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', lineHeight: 1.7, marginBottom: 20 }}>
            예스/노 10개 질문으로 오늘 먹을 메뉴를 알아맞혀드려요.<br/>솔직하게 대답할수록 정확해져요!
          </p>
          <button className="btn btn-primary" style={{ padding: '12px 36px', borderRadius: 50 }}
            onClick={() => setStep(0)}>시작하기</button>
        </div>
      )}

      {/* 질문 */}
      {step < 10 && answers.length <= step && (
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
            {[['yes','✅ 예!','#F0FFF4','#276749'], ['no','❌ 아니오','#FFF5F5','#C53030']].map(([val, label, bg, color]) => (
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

      {/* 결과 */}
      {step === 10 && guess && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎯</div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: 16 }}>AI의 추천 메뉴는...</div>
          <div style={{ background: 'linear-gradient(135deg,#EBF8FF,#BEE3F8)', borderRadius: 16, padding: '24px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{catIcon(guess.category)}</div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 4 }}>{guess.name}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{guess.category} · {guess.address}</div>
            <Link to={`/menu/${guess.id}`}
              style={{ display: 'inline-block', marginTop: 12, padding: '6px 20px', background: '#3182CE', color: '#fff', borderRadius: 20, fontSize: '.82rem', fontWeight: 700, textDecoration: 'none' }}>
              식당 보러가기 →
            </Link>
          </div>

          {/* 숨겨진 타겟 공개 */}
          <button onClick={() => setReveal(!reveal)}
            style={{ fontSize: '.82rem', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 12 }}>
            {reveal ? '숨기기' : '🔍 내가 생각했던 음식 공개'}
          </button>
          {reveal && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: '.88rem' }}>
              {target?.name} ({target?.category})
            </div>
          )}
          <button className="btn btn-secondary" onClick={reset}>🔄 다시하기</button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 3 — 월드컵
// ══════════════════════════════════════════════════════════════════════════════
function WorldCup({ menus }) {
  const POOL    = 32
  const [bracket, setBracket] = useState([]) // 현재 라운드 목록
  const [round,   setRound]   = useState(0)  // matchup 인덱스
  const [winners, setWinners] = useState([])
  const [roundNum, setRoundNum] = useState(0)
  const [champion, setChampion] = useState(null)
  const [choosing, setChoosing] = useState(null) // 선택 중 애니메이션

  const init = () => {
    const pool = [...menus].sort(() => Math.random() - .5).slice(0, POOL)
    setBracket(pool); setRound(0); setWinners([]); setRoundNum(1); setChampion(null)
  }
  useEffect(() => { if (menus.length >= 4) init() }, [menus])

  const left  = bracket[round * 2]
  const right = bracket[round * 2 + 1]
  const totalMatches = bracket.length / 2
  const roundLabel   = bracket.length === 2 ? '결승' : bracket.length === 4 ? '준결승' : bracket.length === 8 ? '8강' : bracket.length === 16 ? '16강' : '32강'

  const pick = (winner) => {
    if (choosing) return
    setChoosing(winner.id)
    setTimeout(() => {
      setChoosing(null)
      const newWinners = [...winners, winner]
      const nextRound  = round + 1

      if (nextRound >= totalMatches) {
        // 라운드 종료
        if (newWinners.length === 1) {
          setChampion(newWinners[0])
        } else {
          setBracket(newWinners)
          setRound(0)
          setWinners([])
          setRoundNum(r => r + 1)
        }
      } else {
        setRound(nextRound)
        setWinners(newWinners)
      }
    }, 350)
  }

  if (!bracket.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>메뉴 불러오는 중...</div>

  if (champion) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
      <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 4 }}>최종 우승!</div>
      <div style={{
        background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
        border: '3px solid #D69E2E', borderRadius: 20, padding: '28px 24px',
        margin: '16px 0', display: 'inline-block', minWidth: 200,
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{catIcon(champion.category)}</div>
        <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>{champion.name}</div>
        <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{champion.category} · {champion.address}</div>
        <Link to={`/menu/${champion.id}`}
          style={{ display: 'inline-block', marginTop: 14, padding: '8px 24px', background: '#D69E2E', color: '#fff', borderRadius: 20, fontSize: '.88rem', fontWeight: 700, textDecoration: 'none' }}>
          식당 보러가기 →
        </Link>
      </div>
      <div><button className="btn btn-secondary" onClick={init}>🔄 다시하기</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{roundLabel}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginLeft: 8 }}>
          {round + 1} / {totalMatches} 경기
        </span>
      </div>

      {/* 진행바 */}
      <div style={{ height: 5, background: 'var(--bg-surface)', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--color-primary)', width: `${((round + 1) / totalMatches) * 100}%`, transition: 'width .3s' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
        {/* 왼쪽 메뉴 */}
        {left && (
          <button onClick={() => pick(left)}
            style={{
              border: `3px solid ${choosing === left.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 16, padding: '20px 12px', cursor: 'pointer',
              background: choosing === left.id ? '#FFF5F5' : 'var(--bg-white)',
              transform: choosing === left.id ? 'scale(1.04)' : 'scale(1)',
              transition: 'all .2s', textAlign: 'center', width: '100%',
            }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>{catIcon(left.category)}</div>
            <div style={{ fontWeight: 800, fontSize: '.95rem', lineHeight: 1.3 }}>{left.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{left.category}</div>
          </button>
        )}

        {/* VS */}
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.3rem', color: 'var(--color-primary)', padding: '0 4px' }}>
          VS
        </div>

        {/* 오른쪽 메뉴 */}
        {right && (
          <button onClick={() => pick(right)}
            style={{
              border: `3px solid ${choosing === right.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 16, padding: '20px 12px', cursor: 'pointer',
              background: choosing === right.id ? '#FFF5F5' : 'var(--bg-white)',
              transform: choosing === right.id ? 'scale(1.04)' : 'scale(1)',
              transition: 'all .2s', textAlign: 'center', width: '100%',
            }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>{catIcon(right.category)}</div>
            <div style={{ fontWeight: 800, fontSize: '.95rem', lineHeight: 1.3 }}>{right.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{right.category}</div>
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.82rem', marginTop: 16 }}>
        더 먹고 싶은 메뉴를 선택하세요!
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 4 — 뽑기 (긁기)
// ══════════════════════════════════════════════════════════════════════════════
function ScratchCard({ menus }) {
  const canvasRef  = useRef(null)
  const scratching = useRef(false)
  const [prize,    setPrize]    = useState(null)
  const [revealed, setRevealed] = useState(0)   // 0~100 퍼센트
  const [done,     setDone]     = useState(false)
  const TARGET = 60  // 60% 이상 긁으면 자동 공개

  const pick = useCallback(() => menus[Math.floor(Math.random() * menus.length)], [menus])

  const initCard = useCallback(() => {
    const p = pick()
    setPrize(p)
    setRevealed(0)
    setDone(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas

    // 스크래치 레이어 (은색 코팅)
    ctx.clearRect(0, 0, w, h)
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#C0C0C0')
    grad.addColorStop(.5, '#E8E8E8')
    grad.addColorStop(1, '#A8A8A8')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 안내 텍스트
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

    // 긁힌 비율 계산
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let cleared = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) cleared++
    const pct = (cleared / (canvas.width * canvas.height)) * 100
    setRevealed(Math.round(pct))
    if (pct >= TARGET && !done) {
      setDone(true)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [done])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const onStart = (e) => { e.preventDefault(); scratching.current = true; scratch(...Object.values(getPos(e, canvasRef.current))) }
  const onMove  = (e) => { e.preventDefault(); if (!scratching.current) return; scratch(...Object.values(getPos(e, canvasRef.current))) }
  const onEnd   = ()  => { scratching.current = false }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-muted)' }}>
        🎟️ 오늘의 메뉴 복권
      </div>

      {/* 복권 카드 */}
      <div style={{ position: 'relative', width: 300, height: 160, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '3px solid #D69E2E' }}>
        {/* 뒤 배경 (상품 표시) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {prize && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 4 }}>{catIcon(prize.category)}</div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{prize.name}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{prize.category}</div>
            </>
          )}
        </div>

        {/* 스크래치 레이어 (canvas) */}
        <canvas ref={canvasRef} width={300} height={160}
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none', width: '100%', height: '100%' }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
      </div>

      {/* 진행 바 */}
      {!done && (
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>긁은 정도</span>
            <span>{revealed}% / {TARGET}% 완성</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#D69E2E', width: `${Math.min(revealed / TARGET * 100, 100)}%`, transition: 'width .1s' }} />
          </div>
        </div>
      )}

      {/* 당첨 결과 */}
      {done && prize && (
        <div style={{ textAlign: 'center', animation: 'popIn .4s ease' }}>
          <div style={{ fontWeight: 900, fontSize: '1rem', color: '#D69E2E', marginBottom: 8 }}>🎉 당첨!</div>
          <Link to={`/menu/${prize.id}`}
            style={{ display: 'inline-block', padding: '8px 24px', background: '#D69E2E', color: '#fff', borderRadius: 20, fontSize: '.88rem', fontWeight: 700, textDecoration: 'none' }}>
            식당 보러가기 →
          </Link>
        </div>
      )}

      <button
        onClick={initCard}
        style={{ padding: '10px 32px', borderRadius: 50, border: 'none', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem' }}>
        🎟️ 새 복권 뽑기
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인 Game 페이지
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'roulette',  label: '🎰 룰렛',    desc: '30개 메뉴 중 랜덤' },
  { id: 'twentyq',  label: '🕵️ 스무고개', desc: '예/아니오로 맞추기' },
  { id: 'worldcup', label: '🏆 월드컵',   desc: '32개 토너먼트' },
  { id: 'scratch',  label: '🎟️ 뽑기',    desc: '긁어서 메뉴 확인' },
]

export default function Game() {
  const [activeTab, setActiveTab] = useState('roulette')
  const [menus,     setMenus]     = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    getRandomMenus(64)
      .then(setMenus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="game-wrap" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 6 }}>🎮 게임창</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', marginBottom: 24 }}>
        게임으로 오늘 메뉴를 정해보세요!
      </p>

      {/* 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {TABS.map(({ id, label, desc }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              border: `2px solid ${activeTab === id ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 12, padding: '10px 6px', cursor: 'pointer', textAlign: 'center',
              background: activeTab === id ? '#FFF5F5' : 'var(--bg-white)',
              transition: 'all .15s',
            }}>
            <div style={{ fontSize: '.95rem', fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* 게임 카드 */}
      <div className="game-card" style={{ minHeight: 420 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, color: 'var(--text-muted)', gap: 8 }}>
            <span>🍽️</span> 메뉴 불러오는 중...
          </div>
        ) : (
          <>
            {activeTab === 'roulette'  && <Roulette  menus={menus} />}
            {activeTab === 'twentyq'   && <TwentyQ   menus={menus} />}
            {activeTab === 'worldcup'  && <WorldCup  menus={menus} />}
            {activeTab === 'scratch'   && <ScratchCard menus={menus} />}
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
