import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { termsContent } from "../data/termsContent";
import { privacyContent } from "../data/privacyContent";

export default function Terms() {
  const location = useLocation();
  
  const initialTab = location.state?.defaultTab || "terms";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (location.state?.defaultTab) {
      setTab(location.state.defaultTab);
    }
  }, [location]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth" // 💡 스크롤이 부드럽게 위로 올라가는 효과 (원치 않으시면 제거 가능)
    });
  }, [tab]);

  const data = tab === "terms" ? termsContent : privacyContent;

  return (
    // 전체 배경 흰색, 글자 검은색 모노톤 유지
    <div className="flex justify-center flex-wrap w-full min-h-screen bg-white font-sans antialiased text-gray-900 pb-40">
      
      {/* 1. 최상단 타이틀: */}
      <div className="w-full py-20 text-center">
        <h1 className="text-4xl font-black tracking-tight text-black">
          약관 안내
        </h1>
      </div>

      {/* 2. 탭 내비게이션 영역 */}
      <div className="w-full border-b border-gray-200 sticky top-0 bg-white z-10 ">
        {/* py-6을 주어 기준선 안의 글자(이용약관) 자체도 선 위아래로 여백을 가집니다 */}
        <div className="w-full flex justify-center gap-20 py-6">
          
          {/* 이용약관 탭 */}
          <button
            onClick={() => setTab("terms")}
            className={`text-lg font-bold transition-all relative pb-2
              ${
                tab === "terms"
                  ? "text-black opacity-100"
                  : "text-gray-400 opacity-50 hover:opacity-80"
              }
            `}
          >
            이용약관
            {/* 활성화 시 아래에 들어오는 검은색 기준선 */}
            {tab === "terms" && (
              <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black" />
            )}
          </button>

          {/* 개인정보처리방침 탭 */}
          <button
            onClick={() => setTab("privacy")}
            className={`text-lg font-bold transition-all relative pb-2
              ${
                tab === "privacy"
                  ? "text-black opacity-100"
                  : "text-gray-450 opacity-50 hover:opacity-80"
              }
            `}
          >
            개인정보처리방침
            {tab === "privacy" && (
              <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black" />
            )}
          </button>

        </div>
      </div>

      {/* 3. 본문 영역: mx-auto와 max-w-4xl 조합으로 전체 화면 정중앙에 완벽하게 안착 */}
      <main className="max-w-4xl mx-auto px-8 mt-32 text-center">
        
        {/* 본문 내부 서브 타이틀 */}
        <div className="text-center mb-28">
          <h2 className="text-2xl font-black text-black tracking-tight">
            {tab === "terms" ? "today-menu 서비스 이용약관" : "개인정보 처리방침"}
          </h2>
        </div>

        {/* 4. 약관 텍스트 내용: 정중앙 정렬 기둥 */}
        <div className="w-full space-y-24 text-center">
          {data.map((item, index) => (
            <section key={index} className="w-full text-center">
              
              {/* 조항 제목 */}
              <h3 className="text-xl font-extrabold text-black mb-6 tracking-tight">
                {item.title}
              </h3>
              
              {/* 본문 내용: 양옆 마진 오토(mx-auto)로 본문 문자열 전체를 한가운데로 밀어 넣음 */}
              <p className="text-[16px] text-gray-700 leading-9 whitespace-pre-line font-normal text-center break-keep max-w-3xl mx-auto">
                {item.content}
              </p>
              
            </section>
          ))}
        </div>

      </main>

    </div>
  );
}