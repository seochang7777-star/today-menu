import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // 프로젝트의 axios 인스턴스 경로에 맞게 꼭 수정하세요!

export default function FindPassword() {
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    newPassword: '',
    newPassword2: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, nickname, newPassword, newPassword2 } = formData;

    if (!email.trim() || !nickname.trim() || !newPassword || !newPassword2) {
      setMessage({ type: 'error', text: '모든 항목을 입력해주세요.' });
      return;
    }
    if (newPassword !== newPassword2) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await axiosInstance.post('/api/auth/reset-password-direct', {
        email: email.trim(),
        nickname: nickname.trim(),
        new_password: newPassword,
        new_password2: newPassword2
      });
      
      setMessage({ 
        type: 'success', 
        text: '비밀번호가 성공적으로 변경되었습니다! 3초 후 로그인 페이지로 이동합니다.' 
      });

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      const errorMsg = err.response?.data?.message || '입력하신 정보가 일치하는 회원이 없거나 오류가 발생했습니다.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-6">
      <div className="bg-[var(--bg-white)] rounded-[var(--border-radius-xl)] shadow-[var(--shadow-lg)] w-full max-w-[420px] p-10">

        {/* 뒤로가기 - FindId와 동일한 형태 */}
        <button
          onClick={() => navigate('/login')}
          className="text-[.85rem] text-[var(--text-muted)] font-bold flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors bg-transparent border-0 mb-5"
        >
          ← 로그인으로
        </button>

        {/* 로고 */}
        <div className="text-center mb-[28px]">
          <div className="site-logo relative justify-center min-h-[40px] pl-3">
            <img
              src="/img/icon/logo.png"
              alt="오늘 뭐먹지 로고"
              className="absolute right-full h-7 w-auto object-contain"
            />
            <span>오늘 뭐먹지?</span>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-[1.4rem] font-extrabold mb-[6px] text-center text-gray-950">
          비밀번호 재설정
        </h2>

        <p className="text-[0.88rem] text-gray-400 text-center mb-[28px]">
          가입 당시 입력한 정보를 확인한 뒤<br />
          새로운 비밀번호로 변경합니다.
        </p>

        <form onSubmit={handleSubmit}>

          {/* 이메일 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">✉️</span>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="이메일"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* 닉네임 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">👤</span>
            <input
              id="nickname"
              type="text"
              className="form-control"
              placeholder="닉네임"
              value={formData.nickname}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <hr className="border-0 border-t border-dashed border-gray-200 my-6" />

          {/* 새 비밀번호 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🔒</span>
            <input
              id="newPassword"
              type="password"
              className="form-control"
              placeholder="새 비밀번호"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* 새 비밀번호 확인 */}
          <div className="form-group form-icon-wrap">
            <span className="form-icon">🔒</span>
            <input
              id="newPassword2"
              type="password"
              className="form-control"
              placeholder="새 비밀번호 확인"
              value={formData.newPassword2}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* 메시지 영역 */}
          {message.text && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              {message.type === 'success' ? '✅ ' : '❌ '}
              {message.text}
            </div>
          )}

          {/* 변경 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 text-lg font-semibold rounded-[12px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>

        </form>

        {/* 하단 네비게이션 링크 */}
        <p className="text-center mt-[20px] text-[0.88rem] text-gray-400">
          <button
            type="button"
            onClick={() => navigate('/findid')}
            className="text-[var(--color-primary)] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            이메일 찾기
          </button>
          {" · "}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[var(--color-primary)] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            로그인
          </button>
        </p>

      </div>
    </div>
  )
}