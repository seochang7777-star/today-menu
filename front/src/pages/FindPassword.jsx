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
    <div className="flex justify-center items-center min-h-[calc(100vh-120px)] bg-gray-50 px-5 py-5">
      <div className="w-full max-w-[440px] bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-9 text-center">
        
        {/* 상단 타이틀 */}
        <div className="text-4xl mb-3">🔄</div>
        <h1 className="text-xl font-extrabold mb-2 text-gray-900">
          비밀번호 재설정
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-7">
          가입된 이메일과 닉네임을 정확히 입력하시면<br />새로운 비밀번호로 즉시 변경할 수 있습니다.
        </p>

        {/* 폼 구역 */}
        <form onSubmit={handleSubmit} className="text-left">
          
          {/* 1. 이메일 */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-xs font-bold mb-1.5 text-gray-700">
              이메일 주소
            </label>
            <input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:border-blue-500 ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          {/* 2. 닉네임 */}
          <div className="mb-4">
            <label htmlFor="nickname" className="block text-xs font-bold mb-1.5 text-gray-700">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              placeholder="가입하신 닉네임 입력"
              value={formData.nickname}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:border-blue-500 ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          <hr className="border-none border-t border-dashed border-gray-200 my-5" />

          {/* 3. 새 비밀번호 */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-xs font-bold mb-1.5 text-gray-700">
              새 비밀번호
            </label>
            <input
              id="newPassword"
              type="password"
              placeholder="새로운 비밀번호 입력"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:border-blue-500 ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          {/* 4. 새 비밀번호 확인 */}
          <div className="mb-5">
            <label htmlFor="newPassword2" className="block text-xs font-bold mb-1.5 text-gray-700">
              새 비밀번호 확인
            </label>
            <input
              id="newPassword2"
              type="password"
              placeholder="새로운 비밀번호 재입력"
              value={formData.newPassword2}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:border-blue-500 ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />
          </div>

          {/* 알림 메시지 공간 */}
          {message.text && (
            <div className={`p-3 rounded-lg text-xs font-semibold mb-5Sub leading-normal border ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              {message.type === 'success' ? '✅ ' : '❌ '} {message.text}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-lg text-sm font-bold text-white transition-all ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 active:scale-[0.99]'
            }`}
          >
            {loading ? '변경 처리 중...' : '비밀번호 변경 및 재설정'}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="flex justify-center gap-4 mt-6 text-xs border-t border-gray-100 pt-4">
          <Link to="/login" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
            로그인으로 이동
          </Link>
          <span className="text-gray-200">|</span>
          <Link to="/register" className="text-cyan-600 no-underline font-bold hover:text-cyan-700 transition-colors">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}