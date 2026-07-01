import React, { useState } from 'react';

const ChatModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([{ sender: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. 사용자 메시지 추가
    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. 백엔드 API 호출
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          message: input,
          mode: 'recommend',
          history: messages.slice(-5) 
        })
      });

      const data = await response.json();
      
      // 3. 봇 응답 추가
      if (data.reply) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        throw new Error(data.error || "응답 없음");
      }
    } catch (error) {
      console.error("챗봇 통신 오류:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "앗, 통신에 문제가 생겼어요. 다시 시도해 주세요!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose} 
    >
      {/* 모달 본체: e.stopPropagation()으로 배경 클릭 이벤트가 전파되는 것을 막음 */}
      <div 
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* 헤더 */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg">🤖 AI 챗봇</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">닫기</button>
        </div>
        
        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex flex-col gap-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-white text-gray-800 self-start'}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="text-gray-400 text-sm italic p-2">봇이 생각 중입니다...</div>}
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t flex gap-2">
          <input 
            className="flex-1 px-4 py-2 border rounded-full outline-none" 
            placeholder="메시지 입력..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading}
            className={`px-4 bg-blue-600 text-white rounded-full ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;