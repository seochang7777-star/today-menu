import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Company() {
  const navigate = useNavigate();

  const companyData = {
    badge: "인류 최대의 난제 해결 중 ⏰",
    title: "배달 최소주문금액보다\n친구 구하기가 더 어렵다",
    description: "우리는 단순히 식당 주소를 알려주는 지도가 아닙니다. OpenAI로 내 취향에 딱 맞는 메뉴를 제안받고, 동네 친구들과 스릴 넘치는 미니 게임을 즐기며, 따뜻한 밥 한 끼를 함께 먹을 수 있는 실시간 파티 매칭 플랫폼입니다."
  };

  return (
    <div className="bg-[#FDFAD1] min-h-screen font-sans antialiased text-gray-800 pb-20">
      
      

      {/* 2. 히어로 인트로 섹션 */}
      <section className="max-w-4xl mx-auto px-6 pt-16 text-center">
        <span className="inline-block px-4 py-1.5 bg-[#FFEE7F] border border-[#FEB95C] text-gray-900 font-extrabold text-xs tracking-wider rounded-[24px] mb-6 shadow-sm">
          {companyData.badge}
        </span>

        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 leading-tight sm:leading-tight mb-6 whitespace-pre-line">
          {companyData.title.split('\n').map((line, idx) => (
            idx === 1 ? <span key={idx} className="text-[#F46C6F]"><br/>{line}</span> : <span key={idx}>{line}</span>
          ))}
        </h1>

        <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto mb-12 font-medium">
          {companyData.description}
        </p>
      </section>

      {/* 3. 핵심 기능 소개 */}
      <section className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8 mb-20">
        <div className="bg-white p-8 border-b-8 border-[#FEB95C] rounded-[24px] shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-[#FFEE7F] flex justify-center items-center text-2xl rounded-[16px] mb-6">🤖</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">AI 취향 저격 추천</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            결정 장애가 찾아왔나요? 내 기분과 상황을 이해하는 <strong className="text-gray-900 font-semibold">OpenAI 기반 ChatBot</strong>이 맛집 정보를 바탕으로 완벽한 메뉴를 제시합니다.
          </p>
        </div>

        <div className="bg-white p-8 border-b-8 border-[#F46C6F] rounded-[24px] shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-[#F1B8AE]/30 flex justify-center items-center text-2xl rounded-[16px] mb-6">🎮</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">유쾌한 결정 게임</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            메뉴 고르기도 게임처럼 재밌게! 팀원들과 함께 즐길 수 있는 미니 게임 회전판을 돌려 오늘 한 끼의 운명을 짜릿하게 정해보세요.
          </p>
        </div>

        <div className="bg-white p-8 border-b-8 border-[#F1B8AE] rounded-[24px] shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-[#FDFAD1] border border-[#FFEE7F] flex justify-center items-center text-2xl rounded-[16px] mb-6">📍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">동네 밥 친구 매칭</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            카카오 맵 API로 내 주변 파티를 한눈에 파악하세요. 최소주문금액 걱정 없이 실시간 채팅으로 소통하며 든든한 밥 친구를 사늘 수 있습니다.
          </p>
        </div>
      </section>

      {/* 4. 하단 액션 유도 박스 */}
      <section className="max-w-4xl mx-4 sm:mx-auto p-8 sm:p-12 text-center text-white bg-[#F46C6F] rounded-[24px] shadow-xl relative overflow-hidden">
        <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight">
          오늘도 "아무거나"라고 말하셨나요?
        </h2>
        <p className="text-white/90 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed font-medium">
          고민하며 낭비하는 시간은 줄이고, <br />
          동네 친구와 함께 채우는 유쾌한 식사 시간을 시작해 보세요!
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => navigate('/menu')}
            className="px-8 py-3 font-extrabold bg-[#FFEE7F] text-gray-900 shadow-md hover:bg-[#feb95c] rounded-[24px] text-sm transition-all"
          >
            🍚 추천 메뉴 보기
          </button>
          <button
            onClick={() => navigate('/party')}
            className="px-8 py-3 font-extrabold border-2 border-white/60 bg-white/10 hover:bg-white/20 text-white rounded-[24px] text-sm transition-all"
          >
            🤝 실시간 파티 참여
          </button>
        </div>
      </section>

          
    </div>
  );
}