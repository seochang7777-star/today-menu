import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as apiServices from '../api/services'

const footerClass        = 'mt-7 border-t border-[var(--border-color)] bg-[linear-gradient(180deg,#FFFDF7,#FFF8EF)] pb-[26px] pt-[42px]'
const logoTextClass      = 'mb-[18px] block text-[1.18rem] font-black text-[var(--text-primary)]'
const footerTextClass    = 'text-[0.9rem] font-bold text-[var(--text-secondary)]'
const footerHeadingClass = 'mb-[14px] font-black text-[var(--text-primary)]'
const footerLinkClass    = 'mb-2 block text-[0.9rem] font-bold text-[var(--text-secondary)] hover:text-[var(--color-primary)]'
const socialRowClass     = 'mt-6 flex gap-4 text-[1.35rem] font-black text-[#8C8C8C]'
const storeButtonClass   = 'mb-[10px] block min-h-[42px] w-[150px] rounded-[8px] border border-[#DED6CF] bg-white text-[0.9rem] font-bold text-[var(--text-secondary)]'
const copyrightClass     = 'mt-[34px] text-center text-[0.82rem] text-[#9C928E]'

export default function Footer() {
  const [isFamilyOpen, setIsFamilyOpen] = useState(false)
  const [familySites,  setFamilySites]  = useState([])

  useEffect(() => {
    const useDefault = () => setFamilySites([
      { id: 1, name: '구글',  url: 'https://www.google.com' },
      { id: 2, name: '네이버', url: 'https://www.naver.com' },
    ])
    if (typeof apiServices.getFamilySites === 'function') {
      apiServices.getFamilySites()
        .then((data) => (data?.length > 0 ? setFamilySites(data) : useDefault()))
        .catch(useDefault)
    } else {
      useDefault()
    }
  }, [])

  return (
    <footer className={footerClass}>

      {/* ── 메인 그리드: 브랜드 / 서비스(3+2) / 앱다운로드(오른쪽 끝) ── */}
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr 1fr auto',
        gap: 48,
        alignItems: 'start',
      }}>

        {/* 1. 브랜드 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <img src="/img/icon/logo.png" alt="오늘 뭐먹지?" style={{ height: 40, width: 40, objectFit: 'contain' }}
              onError={(e) => { e.target.style.display='none' }} />
            <strong style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-primary)' }}>오늘 뭐먹지?</strong>
          </div>
          <p className={footerTextClass}>AI가 추천하는<br />오늘의 베스트 맛집</p>
          <div className={socialRowClass}>
            <span>◎</span><span>f</span><span>t</span>
          </div>

          {/* FAMILY SITE 아코디언 */}
          <div style={{ marginTop: 24, position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => setIsFamilyOpen(!isFamilyOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'white', cursor: 'pointer',
                fontSize: '.82rem', fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <span>FAMILY SITE</span>
              <span style={{ fontSize: 10 }}>{isFamilyOpen ? '∨' : '∧'}</span>
            </button>
            {isFamilyOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
                background: 'white', border: '1px solid var(--border-color)',
                borderRadius: 6, minWidth: 140, boxShadow: '0 2px 8px rgba(0,0,0,.1)', zIndex: 10,
              }}>
                {familySites.map((site) => (
                  <a key={site.id} href={site.url} target="_blank" rel="noreferrer"
                    style={{
                      display: 'block', padding: '8px 14px',
                      fontSize: '.82rem', color: 'var(--text-secondary)', textDecoration: 'none',
                      borderBottom: '1px solid var(--bg-surface)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    {site.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. 서비스 왼쪽 — 소개 / 이용안내 / 개인정보처리방침 */}
        <div style={{ margin: '0 auto' }}>
          <h4 className={footerHeadingClass}>서비스</h4>
          <Link className={footerLinkClass} to="/company">
            소개
          </Link>
          {/* 이용안내 → /terms 이동, defaultTab='terms' → 이용약관만 표시 */}
          <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'terms' }}>
            이용안내
          </Link>
          {/* 개인정보처리방침 → /terms 이동, defaultTab='privacy' → 개인정보만 표시 */}
          <Link className={footerLinkClass} to="/terms" state={{ defaultTab: 'privacy' }}>
            개인정보처리방침
          </Link>
        </div>

        {/* 3. 서비스 오른쪽 — 공지사항 / 고객센터 */}
        <div style={{ paddingTop: 'calc(14px + 1.18rem * 1.5)', margin: '0 auto' }}>
          {/* 제목 없이 서비스 왼쪽과 높이 맞추기 */}
          <Link className={footerLinkClass} to="/notice">
            공지사항
          </Link>
          <Link className={footerLinkClass} to="/support">
            고객센터
          </Link>
        </div>

        {/* 4. 앱 다운로드 — 오른쪽 끝 정렬 */}
        <div style={{ textAlign: 'right' }}>
          <h4 className={footerHeadingClass}>앱 다운로드</h4>
          <button className={storeButtonClass}>▶ Google Play</button>
        </div>

      </div>

      <p className={copyrightClass}>© 2026 오늘 뭐먹지? All rights reserved.</p>
    </footer>
  )
}
