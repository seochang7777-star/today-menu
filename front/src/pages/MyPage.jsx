import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom' // ➕ 페이지 이동을 위해 useNavigate 추가
import { getMyPage, toggleLike, logout } from '../api/services' // ➕ 탈퇴 처리를 위해 logout 추가
import { useAuth } from '../App'

export default function MyPage() {
  const navigate = useNavigate() // ➕ 이동용 훅 선언
  const { user: authUser } = useAuth()
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('liked')
  const gauge2Ref = useRef(null)

  // 💡 에러 나던 부분 완벽 교정: getMyPage() 직접 호출
  useEffect(() => { 
    getMyPage()
      .then(setData)
      .catch((err) => console.error("마이페이지 데이터 조회 실패:", err)) 
  }, [])

  // ➕ 팀장님 지시사항: 회원 탈퇴 기능 처리 함수
  const handleWithdraw = async () => {
    if (window.confirm("정말로 회원 탈퇴를 하시겠습니까? 모든 정보가 삭제됩니다.")) {
      try {
        await logout() // 1. 브라우저의 인증 토큰 및 세션 삭제
        alert("회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.")
        navigate('/')  // 2. 메인 페이지로 화면 튕기기
      } catch (err) {
        alert("탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.")
      }
    }
  }

  // 데이터 로딩 중 처리
  if (!data) {
    return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>프로필 로딩 중...</div>
  }

  return (
    <>
      {/* 상단 프로필 요약 카드 구역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>👋 안녕하세요, {data.user?.nickname || '사용자'}님!</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{data.user?.email}</p>
          {data.user?.address && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4, marginBotton: 0 }}>
              🏠 등록된 주소: <strong>{data.user.address}</strong>
            </p>
          )}
        </div>
        <Link to="/mypage/edit" className="btn btn-outline-secondary">⚙️ 프로필 수정</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 32 }}>
        {/* 매너 스코어 & 취향 요약 */}
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 24 }}>
          <h4 style={{ marginBottom: 16 }}>🌟 매너 온도</h4>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: 24 }}>{data.user?.manner_score || 36.5} °C</h3>
          
          <h4 style={{ marginBottom: 12 }}>🚫 알러지 및 제외</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            {data.user?.allergies || '등록된 알러지 정보가 없습니다.'}
          </p>
        </div>

        {/* 탭 메뉴 구역 (내가 만든 파티 / 찜한 로그 등) */}
        <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-xl)', padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', marginBottom: 16, paddingBottom: 8 }}>
            <button 
              onClick={() => setActiveTab('liked')} 
              style={{ background: 'none', border: 'none', fontWeight: activeTab === 'liked' ? 700 : 400, color: activeTab === 'liked' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              ❤️ 찜한 맛집 목록
            </button>
            <button 
              onClick={() => setActiveTab('parties')} 
              style={{ background: 'none', border: 'none', fontWeight: activeTab === 'parties' ? 700 : 400, color: activeTab === 'parties' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              🎉 참여 중인 파티
            </button>
          </div>

          {/* 탭 콘텐츠 렌더링 */}
          {activeTab === 'liked' && (
            <div>
              {data.rec_logs?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>찜한 추천 기록이 없습니다.</p>
              ) : (
                data.rec_logs?.map(log => (
                  <div key={log.log_id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color-light)' }}>
                    <strong>{log.restaurant_name}</strong> - <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{log.restaurant_address}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'parties' && (
            <div>
              {data.my_parties?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>참여 중인 파티가 없습니다.</p>
              ) : (
                data.my_parties?.map(party => (
                  <div key={party.party_id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color-light)' }}>
                    <Link to={`/party/${party.party_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      ⚡ <strong>{party.title}</strong> ({party.current_people}/{party.max_people}명)
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ➕ 팀장님 지시사항: 화면 맨 밑 우측에 눈에 띄는 탈퇴 레이아웃 배치 */}
      <div style={{ marginTop: 56, borderTop: '1px solid var(--border-color)', paddingTop: 24, textAlign: 'right' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 8 }}>
          더 이상 오늘뭐먹지 서비스를 이용하고 싶지 않으신가요?
        </p>
        <button 
          onClick={handleWithdraw} 
          className="btn btn-sm btn-danger" 
          style={{ background: '#E53E3E', borderColor: '#E53E3E', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🚨 회원 탈퇴하기
        </button>
      </div>
    </>
  )
}