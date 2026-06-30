import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as apiServices from '../api/services' 

export default function Footer() {
  const [isFamilyOpen, setIsFamilyOpen] = useState(false)
  const [familySites, setFamilySites] = useState([])

  useEffect(() => {
    if (apiServices && typeof apiServices.getFamilySites === 'function') {
      apiServices.getFamilySites()
        .then((data) => {
          if (data && data.length > 0) {
            setFamilySites(data)
          } else {
            useDefaultSites()
          }
        })
        .catch(() => useDefaultSites())
    } else {
      useDefaultSites()
    }
  }, [])

  const useDefaultSites = () => {
    setFamilySites([
      { id: 1, name: '구글', url: 'https://www.google.com' },
      { id: 2, name: '네이버', url: 'https://www.naver.com' },
    ])
  }

  return (
    <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <strong className="footer-logo-text">오늘 뭐먹지? ⏰</strong>
            <p>AI가 추천하는<br />오늘의 베스트 맛집</p>
            <div className="social-row">
              <span>◎</span><span>f</span><span>t</span>
            </div>
          </div>
          <div>
            <h4>서비스</h4>
            <Link to="/menu">소개</Link>
            <Link to="/menu">이용 안내</Link>
            <Link to="/party">공지사항</Link>
            <Link to="/mypage">고객센터</Link>
          </div>
          <div>
            <h4>파트너</h4>
            <Link to="/menu">맛집 등록</Link>
            <Link to="/party">비즈니스 문의</Link>
          </div>
          <div>
            <h4>회사</h4>
            <a href="#">회사 소개</a>
            <a href="#">채용 정보</a>
            <a href="#">개인정보 처리방침</a>
            <a href="#">이용약관</a>
          </div>
          <div>
            <h4>앱 다운로드</h4>
            <button className="store-btn"> App Store</button>
            <button className="store-btn">▶ Google Play</button>
          </div>
        </div>
        <p className="copyright">© 2024 오늘 뭐먹지? All rights reserved.</p>
      </footer>
    
  )
}

    // <footer className="site-footer">
    //   <div className="container footer-inner">
        
    //     {/* ── [1구역] 왼쪽 영역: 로고 및 회사 상세정보 (메인창 좌측 정렬) ── */}
    //     <div className="footer-left-zone">
          
    //       {/* 로고 (이미지 왼쪽 끝 고정) */}
    //       <div className="footer-logo">
    //         <img src="/favicon.svg" alt="로고" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
    //         <span className="footer-logo-text">오늘의 메뉴</span>
    //       </div>

    //       {/* 회사 상세 정보 박스 */}
    //       <div style={{ flexGrow: 1, flexShrink: 0 }}>
    //         {/* 상단 메뉴 (글자 간격 45px 싱크) */}
    //         {/* react-router-dom 에서 주소 설정해야 작동가능 */}
    //         <div className="footer-menu">
    //           <Link to="/company">회사소개</Link><span className="divider">|</span>
    //           <Link to="/terms">이용약관</Link><span className="divider">|</span>
    //           <Link to="/privacy" style={{ fontWeight: 'bold', color: '#1f2937' }}>개인정보처리방침</Link><span className="divider">|</span>
    //           <Link to="/no-email">이메일무단수집거부</Link><span className="divider">|</span>
    //           <Link to="/legal">법적고지</Link><span className="divider">|</span>
    //           <Link to="/support">고객센터</Link>
    //         </div>

    //         {/* 하단 상세정보 (2pt 작게 및 연한 회색톤) */}
    //         <div className="footer-info">
    //           <div className="info-row">
    //             <span>법인명 (상호) : 주식회사 아워홈(아워홈빌딩)</span>
    //             <span className="divider">|</span>
    //             <span>사업자등록번호 : 211-85-40900</span>
    //           </div>
    //           <div className="info-row">
    //             <span>대표자 : 김태원</span>
    //             <span className="divider">|</span>
    //             <span>대표전화 : 1544-9943</span>
    //             <span className="divider">|</span>
    //             <span>서울특별시 강남구 역삼로 115 아워홈빌딩</span>
    //           </div>
              
    //           {/* 대표자 줄 밑에 완벽한 마진(16px)으로 정렬된 Copyright */}
    //           <div className="footer-copyright">
    //             Copyright 2026. (주)아워홈 INC.<br />All rights reserved.
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     {/* ── [2구역] 오른쪽 끝 영역: 패밀리 사이트 아코디언 (아래로 열림) ── */}
    //     <div style={{ flexShrink: 0 }}>
    //       <div className="footer-accordion-wrap">
    //         <button 
    //           type="button" 
    //           className="footer-accordion-btn"
    //           onClick={() => setIsFamilyOpen(!isFamilyOpen)}
    //         >
    //           <span style={{ fontWeight: 500 }}>FAMILY SITE</span>
    //           <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>
    //             {isFamilyOpen ? '∨' : '∧'}
    //           </span>
    //         </button>
    //         {/* 아래를 향해 열리는 드롭다운 박스 */}
    //         {isFamilyOpen && (
    //           <div className="footer-accordion-dropdown">
    //             {familySites.map((site) => (
    //               <a 
    //                 key={site.id} 
    //                 href={site.url} 
    //                 target="_blank" 
    //                 rel="noreferrer"
    //               >
    //                 {site.name}
    //               </a>
    //             ))}
    //           </div>
    //         )}
    //       </div>
    //     </div>
    //   </div>
    // </footer>
//   )
// }