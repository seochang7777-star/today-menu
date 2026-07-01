import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { privacyContent } from "../data/privacyContent";
import { termsContent } from "../data/termsContent";

export default function Terms() {
  const { state } = useLocation();

  // Footer에서 넘어온 defaultTab으로 초기 탭 결정
  // 이용안내 → 'terms', 개인정보처리방침 → 'privacy', 기본값 'terms'
  const [activeTab, setActiveTab] = useState(state?.defaultTab ?? 'terms');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // 탭 바뀔 때도 최상단으로
  const handleTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const content = activeTab === 'privacy' ? privacyContent : termsContent;
  const subTitle = activeTab === 'privacy' ? '개인정보 처리방침' : 'today-menu 서비스 이용약관';

  return (
    <div className="flex justify-center flex-wrap w-full min-h-screen bg-white font-sans antialiased text-gray-900 pb-40">

      {/* 타이틀 */}
      <div className="w-full py-20 text-center">
        <h1 className="text-4xl font-black tracking-tight text-black">
          약관 안내
        </h1>
      </div>

      {/* 탭 */}
      <div className="w-full max-w-4xl mx-auto px-8">
        <div className="flex justify-center gap-0 border-b border-gray-200 mb-16">
          <button
            onClick={() => handleTab('terms')}
            className={`px-10 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              activeTab === 'terms'
                ? 'border-[var(--color-primary)] text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            이용약관
          </button>
          <button
            onClick={() => handleTab('privacy')}
            className={`px-10 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
              activeTab === 'privacy'
                ? 'border-[var(--color-primary)] text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            개인정보처리방침
          </button>
        </div>
      </div>

      {/* 본문 */}
      <main className="max-w-4xl mx-auto px-8 text-center">

        <div className="text-center mb-28">
          <h2 className="text-2xl font-black text-black tracking-tight">
            {subTitle}
          </h2>
        </div>

        <div className="w-full space-y-24 text-center">
          {content.map((item, index) => (
            <section key={index} className="w-full text-center">
              <h3 className="text-xl font-extrabold text-black mb-6 tracking-tight">
                {item.title}
              </h3>
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

