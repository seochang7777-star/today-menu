import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { getRandomMenus } from '../api/services'

// ── 카테고리 아이콘 ──────────────────────────────────────────────────────────
const CAT_ICON = { 한식:'🍚', 일식:'🍣', 중식:'🥟', 양식:'🥩', 분식:'🍜', 치킨:'🍗', 카페:'☕', 술집:'🍺' }
const catIcon = (c) => CAT_ICON[c] ?? '🍴'

const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '치킨', '카페']

// ══════════════════════════════════════════════════════════════════════════════
// 게임 1 — 룰렛
// ══════════════════════════════════════════════════════════════════════════════
function Roulette() {
  const canvasRef  = useRef(null)
  const spinning   = useRef(false)
  const angleRef   = useRef(0)
  const [result,     setResult]     = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [category,   setCategory]   = useState('전체')
  const [items,      setItems]      = useState([])
  const [fetching,   setFetching]   = useState(false)

  useEffect(() => {
    setFetching(true)
    setResult(null)
    angleRef.current = 0
    getRandomMenus(30, category)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setFetching(false))
  }, [category])

  const slice = (2 * Math.PI) / (items.length || 1)
  const COLORS = ['#E53E3E','#DD6B20','var(--color-accent)','#38A169','#3182CE','#6B46C1','#D53F8C']

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
      ctx.shadowBlur  = 2
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

    const extraSpins  = (5 + Math.random() * 5) * 2 * Math.PI
    const targetAngle = angleRef.current + extraSpins
    const duration    = 4000
    const start       = performance.now()
    const startAngle  = angleRef.current

    const animate = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const cur  = startAngle + (targetAngle - startAngle) * ease

      angleRef.current = cur
      draw(cur)

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        spinning.current = false
        setIsSpinning(false)
        const norm = (((-cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
        const idx  = Math.floor(norm / slice) % items.length
        setResult(items[idx])
      }
    }
    requestAnimationFrame(animate)
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
              {cat === '전체' ? '전체' : `${CAT_ICON[cat] ?? ''} ${cat}`}
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

          <button onClick={spin} disabled={isSpinning}
            style={{
              padding: '12px 40px', borderRadius: 50,
              background: isSpinning ? 'var(--bg-surface)' : 'var(--color-primary)',
              color: isSpinning ? 'var(--text-muted)' : '#fff',
              border: 'none', fontWeight: 800, fontSize: '1rem',
              cursor: isSpinning ? 'default' : 'pointer', transition: 'all .2s',
            }}>
            {isSpinning ? '🌀 돌아가는 중...' : '🎰 룰렛 돌리기!'}
          </button>

          {result && (
            <div style={{
              width: '100%', background: 'linear-gradient(135deg,#FFF5F5,#FED7D7)',
              border: '2px solid var(--color-primary)', borderRadius: 20, padding: '24px 28px', textAlign: 'center',
              boxShadow: '0 8px 24px rgba(244,108,111,.2)',
            }}>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>🎉 오늘의 메뉴 당첨!</div>
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>{catIcon(result.category)}</div>
              <div style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: 4, color: 'var(--text-primary)' }}>{result.name}</div>
              <div style={{ display: 'inline-block', background: 'rgba(244,108,111,.12)', color: 'var(--color-primary)', borderRadius: 20, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, marginBottom: 8 }}>{result.category}</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>📍 {result.address}</div>
              <Link to={`/menu/${result.id}`} style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 50, background: 'var(--color-primary)', color: '#fff', fontSize: '.9rem', fontWeight: 800, textDecoration: 'none' }}>식당 보러가기 →</Link>
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
  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState([])
  const [target,  setTarget]  = useState(null)
  const [guess,   setGuess]   = useState(null)
  const [reveal,  setReveal]  = useState(false)

  useEffect(() => {
    if (menus.length > 0) setTarget(menus[Math.floor(Math.random() * menus.length)])
  }, [menus])

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
      {step === 0 && answers.length === 0 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', margin: '12px 0' }}>🕵️</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>스무고개로 메뉴 맞추기!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', marginBottom: 20 }}>10개 질문으로 메뉴를 알아맞혀드려요.</p>
          <button className="btn btn-primary" style={{ padding: '12px 36px', borderRadius: 50 }} onClick={() => setStep(0)}>시작하기</button>
        </div>
      )}
      {step < 10 && answers.length <= step && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '.8rem', color: 'var(--text-muted)' }}>
            <span>질문 {step + 1} / {TWENTY_QS.length}</span>
          </div>
          <div style={{ background: 'var(--bg-white)', borderRadius: 16, padding: '24px 20px', border: '1px solid var(--border-color)', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🤔</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q.q}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['yes','✅ 예!','#F0FFF4','#276749'], ['no','❌ 아니오','#FFF5F5','#C53030']].map(([val, label, bg, color]) => (
              <button key={val} onClick={() => answer(val)} style={{ padding: 20, borderRadius: 14, border: `2px solid ${color}`, background: bg, fontWeight: 800, cursor: 'pointer', color }}>{label}</button>
            ))}
          </div>
        </div>
      )}
      {step === 10 && guess && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎯</div>
          <div style={{ background: 'linear-gradient(135deg,#EBF8FF,#BEE3F8)', borderRadius: 16, padding: '24px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{catIcon(guess.category)}</div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{guess.name}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{guess.category} · {guess.address}</div>
            <Link to={`/menu/${guess.id}`} style={{ display: 'inline-block', marginTop: 12, padding: '6px 20px', background: '#3182CE', color: '#fff', borderRadius: 20, fontSize: '.82rem', fontWeight: 700, textDecoration: 'none' }}>식당 보러가기 →</Link>
          </div>
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
  const POOL = 32
  const [bracket,  setBracket]  = useState([])
  const [round,    setRound]    = useState(0)
  const [winners,  setWinners]  = useState([])
  const [champion, setChampion] = useState(null)
  const [choosing, setChoosing] = useState(null)

  const init = () => {
    const pool = [...menus].sort(() => Math.random() - .5).slice(0, POOL)
    setBracket(당구); setRound(0); setWinners([]); setChampion(null)
  }
  useEffect(() => { if (menus.length >= 4) init() }, [menus])

  const left  = bracket[round * 2]
  const right = bracket[round * 2 + 1]
  const totalMatches = bracket.length / 2
  const roundLabel = bracket.length === 2 ? '결승' : bracket.length === 4 ? '준결승' : bracket.length === 8 ? '8강' : bracket.length === 16 ? '16강' : '32강'

  const pick = (winner) => {
    if (choosing) return
    setChoosing(winner.id)
    setTimeout(() => {
      setChoosing(null)
      const newWinners = [...winners, winner]
      const nextRound  = round + 1
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

  if (champion) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
      <div style={{ background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)', border: '3px solid var(--color-accent)', borderRadius: 20, padding: '28px 24px', margin: '16px 0', display: 'inline-block' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{catIcon(champion.category)}</div>
        <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>{champion.name}</div>
        <Link to={`/menu/${champion.id}`} style={{ display: 'inline-block', marginTop: 14, padding: '8px 24px', background: 'var(--color-accent)', color: '#fff', borderRadius: 20, fontSize: '.88rem', textDecoration: 'none' }}>식당 보러가기 →</Link>
      </div>
      <div><button className="btn btn-secondary" onClick={init}>🔄 다시하기</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 800 }}>{roundLabel} ({round + 1}/{totalMatches})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
        {left && (
          <button onClick={() => pick(left)} style={{ border: `3px solid ${choosing === left.id ? 'var(--color-primary)' : 'var(--border-color)'}`, borderRadius: 16, padding: '20px 12px', cursor: 'pointer', background: 'var(--bg-white)', width: '100%' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>{catIcon(left.category)}</div>
            <div style={{ fontWeight: 800 }}>{left.name}</div>
          </button>
        )}
        <div style={{ fontWeight: 900, color: 'var(--color-primary)' }}>VS</div>
        {right && (
          <button onClick={() => pick(right)} style={{ border: `3px solid ${choosing === right.id ? 'var(--color-primary)' : 'var(--border-color)'}`, borderRadius: 16, padding: '20px 12px', cursor: 'pointer', background: 'var(--bg-white)', width: '100%' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>{catIcon(right.category)}</div>
            <div style={{ fontWeight: 800 }}>{right.name}</div>
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 4 — 뽑기 (긁기 복권)
// ══════════════════════════════════════════════════════════════════════════════
function ScratchCard({ menus }) {
  const canvasRef  = useRef(null)
  const scratching = useRef(false)
  const [prize,     setPrize]     = useState(null)
  const [revealed, setRevealed] = useState(0)
  const [done,      setDone]      = useState(false)
  const TARGET = 60

  const pick = useCallback(() => menus.length > 0 ? menus[Math.floor(Math.random() * menus.length)] : null, [menus])

  const initCard = useCallback(() => {
    const p = pick()
    if (!p) return
    setPrize(p); setRevealed(0); setDone(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    grad.addColorStop(0, '#C0C0C0'); grad.addColorStop(1, '#A8A8A8')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#888'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('🪙 긁어서 메뉴를 확인하세요!', canvas.width / 2, canvas.height / 2 + 5)
  }, [pick])

  useEffect(() => { if (menus.length > 0) initCard() }, [menus, initCard])

  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas || done) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 2 * Math.PI); ctx.fill()
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
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 300, height: 160, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--color-accent)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#FFFFF0,#FEFCBF)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {prize && (<><div style={{ fontSize: '3rem' }}>{catIcon(prize.category)}</div><div style={{ fontWeight: 900 }}>{prize.name}</div></>)}
        </div>
        <canvas ref={canvasRef} width={300} height={160} style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={(e) => { scratching.current = true; scratch(getPos(e, canvasRef.current).x, getPos(e, canvasRef.current).y) }}
          onMouseMove={(e) => { if (scratching.current) scratch(getPos(e, canvasRef.current).x, getPos(e, canvasRef.current).y) }}
          onMouseUp={() => scratching.current = false} onMouseLeave={() => scratching.current = false}
          onTouchStart={(e) => { scratching.current = true; scratch(getPos(e, canvasRef.current).x, getPos(e, canvasRef.current).y) }}
          onTouchMove={(e) => { if (scratching.current) scratch(getPos(e, canvasRef.current).x, getPos(e, canvasRef.current).y) }}
          onTouchEnd={() => scratching.current = false}
        />
      </div>
      {done && prize && <Link to={`/menu/${prize.id}`} className="btn btn-primary">식당 보러가기 →</Link>}
      <button onClick={initCard} className="btn btn-secondary">🎟️ 새 복권 뽑기</button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 게임 5 — 사다리타기 (💡 선 겹침 버그 완전 해결!)
// ══════════════════════════════════════════════════════════════════════════════
function Ladder({ menus }) {
  const MAX = 6
  const canvasRef = useRef(null)
  const [items,      setItems]      = useState([])   
  const [inputVal,   setInputVal]   = useState('')
  const [rungs,      setRungs]      = useState([])   
  const [result,     setResult]     = useState(null) 
  const [animPath,   setAnimPath]   = useState(null) 

  const NUM_ROWS = 10   
  const COLORS   = ['#E53E3E','#DD6B20','#F6AD55','#38A169','#3182CE','#6B46C1']

  // 💡 가로선이 절대 연속으로 겹치지 않게 로직 대폭 수정
  const generateRungs = useCallback((n) => {
    const r = []
    for (let row = 0; row < NUM_ROWS; row++) {
      // 각 가로 줄(row)마다 랜덤하게 하나의 다리만 생성하도록 제한하여 선이 겹치는 현상 완전 방지
      const col = Math.floor(Math.random() * (n - 1))
      r.push({ row, col })
    }
    return r
  }, [])

  const tracePath = useCallback((topIdx, rungList) => {
    let col = topIdx
    const path = [{ row: -1, col }]
    for (let row = 0; row < NUM_ROWS; row++) {
      const goRight = rungList.find(r => r.row === row && r.col === col)
      const goLeft  = rungList.find(r => r.row === row && r.col === col - 1)
      if (goRight) { path.push({ row, col }); col += 1 } 
      else if (goLeft) { path.push({ row, col }); col -= 1 }
      path.push({ row, col })
    }
    return { bottomIdx: col, path }
  }, [])

  const draw = useCallback((highlightPath = null) => {
    const canvas = canvasRef.current
    if (!canvas || items.length < 2) return
    const ctx  = canvas.getContext('2d')
    const W    = canvas.width
    const H    = canvas.height
    const n    = items.length
    const PAD  = 40
    const TOP  = 52
    const BOT  = H - 52
    const step = (W - PAD * 2) / (n - 1)

    ctx.clearRect(0, 0, W, H)
    const xOf = (col) => PAD + col * step
    const yOf = (row) => TOP + ((row + 1) / (NUM_ROWS + 1)) * (BOT - TOP)

    // 세로선 그리기
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(xOf(i), TOP); ctx.lineTo(xOf(i), BOT)
      ctx.strokeStyle = '#D1C4BE'; ctx.lineWidth = 3.5; ctx.stroke()
    }
    
    // 가로선 그리기
    rungs.forEach(({ row, col }) => {
      ctx.beginPath(); ctx.moveTo(xOf(col), yOf(row)); ctx.lineTo(xOf(col + 1), yOf(row))
      ctx.strokeStyle = '#B0A098'; ctx.lineWidth = 3.5; ctx.stroke()
    })

    // 선택된 경로 강조 표시
    if (highlightPath && highlightPath.length >= 2) {
      ctx.strokeStyle = COLORS[highlightPath[0].col % COLORS.length]; ctx.lineWidth = 5
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(xOf(highlightPath[0].col), TOP)
      for (let i = 1; i < highlightPath.length; i++) {
        ctx.lineTo(xOf(highlightPath[i].col), highlightPath[i].row === -1 ? TOP : yOf(highlightPath[i].row))
      }
      ctx.lineTo(xOf(highlightPath[highlightPath.length - 1].col), BOT); ctx.stroke()
    }

    // 상단 출발 숫자 노드
    for (let i = 0; i < n; i++) {
      const isH = highlightPath && highlightPath[0].col === i
      ctx.beginPath(); ctx.arc(xOf(i), TOP - 14, 14, 0, 2 * Math.PI); ctx.fillStyle = isH ? COLORS[i % COLORS.length] : '#F3E7DD'; ctx.fill()
      ctx.fillStyle = isH ? '#fff' : '#7A5C52'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i + 1, xOf(i), TOP - 10)
    }
    
    // 하단 결과 글자 노드
    for (let i = 0; i < n; i++) {
      const isR = highlightPath && highlightPath[highlightPath.length - 1].col === i
      ctx.fillStyle = isR ? COLORS[highlightPath[0].col % COLORS.length] : '#5E4A44'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(items[i].length > 5 ? items[i].slice(0, 5) + '…' : items[i], xOf(i), BOT + 22)
    }
  }, [items, rungs])

  useEffect(() => { draw(animPath) }, [draw, animPath])

  const addItem = () => {
    const v = inputVal.trim()
    if (!v || items.length >= MAX) return
    const next = [...items, v]; setItems(next); setInputVal(''); setResult(null); setAnimPath(null)
    const r = generateRungs(next.length); setRungs(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360 }}>
        <input value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="메뉴 입력 (최대 6개)" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none' }} />
        <button onClick={addItem} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>추가</button>
      </div>
      {items.length >= 2 ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: '#FAF6F0', borderRadius: 20, padding: 16, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)' }}>
          <canvas ref={canvasRef} width={340} height={380} style={{ width: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 40, display: 'flex' }}>
            {items.map((_, i) => <div key={i} onClick={() => { const { bottomIdx, path } = tracePath(i, rungs); setAnimPath(path); setResult({ topIdx: i, bottomIdx }) }} style={{ flex: 1, cursor: 'pointer', borderRadius: 10 }} title={`${i + 1}번 번호 클릭`} />)}
          </div>
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.9rem' }}>💡 아래 사다리에 태울 메뉴를 2개 이상 입력창에 적어 추가해 주세요!</div>
      )}
      {result && (
        <div style={{ fontWeight: 900, marginTop: 10, padding: '10px 24px', background: 'rgba(244,108,111,0.1)', color: 'var(--color-primary)', borderRadius: 50, fontSize: '1.1rem' }}>
          🎯 당첨 메뉴: {items[result.bottomIdx]}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트 (Game)
// ══════════════════════════════════════════════════════════════════════════════
function Game() {
  const [activeTab, setActiveTab] = useState('roulette')
  const [menus, setMenus] = useState([])

  useEffect(() => {
    getRandomMenus(50)
      .then(setMenus)
      .catch(() => setMenus([]))
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', padding: '0 16px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 20, fontWeight: 900 }}>🎯 결정장애 극복 게임천국</h2>
      
      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 24, paddingBottom: 6 }}>
        {[
          { id: 'roulette', label: '🎰 룰렛' },
          { id: 'twenty', label: '🕵️ 스무고개' },
          { id: 'worldcup', label: '🏆 월드컵' },
          { id: 'scratch', label: '🎟️ 복권' },
          { id: 'ladder', label: '🪜 사다리' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 선택된 게임 컴포넌트 렌더링 */}
      <div style={{ background: 'var(--bg-white)', borderRadius: 24, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {activeTab === 'roulette' && <Roulette />}
        {activeTab === 'twenty' && <TwentyQ menus={menus} />}
        {activeTab === 'worldcup' && <WorldCup menus={menus} />}
        {activeTab === 'scratch' && <ScratchCard menus={menus} />}
        {activeTab === 'ladder' && <Ladder menus={menus} />}
      </div>
    </div>
  )
}

export default Game