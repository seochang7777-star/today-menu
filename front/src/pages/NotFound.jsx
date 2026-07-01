import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: 'var(--bg-background)'
    }}>
      
      {/* 🌟 🚧 이모지 대신 public 폴더에 있는 시그니처 로고 이미지를 삽입했습니다 */}
      <img 
        src="/img/icon/not_found.png" 
        alt="not_found" 
        style={{
          width: '420px',                  // 로고 가로 크기 (원하는 크기로 변경 가능)
          height: 'auto',                  // 가로 세로 비율 유지
          animation: 'bounce 2s infinite'  // 기존에 있던 통통 튀는 애니메이션 그대로 연동!
        }} 
      />

      <p style={{
        fontSize: '1.1rem',
        color: '#6b7280',
        maxWidth: '450px',
        marginBottom: '30px',
        lineHeight: '1.6'
      }}>
        죄송합니다. 현재 찾을 수 없는 페이지를 요청 하셨습니다.
      </p>

      {/* 버튼 구역 (이전/홈) */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px',
            borderRadius: '24px', 
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
        >
          이전 페이지로
        </button>

        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            borderRadius: '24px',
            border: 'none',
            backgroundColor: '#F46C6F', // 프로젝트 포인트 컬러
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e05659'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#F46C6F'}
        >
          홈으로 가기
        </button>
      </div>

      {/* 간단한 바운스 애니메이션 주입 */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}