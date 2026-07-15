import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { getNotices, createNotice, deleteNotice } from '../api/services'

const CATEGORY_COLORS = {
  '서비스':   { bg: 'bg-[#EBF8FF]', text: 'text-[#2B6CB0]' },
  '운영':     { bg: 'bg-[#F0FFF4]', text: 'text-[#276749]' },
  '비즈니스': { bg: 'bg-[#FFF6E4]', text: 'text-[var(--color-accent)]' },
  '업데이트': { bg: 'bg-[#FAF5FF]', text: 'text-[#6B46C1]' },
}

const DEFAULT_NOTICES = [
  {
    id: 'd1',
    category: '서비스',
    title: '오늘 뭐먹지? 서비스 오픈 안내',
    date: '2026-07-01',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\nAI 기반 맞춤형 식단 추천 서비스 '오늘 뭐먹지?'가 정식 오픈되었습니다.\n\n주요 서비스 내용은 다음과 같습니다.\n\n1. AI 챗봇 기반 메뉴 추천\n   - 취향과 위치를 기반으로 오늘의 베스트 맛집을 추천해드립니다.\n\n2. 밥친구 매칭 서비스\n   - 함께 식사할 파티를 만들거나 참여할 수 있습니다.\n\n3. 맛집 즐겨찾기\n   - 마음에 드는 식당을 찜하고 나만의 리스트를 만들어보세요.\n\n앞으로도 더 좋은 서비스로 찾아뵙겠습니다. 감사합니다.`,
  },
  {
    id: 'd2',
    category: '운영',
    title: '개인정보 처리방침 개정 안내',
    date: '2026-07-01',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n개인정보 처리방침이 아래와 같이 개정되었습니다.\n\n■ 시행일: 2026년 12월 10일\n\n■ 주요 변경 사항\n- 수집하는 개인정보 항목 명확화\n- 제3자 제공 관련 내용 업데이트\n- 개인정보 보유 및 이용기간 상세 안내\n\n자세한 내용은 개인정보처리방침 페이지에서 확인하실 수 있습니다.\n\n궁금하신 사항은 고객센터로 문의해 주세요. 감사합니다.`,
  },
  {
    id: 'd3',
    category: '비즈니스',
    title: '비즈니스 문의 안내',
    date: '2026-07-01',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n비즈니스 관련 문의는 아래 채널을 통해 접수해 주세요.\n\n■ 맛집/식당 등록 문의\n- 저희 서비스는 내부 검수 후 맛집을 등록하고 있습니다.\n- 등록을 원하시는 업체는 고객센터로 문의해 주시면 담당자가 안내드립니다.\n\n■ 제휴 및 파트너십 문의\n- 이메일: support@today-menu.com\n- 영업일 기준 2~3일 내 답변드립니다.\n\n감사합니다.`,
  },
  {
    id: 'd4',
    category: '업데이트',
    title: '앱 업데이트 안내 (v1.2.0)',
    date: '2026-07-01',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n앱이 v1.2.0으로 업데이트되었습니다.\n\n■ 새로운 기능\n- 저장 장소 기능 추가\n- 매너온도 시스템 도입\n- 파티 채팅 기능 개선\n\n■ 버그 수정\n- 일부 환경에서 로그인이 유지되지 않던 문제 수정\n- 메뉴 추천 결과가 간헐적으로 표시되지 않던 문제 수정\n\n항상 더 나은 서비스를 위해 노력하겠습니다. 감사합니다.`,
  },
]

export default function Notice() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'admin'

  const [notices,    setNotices]    = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [form,       setForm]       = useState({ title: '', content: '', category: '서비스' })
  const [error,      setError]      = useState('')

  useEffect(() => {
    loadNotices()
  }, [])

  const loadNotices = async () => {
    try {
      const data = await getNotices()
      // DB 공지 + 기본 공지 합치기
      const dbNotices = (data || []).map(n => ({ ...n, isDB: true }))
      // DB 공지 있으면 DB만, 없으면 기본 공지 표시
      setNotices(dbNotices.length > 0 ? dbNotices : DEFAULT_NOTICES)
    } catch {
      setNotices(DEFAULT_NOTICES)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      await createNotice(form)
      setForm({ title: '', content: '', category: '서비스' })
      setShowForm(false)
      setError('')
      await loadNotices()
      alert('공지사항이 등록되었습니다.')
    } catch (e) {
      setError(e.response?.data?.message ?? '등록에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const handleDelete = async (noticeId) => {
    if (!window.confirm('공지사항을 삭제하시겠습니까?')) return
    try {
      await deleteNotice(noticeId)
      await loadNotices()
    } catch (e) {
      alert(e.response?.data?.message ?? '삭제에 실패했습니다.')
    }
  }

  const selected = notices.find(n => n.id === selectedId)

  return (
    <div className="max-w-[760px] mx-auto py-10 px-4">

      {/* 타이틀 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[2rem] font-black mb-1">공지사항</h1>
          <p className="text-[.88rem] text-[var(--text-muted)]">
            서비스 운영 및 업데이트 관련 공지를 확인하세요.
          </p>
        </div>
        {isAdmin && !selectedId && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 18px',
              fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {showForm ? '취소' : '✏️ 공지 작성'}
          </button>
        )}
      </div>

      {/* 관리자 공지 작성 폼 */}
      {isAdmin && showForm && (
        <div style={{
          background: 'var(--bg-white)', border: '1px solid var(--border-color)',
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ fontWeight: 900, marginBottom: 16 }}>새 공지사항 작성</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <select
                className="form-control"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {['서비스', '운영', '비즈니스', '업데이트'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">제목 *</label>
              <input
                type="text"
                className="form-control"
                placeholder="공지 제목을 입력하세요"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">내용 *</label>
              <textarea
                className="form-control"
                rows={8}
                placeholder="공지 내용을 입력하세요"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: '.85rem', marginBottom: 10 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                style={{ padding: '8px 18px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '8px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
              >
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 상세 보기 */}
      {selected ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-lg)] p-7">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="목록으로 이동"
              className="transition hover:scale-110"
            >
              <img
                src="/img/icon/arrow_left.png" alt="뒤로가기"
                className="h-8 w-8"
              />
            </button>
            {isAdmin && selected.isDB && (
              <button
                onClick={() => handleDelete(selected.id)}
                style={{ color: 'var(--color-danger)', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 6, padding: '4px 12px', fontSize: '.8rem', cursor: 'pointer', fontWeight: 700 }}
              >
                🗑️ 삭제
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[.75rem] font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[selected.category]?.bg} ${CATEGORY_COLORS[selected.category]?.text}`}>
              {selected.category}
            </span>
            <span className="text-[.78rem] text-[var(--text-muted)]">{selected.date}</span>
          </div>
          <h2 className="text-[1.2rem] font-black mb-6 text-[var(--text-primary)]">
            {selected.title}
          </h2>
          <hr className="border-[var(--border-color)] mb-6" />
          <p className="text-[.9rem] text-[var(--text-secondary)] leading-8 whitespace-pre-line break-keep">
            {selected.content}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-lg)] overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_120px] px-5 py-3 bg-[var(--bg-surface)] text-[.8rem] font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
            <span>분류</span>
            <span>제목</span>
            <span className="text-right">날짜</span>
          </div>
          {notices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => setSelectedId(notice.id)}
              className="grid grid-cols-[80px_1fr_120px] w-full px-5 py-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-surface)] transition-colors text-left bg-transparent"
            >
              <span className={`text-[.75rem] font-bold px-2.5 py-1 rounded-full w-fit ${CATEGORY_COLORS[notice.category]?.bg ?? 'bg-gray-100'} ${CATEGORY_COLORS[notice.category]?.text ?? 'text-gray-600'}`}>
                {notice.category}
              </span>
              <span className="text-[.92rem] font-bold text-[var(--text-primary)] self-center pr-4 truncate">
                {notice.isDB && <span style={{ color: 'var(--color-primary)', marginRight: 4 }}>🆕</span>}
                {notice.title}
              </span>
              <span className="text-[.8rem] text-[var(--text-muted)] self-center text-right">
                {notice.date}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
