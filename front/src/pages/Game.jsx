import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { sendChat } from '../api/services'

// 비회원 fallback 추천 (JWT 불필요)
const FALLBACK_RESULTS = [
  '오늘은 삼겹살 어떠세요? 🥩\n든든하게 배를 채우기 좋고, 기분 전환에도 최고예요!',
  '비빔밥 한 그릇 어떠세요? 🍚\n영양 균형도 잡히고 속도 편안한 한 끼랍니다.',
  '따뜻한 국물 요리 추천드려요 🍜\n피곤할 때는 뜨끈한 국물 한 그릇이 제일이죠.',
  '초밥이 딱입니다! 🍣\n가볍게 먹고 싶을 때 최고의 선택이에요.',
  '치킨 어때요? 🍗\n어떤 기분이든 치킨은 항상 정답입니다!',
]

// ── 질문 데이터 ───────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    question: '지금 기분이 어떠세요?',
    sub: '현재 기분에 맞는 메뉴를 추천해드려요',
    emoji: '😊',
    choices: [
      { label: '😄 신나요!',     value: '신난다' },
      { label: '😌 편안해요',    value: '편안함' },
      { label: '😫 피곤해요',    value: '피곤함' },
      { label: '😤 스트레스',    value: '스트레스' },
    ],
  },
  {
    id: 2,
    question: '혼자 드시나요, 같이 드시나요?',
    sub: '인원에 맞는 식당을 찾아드려요',
    emoji: '👥',
    choices: [
      { label: '🙋 혼밥',       value: '혼밥' },
      { label: '👫 2인',         value: '2인' },
      { label: '👨‍👩‍👧 가족',       value: '가족' },
      { label: '🎉 단체(4+)',    value: '단체' },
    ],
  },
  {
    id: 3,
    question: '어떤 느낌의 음식이 끌리나요?',
    sub: '취향에 맞는 맛을 골라보세요',
    emoji: '🍽️',
    choices: [
      { label: '🌶️ 매콤한 것',   value: '매운맛' },
      { label: '🍜 따뜻한 것',   value: '따뜻함' },
      { label: '🥗 가벼운 것',   value: '가벼운' },
      { label: '🥩 든든한 것',   value: '든든함' },
      { label: '🍣 색다른 것',   value: '색다름', full: true },
    ],
  },
  {
    id: 4,
    question: '예산은 어느 정도인가요?',
    sub: '1인 기준 예산을 선택해주세요',
    emoji: '💰',
    choices: [
      { label: '~1만원',         value: '1만원 이하' },
      { label: '1~2만원',        value: '1~2만원' },
      { label: '2~3만원',        value: '2~3만원' },
      { label: '3만원+',         value: '3만원 이상' },
    ],
  },
]

const TOTAL = QUESTIONS.length

export default function Game() {
  const { user } = useAuth()
  const [activeTab,   setActiveTab]   = useState('recommend')  // recommend | preference
  const [step,        setStep]        = useState(0)   // 0 = 인트로, 1~N = 질문, N+1 = 결과
  const [answers,     setAnswers]     = useState({})
  const [result,      setResult]      = useState(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [selectedOpt, setSelectedOpt] = useState(null)

  const currentQ = QUESTIONS[step - 1]
  const progress  = step === 0 ? 0 : Math.round((step / TOTAL) * 100)

  // ── AI 추천 결과 생성 ──────────────────────────────────────────────────────
  const generateResult = async (finalAnswers) => {
    setAiLoading(true)
    const summary = Object.entries(finalAnswers)
      .map(([q, a]) => `${q}: ${a}`)
      .join(', ')

    // 비회원: fallback 메시지 (JWT 없이도 동작)
    if (!user) {
      setTimeout(() => {
        const idx = Math.floor(Math.random() * FALLBACK_RESULTS.length)
        setResult(FALLBACK_RESULTS[idx])
        setAiLoading(false)
      }, 1200)
      return
    }

    const msg = `사용자 상황: ${summary}. 이에 맞는 메뉴를 한 가지 추천하고, 이유를 2~3문장으로 짧게 설명해줘.`
    try {
      const data = await sendChat(msg, [])
      setResult(data.reply)
    } catch {
      const idx = Math.floor(Math.random() * FALLBACK_RESULTS.length)
      setResult(FALLBACK_RESULTS[idx])
    } finally {
      setAiLoading(false)
    }
  }

  // ── 선택지 클릭 ───────────────────────────────────────────────────────────
  const handleChoice = async (value) => {
    setSelectedOpt(value)
    const newAnswers = { ...answers, [currentQ.question]: value }
    setAnswers(newAnswers)

    setTimeout(async () => {
      setSelectedOpt(null)
      if (step < TOTAL) {
        setStep(step + 1)
      } else {
        setStep(TOTAL + 1)
        await generateResult(newAnswers)
      }
    }, 300)
  }

  const reset = () => { setStep(0); setAnswers({}); setResult(null); setSelectedOpt(null) }

  return (
    <div className="game-wrap">
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 20 }}>게임창</h1>

      <div className="game-card">
        {/* ── 탭 ── */}
        <div className="game-tabs">
          <button className={`game-tab${activeTab === 'recommend' ? ' active' : ''}`}
            onClick={() => { setActiveTab('recommend'); reset() }}>메뉴 추천</button>
          <button className={`game-tab${activeTab === 'preference' ? ' active' : ''}`}
            onClick={() => setActiveTab('preference')}>내 취향</button>
        </div>

        {/* ── 진행바 ── */}
        {step > 0 && step <= TOTAL && (
          <div className="game-progress">
            <div className="game-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* ══════════ 인트로 (step === 0) ══════════ */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div className="game-question">오늘 뭐 먹을까요?</div>
            <div className="game-sub">몇 가지 질문으로 딱 맞는 메뉴를 추천해드려요</div>

            {/* 이미지 영역 */}
            <div className="game-image">🍽️</div>

            {/* 버튼 */}
            <button className="game-btn-main" onClick={() => setStep(1)}>
              🎲 메뉴 추천 받기
            </button>

            <div className="game-hint">
              {user ? `${user.nickname}님의 취향을 반영해 추천해드려요` : '로그인하면 취향 기반 추천을 받을 수 있어요'}
            </div>
          </div>
        )}

        {/* ══════════ 질문 (step 1 ~ TOTAL) ══════════ */}
        {step >= 1 && step <= TOTAL && currentQ && (
          <div>
            <div className="game-question">{currentQ.question}</div>
            <div className="game-sub">{currentQ.sub}</div>
            <div className="game-image">{currentQ.emoji}</div>

            <div className="game-hint">
              {step}/{TOTAL} 단계
            </div>

            <div className="game-choice-label">
              선택지 <span style={{ color: 'var(--text-muted)' }}>?</span>
            </div>
            <div className="game-choices">
              {currentQ.choices.map((c) => (
                <button key={c.value}
                  className={`game-choice${c.full ? ' full' : ''}${selectedOpt === c.value ? ' selected' : ''}`}
                  onClick={() => handleChoice(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* 이전으로 */}
            {step > 1 && (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}
                onClick={() => { setStep(step - 1); setSelectedOpt(null) }}>
                ← 이전
              </button>
            )}
          </div>
        )}

        {/* ══════════ 결과 (step > TOTAL) ══════════ */}
        {step > TOTAL && (
          <div className="game-result">
            {aiLoading ? (
              <>
                <div className="game-result-emoji">🤔</div>
                <div className="game-result-title">AI가 생각 중...</div>
                <div className="game-result-desc">취향을 분석해서 최적의 메뉴를 찾고 있어요</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: `bounce 1s ${i * .2}s infinite` }} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="game-result-emoji">🎉</div>
                <div className="game-result-title">오늘의 추천 메뉴!</div>
                <div className="game-result-desc">{result}</div>

                {/* 선택 요약 */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius)', padding: 14, marginBottom: 20, textAlign: 'left' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>내 선택 요약</div>
                  {Object.entries(answers).map(([q, a]) => (
                    <div key={q} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', padding: '3px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{q}</span>
                      <span style={{ fontWeight: 600 }}>{a}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={reset}>🔄 다시 추천받기</button>
                  <a href="/menu" className="btn btn-secondary">🍽️ 메뉴 보러가기</a>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ 내 취향 탭 ══════════ */}
        {activeTab === 'preference' && step === 0 && (
          <div style={{ textAlign: 'center', marginTop: -20 }}>
            <div className="game-question">내 취향 설정</div>
            <div className="game-sub">프로필에서 취향을 설정하면 더 정확한 추천을 받을 수 있어요</div>
            <div className="game-image">🎯</div>
            {user ? (
              <>
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--border-radius)', padding: 16, marginBottom: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 8 }}>현재 설정</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                    <div>좋아하는 음식: {(user.preferences?.likes ?? []).join(', ') || '없음'}</div>
                    <div style={{ marginTop: 4 }}>알러지: {user.allergies || '없음'}</div>
                  </div>
                </div>
                <a href="/mypage/edit" className="btn btn-primary">✏️ 취향 수정하기</a>
              </>
            ) : (
              <>
                <div className="game-hint">로그인하면 취향을 저장할 수 있어요</div>
                <a href="/login" className="btn btn-primary">로그인하기</a>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
