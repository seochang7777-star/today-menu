import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App'; 

const BANNERS = [
  { img: '/img/banner/banner5.png', type: 'chatbot' },
  { img: '/img/banner/banner2.png', link: '/party' },
  { img: '/img/banner/banner3.png', link: '/game' },
  { img: '/img/banner/banner4.png', link: '/menu' },
];

export default function RandomBanner() {
  const [banner, setBanner] = useState(null);
  const { user } = useAuth(); 
  const navigate = useNavigate(); 

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BANNERS.length);
    setBanner(BANNERS[randomIndex]);
  }, []);

  if (!banner) return null;

  const handleBannerClick = () => {
    if (banner.type === 'chatbot') {
      if (!user) {
        alert("로그인 후 이용 가능합니다.");
        navigate('/login');
      } else {
        console.log("챗봇 실행");
        window.dispatchEvent(new CustomEvent('open-chatbot')); 
      }
    } else {
      navigate(banner.link);
    }
  };

  return (
    <div 
      onClick={handleBannerClick} 
      className="block h-full w-full overflow-hidden rounded-2xl bg-white shadow-lg transition-transform hover:scale-[1.01] cursor-pointer"
    >
      <img
        src={banner.img}
        alt="랜덤 배너"
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}
