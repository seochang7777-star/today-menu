import { Link } from 'react-router-dom'

const footerClass = 'mt-7 border-t border-[var(--border-color)] bg-[linear-gradient(180deg,#FFFDF7,#FFF8EF)] pb-[26px] pt-[42px]'
const footerGridClass = 'container grid grid-cols-[1.6fr_1fr_1fr] gap-[54px] max-lg:grid-cols-2 max-[540px]:grid-cols-2'
const logoTextClass = 'mb-[18px] block text-[1.18rem] font-black text-[var(--text-primary)]'
const footerTextClass = 'text-[0.9rem] font-bold text-[var(--text-secondary)]'
const footerHeadingClass = 'mb-[14px] font-black text-[var(--text-primary)]'
const footerLinkClass = 'mb-2 block text-[0.9rem] font-bold text-[var(--text-secondary)]'
const socialRowClass = 'mt-6 flex gap-4 text-[1.35rem] font-black text-[#8C8C8C]'
const storeButtonClass = 'mb-[10px] block min-h-[42px] w-[150px] rounded-[8px] border border-[#DED6CF] bg-white text-[0.9rem] font-bold text-[var(--text-secondary)]'
const copyrightClass = 'mt-[34px] text-center text-[0.82rem] text-[#9C928E]'

export default function Footer() {
  return (
    <footer className={footerClass}>
      <div className={footerGridClass}>

        {/* 브랜드 */}
        <div>
          <strong className={logoTextClass}>오늘 뭐먹지? ⏰</strong>
          <p className={footerTextClass}>AI가 추천하는<br />오늘의 베스트 맛집</p>
          <div className={socialRowClass}>
            <span>◎</span><span>f</span><span>t</span>
          </div>
        </div>

        {/* 서비스 */}
        <div>
          <h4 className={footerHeadingClass}>서비스</h4>
          {/* 소개 */}
          <Link className={footerLinkClass} to="/company">소개</Link>
          {/* 이용안내 = 이용약관 탭 */}
          <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'terms' }}>이용안내</Link>
          {/* 공지사항 (비즈니스 문의 포함) */}
          <Link className={footerLinkClass} to="/notice">공지사항</Link>
          {/* 고객센터 */}
          <Link className={footerLinkClass} to="/support">고객센터</Link>
          {/* 개인정보처리방침 탭만 */}
          <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'privacy' }}>개인정보처리방침</Link>
        </div>

        {/* 앱 다운로드 */}
        <div>
          <h4 className={footerHeadingClass}>앱 다운로드</h4>
          <button className={storeButtonClass}> App Store</button>
          <button className={storeButtonClass}>▶ Google Play</button>
        </div>

      </div>

      <p className={copyrightClass}>© 2024 오늘 뭐먹지? All rights reserved.</p>
    </footer>
  )
}
