import { Link } from 'react-router-dom'

const footerClass = 'mt-7 border-t border-[var(--border-color)] bg-[linear-gradient(180deg,#FFFDF7,#FFF8EF)] pt-6 pb-5 lg:pt-10 lg:pb-7'
const footerGridClass = 'container grid grid-cols-1 lg:gap-8 text-center lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:text-left'
const logoTextClass = 'mb-[18px] block text-[1.18rem] font-black text-[var(--text-primary)]'
const footerTextClass = 'text-[0.9rem] font-bold text-[var(--text-secondary)]'
const footerHeadingClass = ' mb-[12px] lg:mb-[14px] font-black text-[var(--text-primary)]'
const footerLinkClass = 'mb-2 block text-[0.9rem] font-bold text-[var(--text-secondary)]'
const socialRowClass = 'mt-6 flex gap-4 text-[1.35rem] font-black text-[#8C8C8C]'
const storeButtonClass = 'mb-[10px] block min-h-[42px] w-[150px] rounded-[8px] border border-[#DED6CF] bg-white text-[0.9rem] font-bold text-[var(--text-secondary)]'
const copyrightClass = 'mt-[34px] text-center text-[0.82rem] text-[#9C928E]'

export default function Footer() {
  return (
    <footer className={footerClass}>
      <div className={footerGridClass}>

        {/* 브랜드 */}
        <div className="col-span-2 lg:col-span-1">
          <div className="flex flex-col items-center justify-center gap-3 mb-2 lg:items-start  lg:mb-4">

            <Link to="/">
              <img
                src="/img/icon/logo_title.png"
                alt="오늘 뭐먹지?"
                className="w-40 -translate-y-2 object-contain cursor-pointer"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </Link>

            <p className={footerTextClass}>
              AI가 추천하는
              <br />
              <span className="ml-1">
                오늘의 베스트 맛집
              </span>
            </p>

          </div>

          <div className={socialRowClass}>
          </div>
        </div>


        {/* 서비스 */}
        <div className="col-span-2 lg:col-span-1 flex justify-center lg:block gap-4 lg:gap-0">

          <h4 className={`${footerHeadingClass} hidden lg:block`}>
            서비스
          </h4>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-0 lg:block">

            <Link className={footerLinkClass} to="/company">
              소개
            </Link>

            <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'terms' }}>
              이용안내
            </Link>

            <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'privacy' }}>
              개인정보처리방침
            </Link>

          </div>

        </div>


        {/* 고객지원 */}
        <div className="col-span-2 lg:col-span-1 flex justify-center lg:block">

          <h4 className={`${footerHeadingClass} hidden lg:block`}>
            고객지원
          </h4>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-0 lg:block">

            <Link className={footerLinkClass} to="/notice">
              공지사항
            </Link>

            <Link className={footerLinkClass} to="/support">
              고객센터
            </Link>

          </div>

        </div>


        {/* 앱 다운로드 */}
        <div className="hidden lg:flex col-span-1 flex-col items-end justify-self-end">
          <h4 className="mb-[14px] font-black text-[var(--text-primary)]">
            앱 다운로드
          </h4>

          <button className={storeButtonClass}>
            ▶ Google Play
          </button>
        </div>

      </div>

      <p className={copyrightClass}>
        © 2026 오늘 뭐먹지? All rights reserved.
      </p>
    </footer>
  )
}
