import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { termsContent } from "../data/termsContent";
import { privacyContent } from "../data/privacyContent";

export default function Terms() {
  const location = useLocation();


  // Footer에서 state.defaultTab 으로 진입 → 해당 탭만 표시
  // /terms 직접 접근 → 기본 'terms' (탭 선택 가능)
  const fromFooter = !!location.state?.defaultTab
  const initialTab = location.state?.defaultTab || "terms"
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    if (location.state?.defaultTab) {
      setTab(location.state.defaultTab)
    }
  }, [location])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [tab])

  const data     = tab === "terms" ? termsContent : privacyContent
  const subTitle = tab === "terms" ? "today-menu 서비스 이용약관" : "개인정보 처리방침"

  return (
    <div className="flex justify-center flex-wrap w-full min-h-screen bg-white font-sans antialiased text-gray-900 pb-40">

      {/* 탭 — Footer에서 직접 진입한 경우 숨김 */}
      {!fromFooter && (
        <div className="w-full border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="w-full flex justify-center gap-20 py-6">
            <button
              onClick={() => setTab("terms")}
              className={`text-lg font-bold transition-all relative pb-2 ${
                tab === "terms" ? "text-black opacity-100" : "text-gray-400 opacity-50 hover:opacity-80"
              }`}
            >
              이용약관
              {tab === "terms" && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black" />}
            </button>
            <button
              onClick={() => setTab("privacy")}
              className={`text-lg font-bold transition-all relative pb-2 ${
                tab === "privacy" ? "text-black opacity-100" : "text-gray-400 opacity-50 hover:opacity-80"
              }`}
            >
              개인정보처리방침
              {tab === "privacy" && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black" />}
            </button>
          </div>
        </div>
      )}

      {/* 본문 */}
      <main className="max-w-4xl mx-auto px-8 mt-32 text-center">
        <div className="text-center mb-28">
          <h2 className="text-2xl font-black text-black tracking-tight">{subTitle}</h2>
        </div>
        <div className="w-full space-y-24 text-center">
          {data.map((item, index) => (
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

  )
}
