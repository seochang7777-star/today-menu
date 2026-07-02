import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function Support() {
  const location = useLocation();

  // 0. 사용자 권한 상태 (테스트용)
  const [userRole, setUserRole] = useState("user");

  // 1. UI 조작용 전역 상태 (탭, 검색어, 모달)
  // 마이페이지 고객문의 버튼에서 state.defaultTab='inquiry' 로 진입 시 자동 선택
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null); 
  const [openInquiryId, setOpenInquiryId] = useState(null); 

  // location state 변경 시 탭 자동 전환
  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
      if (location.state.defaultTab === 'inquiry') {
        setIsInquiryModalOpen(true);
      }
    }
  }, [location.state]);

  // 2. 페이지네이션 상태 (현재 페이지 관리)
  const [currentPage, setCurrentPage] = useState(1);

  // 3. 신규 글 입력 및 에러 제어 상태
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [formError, setFormError] = useState("");
  const [adminReplyText, setAdminReplyText] = useState("");

  // 4. 자주 묻는 질문 (FAQ) 고정 데이터
  const faqData = [
    { id: 1, q: "AI 챗봇이 제 위치와 다른 맛집을 추천해요.", a: "카카오 맵 API 연동을 위해 브라우저의 '위치 정보 제공' 동의가 필요합니다. 동의 후에도 오류가 난다면 마이페이지에서 설정을 확인해 주세요!" },
    { id: 2, q: "밥 친구 매칭 파티는 어떻게 참여하나요?", a: "파티 메뉴에서 모집 중인 동네 방을 선택한 후, '실시간 파티 참여' 버튼을 누르면 즉시 채팅방에 입장할 수 있습니다." },
    { id: 3, q: "결정 게임 항목을 내 마음대로 바꿀 수 있나요?", a: "현재는 카테고리별 기본 메뉴판만 제공 중입니다. 커스텀 항목 추가 기능은 다음 업데이트에 반영될 예정입니다!" },
    { id: 4, q: "최소 주문 금액 매칭은 어떻게 정해지나요?", a: "파티원들이 각자 고른 메뉴의 합계 금액이 해당 식당의 최소 주문 금액을 넘기면 자동으로 매칭 성공 알림이 갑니다." },
  ];

  // 4. 1:1 문의사항 로컬 목록 상태
  const [inquiries, setInquiries] = useState(() => {
    const _d = [
      { id: 1, title: "방장이 약속 장소에 나오지 않았어요.", content: "오늘 점심 파티 약속인데 방장님이 아무 말 없이 안 나오셨어요.", writer: "leewh", date: "2026-06-30", answer: "안녕하세요, 투데이메뉴 관리자입니다. 패널티 시스템을 즉시 가동하겠습니다." },
      { id: 2, title: "룰렛 게임 판이 도중에 멈추는 현상이 있습니다.", content: "모바일 크롬 브라우저로 룰렛 돌릴 때 화면이 멈추는데 확인 부탁드립니다.", writer: "gildong", date: "2026-06-29", answer: null }
    ];
    try {
      const saved = localStorage.getItem('today_menu_inquiries');
      return saved ? JSON.parse(saved) : _d;
    } catch { return _d; }
  });


  // 6. 문의글 아코디언 핸들러
  const handleInquiryToggle = (id) => {
    setOpenInquiryId(openInquiryId === id ? null : id);
    setAdminReplyText(""); 
  };

  // ✍️ 일반 회원 질문 생성 (모달 내부에서 작동)
  const handleCreateInquiry = async (e) => {
  e.preventDefault();
  setFormError("");


  const token = localStorage.getItem('token');
  console.log("현재 토큰값:", token);

  if (userRole !== "user") return;

  if (newTitle.trim().length < 4) {
    setFormError("제목은 최소 4자 이상 입력해 주세요.");
    return;
  }
  if (newContent.trim().length < 10) {
    setFormError("내용은 상세한 확인을 위해 10자 이상 적어주세요.");
    return;
  }

  try {
    const response = await fetch('/api/support/inquiries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        title: newTitle.trim(),
        content: newContent.trim()
      })
    });

    if (response.ok) {
      const savedInquiry = await response.json();
      const updated = [savedInquiry, ...inquiries];
    setInquiries(updated);
    try { localStorage.setItem('today_menu_inquiries', JSON.stringify(updated)); } catch {}
      setNewTitle("");
      setNewContent("");
      setIsInquiryModalOpen(false);
      alert("문의사항이 서버에 정상적으로 등록되었습니다.");
    } else {
      setFormError("서버 저장에 실패했습니다.");
    }
  } catch (error) {
    setFormError("네트워크 연결 오류가 발생했습니다.");
  }
};

  // 👑 관리자 답변 등록
  const handleAddAnswer = async (id) => {
  if (userRole !== "admin") return;
  if (!adminReplyText.trim()) return alert("답변 내용을 입력하세요.");


  try {
    const response = await fetch(`/api/support/inquiries/${id}/answer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: adminReplyText })
    });

    if (response.ok) {
      const updated2 = inquiries.map(item =>
        item.id === id ? { ...item, answer: adminReplyText } : item
      );
    setInquiries(updated2);
    try { localStorage.setItem('today_menu_inquiries', JSON.stringify(updated2)); } catch {}
    // dummy to avoid duplicate
    ((x) => x);
      setAdminReplyText("");
      alert("👑 답변 등록이 완료되었습니다.");
    } else {
      alert("⚠️ 답변 등록 실패.");
    }
  } catch (error) {
    console.error("오류 발생:", error);
  }
};

  // 🔍 [필터링 및 페이징] 실시간 내부 검색 반영
  const filteredFaqs = faqData.filter(item => 
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInquiries = inquiries.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🔢 [페이지네이션 핵심 수식] 페이지당 1개 슬라이싱 연산
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInquiries = filteredInquiries.slice(indexOfFirstItem, indexOfLastItem);

  return (
  // 🌟 bg-[#FDFAD1]를 제거하고 bg-transparent를 넣어 투명하게 만듭니다.
  <div className="bg-transparent min-h-screen text-gray-800 pb-20 font-sans antialiased">
    
    {/* 🛠️ 시연 및 테스트용 권한 탭 스위처 */}
    <div className="fixed bottom-4 right-4 bg-white p-3 rounded-[16px] shadow-xl border border-[#FEB95C] z-50 flex gap-2 text-xs">
      <span className="font-bold self-center text-gray-700">시연 권한:</span>
      <button onClick={() => { setUserRole("user"); setOpenInquiryId(null); }} className={`px-3 py-1 rounded-[8px] font-bold ${userRole === "user" ? "bg-[#F46C6F] text-white" : "bg-gray-100 text-gray-500"}`}>일반회원</button>
      <button onClick={() => { setUserRole("admin"); setOpenInquiryId(null); }} className={`px-3 py-1 rounded-[8px] font-bold ${userRole === "admin" ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-500"}`}>관리자</button>
    </div>

    {/* 1. 타이틀 영역 */}
    <div className="bg-transparent py-8 text-center border-b border-[#FEB95C]/40">
      <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">고객센터</h1>
    </div>
    
    {/* 이하 나머지 코드 동일 ... */}


      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        {/* 2. 클라이언트 검색창 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input 
              type="text" 
              placeholder="찾는 단어를 입력하면 아래 리스트가 실시간으로 필터링됩니다..."
              value={searchQuery}

              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} // 검색 시 첫 페이징으로 이동하여 에러 방어
              className="w-full py-2.5 px-6 bg-white text-gray-950 text-sm font-medium rounded-full shadow-sm border-2 border-[#FEB95C] focus:outline-none focus:border-[#F46C6F]"

            />
            <span className="absolute right-5 top-3 text-[var(--text-light)] text-sm">🔍</span>
          </div>
        </div>

        {/* 3. 상단 탭 제어 & 우측 1:1 문의 버튼 배치 */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-10">
          <div className="flex gap-2">
            {[
              { id: "all", label: "📋 전체" },
              { id: "faq", label: "✨ 자주 묻는 질문" },
              { id: "inquiry", label: "💬 1:1 문의사항" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-all border shadow-sm
                  ${activeTab === tab.id 
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" 
                    : "bg-white text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-surface)]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ✍️ 오른쪽 끝 구석에 깔끔히 박힌 모달 오픈 버튼 */}
          {(activeTab === "all" || activeTab === "inquiry") && (
            <button
              onClick={() => { setIsInquiryModalOpen(true); setFormError(""); }}
              className="w-full sm:w-auto px-5 py-2 font-black text-xs sm:text-sm rounded-full shadow-md transition-all flex items-center justify-center gap-1" style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              <span>✍️</span> 1:1 문의하기
            </button>
          )}
        </div>

        {/* 4. FAQ 목록 출력 */}
        {(activeTab === "all" || activeTab === "faq") && (
          <section className="mb-12">
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-[var(--bg-surface)] border border-[var(--color-accent)] text-[var(--text-primary)] font-extrabold text-xs tracking-wider rounded-[24px] shadow-sm">자주 묻는 질문</span>
            </div>
            {filteredFaqs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 bg-white text-center rounded-[24px]">검색 결과와 일치하는 FAQ가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {filteredFaqs.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveFaq(item)}
                    className="bg-white hover:bg-[var(--bg-surface)] p-5 rounded-[24px] min-h-[100px] flex items-center justify-center text-center cursor-pointer transition-all border border-[var(--border-color)] shadow-sm hover:shadow-md group"
                  >
                    <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] line-clamp-3">
                      Q. {item.q}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 5. 1:1 문의사항 리스트 및 다이나믹 대규모 페이지네이션 구역 */}
        {(activeTab === "all" || activeTab === "inquiry") && (
          <section className="mb-10">
            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-[var(--bg-surface)] border border-[var(--color-accent)] text-[var(--text-primary)] font-extrabold text-xs tracking-wider rounded-[24px] shadow-sm">문의사항</span>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {currentInquiries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center bg-white">등록된 문의글이 없거나 검색 결과가 없습니다.</p>

              ) : (
                currentInquiries.map(item => {
                  const isOpened = openInquiryId === item.id;
                  return (
                    <div key={item.id} className="divide-y divide-[var(--border-color)]">
                      <div 
                        onClick={() => handleInquiryToggle(item.id)}
                        className="w-full flex justify-between items-center p-4 bg-white hover:bg-[var(--bg-surface)]/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden pr-4">
                          <span className={`text-[10px] px-2.5 py-0.5 font-bold rounded-full shrink-0 ${item.answer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.answer ? '답변완료' : '답변대기'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</span>
                        </div>
                        <span className={`text-[var(--text-light)] text-xs transition-transform ${isOpened ? 'rotate-180' : ''}`}>▼</span>
                      </div>

                      {isOpened && (
                        <div className="bg-[var(--bg-surface)] p-5 text-xs sm:text-sm space-y-4 border-t border-[var(--border-color)]">
                          <div className="bg-white p-4 rounded-[16px] shadow-sm">
                            <div className="flex justify-between text-[11px] text-[var(--text-light)] mb-2 font-medium">
                              <span>작성자: {item.writer}</span>
                              <span>{item.date}</span>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed font-medium whitespace-pre-line">{item.content}</p>
                          </div>

                          {item.answer ? (
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 rounded-[16px]">
                              <p className="text-[11px] font-black text-[var(--color-primary)] mb-1">👑 관리자 답변</p>
                              <p className="text-[var(--text-primary)] leading-relaxed font-semibold">{item.answer}</p>
                            </div>
                          ) : (
                            userRole === "admin" && (
                              <div className="bg-white p-4 rounded-[16px] border border-dashed border-[var(--border-color)] shadow-sm">
                                <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2">🔧 관리자 전용 답변란</p>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="답변 내용을 입력하세요..."
                                    value={adminReplyText}
                                    onChange={(e) => setAdminReplyText(e.target.value)}
                                    className="flex-1 p-2 border border-[var(--border-color)] rounded-[8px] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                                  />
                                  <button 
                                    onClick={() => handleAddAnswer(item.id)}
                                    className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-xs rounded-[8px] transition-colors"
                                  >
                                    등록
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 🔢 [요청 기능] << < 숫자 > >> 형태의 콘트롤러 바 */}
            {filteredInquiries.length > 0 && (
              <div className="flex justify-center items-center gap-1 mt-8">
                {/* 처음으로 [<<] */}
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 rounded bg-white border border-gray-200 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                >
                  &lt;&lt;
                </button>

                {/* 이전으로 [<] */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 rounded bg-white border border-gray-200 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                >
                  &lt;
                </button>

                {/* 페이지 목록 루프 출력 */}
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-1.5 rounded text-xs font-bold border shadow-sm transition-all
                        ${currentPage === pageNumber 
                          ? "bg-[#F46C6F] text-white border-[#F46C6F]" 
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {/* 다음으로 [>] */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 rounded bg-white border border-gray-200 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                >
                  &gt;
                </button>

                {/* 끝으로 [>>] */}
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 rounded bg-white border border-gray-200 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                >
                  &gt;&gt;
                </button>
              </div>
            )}
          </section>
        )}

      </div>

      {/* ✍️ 6. 1:1 새로운 문의 등록 모달 팝업창 */}
      {isInquiryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">

          <div className="bg-white p-6 rounded-[24px] max-w-xl w-full shadow-2xl border border-gray-100 relative">
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-1.5">

              <span>✍️</span> 1:1 새로운 문의 등록하기
            </h3>
            
            {userRole === "user" ? (
              <form onSubmit={handleCreateInquiry} className="space-y-3">
                <input 
                  type="text"
                  placeholder="문의 제목을 입력해 주세요 (최소 4자)."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 border border-[var(--border-color)] rounded-[12px] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
                <textarea 
                  placeholder="문의하실 구체적인 내용을 작성해 주세요 (최소 10자)."
                  rows="4"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 border border-[var(--border-color)] rounded-[12px] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
                
                {formError && <p className="text-[11px] font-bold text-red-500">{formError}</p>}
                
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsInquiryModalOpen(false)}
                    className="flex-1 py-2.5 bg-[var(--bg-surface)] hover:bg-gray-200 text-[var(--text-secondary)] font-bold text-xs rounded-full transition-all"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-xs rounded-full shadow transition-all"
                  >
                    질문 등록 완료
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-[var(--bg-surface)] py-6 px-4 rounded-[16px] text-center border border-dashed border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] font-bold leading-relaxed mb-4">
                  🔒 관리자(Admin) 계정은 답변 모드이므로 신규 문의를 남길 수 없습니다.
                </p>
                <button 
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="px-4 py-2 bg-gray-900 text-white font-bold text-xs rounded-full"
                >
                  닫기
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setIsInquiryModalOpen(false)} 
              className="absolute top-4 right-5 text-[var(--text-light)] hover:text-black font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 7. FAQ 모달 팝업창 */}
      {activeFaq && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-[24px] max-w-md w-full shadow-xl relative border border-[var(--border-color)]">
            <div className="mb-4">
              <span className="text-[10px] bg-[var(--bg-surface)] text-[var(--text-primary)] font-black px-2.5 py-0.5 rounded-full">자주 묻는 질문</span>
            </div>
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3 pr-6">Q. {activeFaq.q}</h4>
            <div className="bg-[var(--bg-surface)] p-4 rounded-[16px] mb-5 border border-[var(--border-color)]">
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed font-medium whitespace-pre-line">
                {activeFaq.a}
              </p>
            </div>
            <button 
              onClick={() => setActiveFaq(null)}
              className="w-full py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-full transition-colors"
            >
              닫기
            </button>
            <button onClick={() => setActiveFaq(null)} className="absolute top-4 right-5 text-[var(--text-light)] hover:text-black font-bold text-sm">✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
