import { useState } from 'react'

const NOTICES = [
  {
    id: 1,
    category: '서비스',
    title: '오늘 뭐먹지? 서비스 오픈 안내',
    date: '2024-12-01',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\nAI 기반 맞춤형 식단 추천 서비스 '오늘 뭐먹지?'가 정식 오픈되었습니다.\n\n주요 서비스 내용은 다음과 같습니다.\n\n1. AI 챗봇 기반 메뉴 추천\n   - 취향과 위치를 기반으로 오늘의 베스트 맛집을 추천해드립니다.\n\n2. 밥친구 매칭 서비스\n   - 함께 식사할 파티를 만들거나 참여할 수 있습니다.\n\n3. 맛집 즐겨찾기\n   - 마음에 드는 식당을 찜하고 나만의 리스트를 만들어보세요.\n\n앞으로도 더 좋은 서비스로 찾아뵙겠습니다. 감사합니다.`,
  },
  {
    id: 2,
    category: '운영',
    title: '개인정보 처리방침 개정 안내',
    date: '2024-12-10',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n개인정보 처리방침이 아래와 같이 개정되었습니다.\n\n■ 시행일: 2024년 12월 10일\n\n■ 주요 변경 사항\n- 수집하는 개인정보 항목 명확화\n- 제3자 제공 관련 내용 업데이트\n- 개인정보 보유 및 이용기간 상세 안내\n\n자세한 내용은 개인정보처리방침 페이지에서 확인하실 수 있습니다.\n\n궁금하신 사항은 고객센터로 문의해 주세요. 감사합니다.`,
  },
  {
    id: 3,
    category: '비즈니스',
    title: '비즈니스 문의 안내',
    date: '2024-12-15',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n비즈니스 관련 문의는 아래 채널을 통해 접수해 주세요.\n\n■ 맛집/식당 등록 문의\n- 저희 서비스는 내부 검수 후 맛집을 등록하고 있습니다.\n- 등록을 원하시는 업체는 고객센터로 문의해 주시면 담당자가 안내드립니다.\n\n■ 제휴 및 파트너십 문의\n- 이메일: support@today-menu.com\n- 영업일 기준 2~3일 내 답변드립니다.\n\n■ 광고 및 마케팅 문의\n- 동일 이메일로 문의 주시면 빠르게 답변드리겠습니다.\n\n감사합니다.`,
  },
  {
    id: 4,
    category: '서비스',
    title: '앱 업데이트 안내 (v1.2.0)',
    date: '2024-12-20',
    content: `안녕하세요, 오늘 뭐먹지? 팀입니다.\n\n앱이 v1.2.0으로 업데이트되었습니다.\n\n■ 새로운 기능\n- 저장 장소 기능 추가: 자주 가는 장소를 최대 3개 저장하고 근처 맛집 추천을 받아보세요.\n- 매너온도 시스템 도입: 활발한 활동을 통해 매너온도를 높여보세요.\n- 파티 채팅 기능 개선: 더 빠르고 안정적인 채팅 환경을 제공합니다.\n\n■ 버그 수정\n- 일부 환경에서 로그인이 유지되지 않던 문제 수정\n- 메뉴 추천 결과가 간헐적으로 표시되지 않던 문제 수정\n\n항상 더 나은 서비스를 위해 노력하겠습니다. 감사합니다.`,
  },
]

const CATEGORY_COLORS = {
  '서비스': { bg: 'bg-[#EBF8FF]', text: 'text-[#2B6CB0]' },
  '운영':   { bg: 'bg-[#F0FFF4]', text: 'text-[#276749]' },
  '비즈니스': { bg: 'bg-[#FFF6E4]', text: 'text-[var(--color-accent)]' },
}

export default function Notice() {
  const [selectedId, setSelectedId] = useState(null)

  const selected = NOTICES.find((n) => n.id === selectedId)

  return (
    <div className="max-w-[760px] mx-auto py-10 px-4">

      {/* 타이틀 */}
      <div className="mb-8">
        <h1 className="text-[2rem] font-black mb-1">공지사항</h1>
        <p className="text-[.88rem] text-[var(--text-muted)]">
          서비스 운영 및 업데이트 관련 공지를 확인하세요.
        </p>
      </div>

      {/* 상세 보기 */}
      {selected ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-lg)] p-7">
          <button
            onClick={() => setSelectedId(null)}
            className="text-[.85rem] text-[var(--text-muted)] font-bold mb-5 flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors bg-transparent border-0"
          >
            ← 목록으로
          </button>
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
        /* 목록 */
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-lg)] overflow-hidden">
          {/* 헤더 */}
          <div className="grid grid-cols-[80px_1fr_120px] px-5 py-3 bg-[var(--bg-surface)] text-[.8rem] font-bold text-[var(--text-muted)] border-b border-[var(--border-color)]">
            <span>분류</span>
            <span>제목</span>
            <span className="text-right">날짜</span>
          </div>

          {/* 목록 아이템 */}
          {NOTICES.slice().reverse().map((notice) => (
            <button
              key={notice.id}
              onClick={() => setSelectedId(notice.id)}
              className="grid grid-cols-[80px_1fr_120px] w-full px-5 py-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-surface)] transition-colors text-left bg-transparent"
            >
              <span className={`text-[.75rem] font-bold px-2.5 py-1 rounded-full w-fit ${CATEGORY_COLORS[notice.category]?.bg} ${CATEGORY_COLORS[notice.category]?.text}`}>
                {notice.category}
              </span>
              <span className="text-[.92rem] font-bold text-[var(--text-primary)] self-center pr-4 truncate">
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
