let currentRole = "GUEST";
let newlyRegisteredUser = null;
let selectedMenus = [];

const usersDB = [
  {
    user_id: 1,
    email: "teacher@math.com",
    nickname: "수학교사",
    preferences: '["삼겹살","마라탕"]',
    allergies: "오이, 갑각류",
    role: "USER"
  }
];

let recommendChatHistory = [
  { role: 'assistant', content: '안녕하세요! 추천해드릴게요!' }
];

let map;

// ✅ 챗봇
async function sendChatMessage() {
  const input = document.getElementById('recommendChatInput');
  const text = input.value.trim();
  if (!text) return;

  recommendChatHistory.push({ role: 'user', content: text });
  input.value = "";
  renderChat();

  const user = newlyRegisteredUser || usersDB[0];

  let prefs = [];
  try {
    prefs = JSON.parse(user.preferences || "[]");
  } catch {}

  const res = await fetch("http://127.0.0.1:8000/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: text,
      preferences: prefs,
      allergies: user.allergies || ""
    })
  });

  const data = await res.json();

  recommendChatHistory.push({
    role: 'assistant',
    content: data.comment
  });

  renderChat();
}

// ✅ 렌더
function renderChat() {
  const box = document.getElementById('recommendChatMessages');

  box.innerHTML = recommendChatHistory.map(msg => `
    <div class="${msg.role === 'user' ? 'text-right' : ''}">
      <span class="bg-gray-200 p-2 rounded inline-block">
        ${msg.content}
      </span>
    </div>
  `).join('');
}

// ✅ 챗 열기
function toggleChat() {
  document.getElementById('chatBox').classList.toggle('hidden');
}

// ✅ 역할 변경
function switchRole(role) {
  currentRole = role;

  const btn = document.getElementById('navAuthBtn');

  if (role === "USER") {
    const user = newlyRegisteredUser || usersDB[0];
    btn.innerText = user.nickname + "님";
  } else {
    btn.innerText = "로그인";
  }
}

// ✅ 지도 초기화
function initMap() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 4
  };

  map = new kakao.maps.Map(container, options);
}

// ✅ 현재 위치 가져오기
function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert("위치 기능 지원 안됨");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log("현재 위치:", lat, lng);

      moveMap(lat, lng);
      loadNearbyRestaurants(lat, lng);
    },
    (error) => {
      alert("위치 허용 필요합니다!");
      console.error(error);
    }
  );
}

// ✅ 지도 이동
function moveMap(lat, lng) {
  const moveLatLon = new kakao.maps.LatLng(lat, lng);

  map.setCenter(moveLatLon);

  new kakao.maps.Marker({
    map: map,
    position: moveLatLon
  });
}

// ✅ 주변 식당 로드 (🔥 핵심 수정됨)
async function loadNearbyRestaurants(lat, lng) {

  // 👉 Flask 기준으로 변경 (포트 5000)
  const res = await fetch(`http://127.0.0.1:5000/api/nearby?lat=${lat}&lng=${lng}`);
  const data = await res.json();

  const box = document.getElementById('restaurantList');

  box.innerHTML = data.map(r => `
    <div class="bg-white p-3 border rounded shadow">
      <b>${r.name}</b>
    </div>
  `).join('');

  if (!map) initMap();

  data.forEach(r => {
    new kakao.maps.Marker({
      map: map,
      position: new kakao.maps.LatLng(r.lat, r.lng)
    });
  });
}