import api, { TokenStore } from './axiosInstance'

// ── AUTH ──────────────────────────────────────────────────────────────────────
export async function register(payload) {
  const { data } = await api.post('/api/auth/register', payload)
  return data
}

export async function login({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}

/** 카카오 소셜 로그인 */
export async function kakaoLogin(kakaoAccessToken) {
  const { data } = await api.post('/api/auth/kakao', { access_token: kakaoAccessToken })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}

/** 네이버 소셜 로그인 */
export async function naverLogin(naverAccessToken) {
  const { data } = await api.post('/api/auth/naver', { access_token: naverAccessToken })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}

export async function logout() {
  TokenStore.clear()
}

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function updateMe(payload) {
  const { data } = await api.put('/api/auth/me', payload)
  return data
}

// ── RESTAURANT ────────────────────────────────────────────────────────────────
export async function getRestaurants(params = {}) {
  const { data } = await api.get('/api/menu/', { params })
  return data
}

export async function getRestaurant(restId) {
  const { data } = await api.get(`/api/menu/${restId}`)
  return data
}

export async function createRestaurant(payload) {
  const { data } = await api.post('/api/menu/', payload)
  return data
}

export async function getRandomMenus(count = 64, cat = '전체') {
  const { data } = await api.get('/api/menu/random', { params: { count, cat } })
  return data.items ?? []
}

export async function getTrending() {
  const { data } = await api.get('/api/menu/trending')
  return data
}

export async function deleteRestaurant(restId) {
  const { data } = await api.delete(`/api/menu/${restId}`)
  return data
}

// ── NEARBY ────────────────────────────────────────────────────────────────────
export async function getNearby({ lat, lng, radius = 500 }) {
  const { data } = await api.get('/api/nearby', { params: { lat, lng, radius } })
  return data
}

// ── KAKAO SEARCH ──────────────────────────────────────────────────────────────
export async function searchKakao({ q, lat, lng, radius = 1000 }) {
  const { data } = await api.get('/api/kakao/search', { params: { q, lat, lng, radius } })
  return data
}

// ── PARTY ─────────────────────────────────────────────────────────────────────
export async function getParties(params = {}) {
  const { data } = await api.get('/api/party/', { params })
  return data
}

export async function getParty(partyId) {
  const { data } = await api.get(`/api/party/${partyId}`)
  return data
}

export async function createParty(payload) {
  const { data } = await api.post('/api/party/', payload)
  return data
}

export async function joinParty(partyId) {
  const { data } = await api.post(`/api/party/${partyId}/join`)
  return data
}

export async function sendPartyChat(partyId, content) {
  const { data } = await api.post(`/api/party/${partyId}/chat`, { content })
  return data
}

export async function updatePartyStatus(partyId, status) {
  const { data } = await api.patch(`/api/party/${partyId}/status`, { status })
  return data
}

// ── MYPAGE ────────────────────────────────────────────────────────────────────
export async function getMyPage() {
  const { data } = await api.get('/api/mypage/')
  return data
}

/** 프로필 수정 — MyPageEdit.jsx에서 호출 */
export async function updateMyPageProfile(payload) {
  const { data } = await api.put('/api/auth/me', payload)
  return data
}

/** 저장 장소 3개 저장/업데이트 */
export async function saveFavoriteLocations(locations) {
  const { data } = await api.put('/api/auth/me', { saved_locations: locations })
  return data   // serialize_user 반환 → saved_locations 포함
}

/** 현재 비밀번호 확인 */
export async function verifyPassword(currentPassword) {
  const { data } = await api.post('/api/auth/verify-password', {
    currentPassword,
  })
  return data
}

/** 비밀번호 변경 */
export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.patch('/api/auth/change-password', {
    currentPassword,
    newPassword,
  })
  return data
}
/** 아이디 찾기 */ 
export const findId = async (nickname, security_question, security_answer) => {
  const { data } = await api.post('/api/auth/findid', {
    nickname,
    security_question,
    security_answer,
  })

  return data
}
// ── CHATBOT ───────────────────────────────────────────────────────────────────
export async function findPassword({ email, nickname, newPassword }) {
  const { data } = await api.post('/api/auth/reset-password-direct', { email, nickname, new_password: newPassword })
  return data
}

export async function sendChat(message, history = [], mode = 'recommend', lat = null, lng = null, loc_index = null) {
  try {
    const { data } = await api.post('/api/chat', { message, history, mode, lat, lng, loc_index })
    return data
  } catch (error) {
    // 💡 개발자 도구(F12) 콘솔에서는 실제 OpenAI 에러 원인을 확인할 수 있도록 남겨둡니다.
    console.error('OpenAI 챗봇 통신 에러:', error);

    // ❌ 에러 객체나 코드를 그대로 던지는 대신, 요청하신 커스텀 문구로 에러를 가공해 던집니다.
    throw new Error('챗봇 이용이 어렵습니다. 잠시 후 다시 시도해주세요.');
  }
}

// ── PARTY ACTIONS ────────────────────────────────────────────────────────────
/** 파티 모집 마감 */
export async function closeParty(partyId) {
  const { data } = await api.patch(`/api/party/${partyId}/close`)
  return data
}

/** 파티 탈퇴 */
export async function leaveParty(partyId) {
  const { data } = await api.delete(`/api/party/${partyId}/leave`)
  return data
}

/** 파티원 강퇴 */
export async function kickPartyMember(partyId, targetUserId) {
  const { data } = await api.delete(`/api/party/${partyId}/kick/${targetUserId}`)
  return data
}

/** 파티원 신고 */
export async function reportPartyMember(partyId, targetId, reason) {
  const { data } = await api.post(`/api/party/${partyId}/report`, { target_id: targetId, reason })
  return data
}


// ── REVIEW ───────────────────────────────────────────────────────────────────
export async function getReviews(restId) {
  const { data } = await api.get(`/api/menu/${restId}/reviews`)
  return data
}
export async function createReview(restId, { rating, content }) {
  const { data } = await api.post(`/api/menu/${restId}/reviews`, { rating, content })
  return data
}
export async function deleteReview(restId, reviewId) {
  const { data } = await api.delete(`/api/menu/${restId}/reviews/${reviewId}`)
  return data
}
export async function getMyReviews() {
  const { data } = await api.get('/api/mypage/reviews')
  return data
}

// ── MANNER HISTORY ────────────────────────────────────────────────────────────
export async function getMannerHistory() {
  const { data } = await api.get('/api/manner/history')
  return data
}

// ── LIKE LOG ─────────────────────────────────────────────────────────────────
export async function createLikeLog(restaurantId) {
  const { data } = await api.post('/api/like/create', { restaurant_id: restaurantId })
  return data
}
// ── MANNER VOTE ──────────────────────────────────────────────────────────────
/** 매너온도 투표 — 하루 2회 제한 */
export async function voteManner(targetUserId, isPositive) {
  const { data } = await api.post(`/api/manner/vote/${targetUserId}`, { is_positive: isPositive })
  return data
}

/** 오늘 투표 현황 조회 */
export async function getMannerVoteStatus() {
  const { data } = await api.get('/api/manner/status')
  return data
}

export async function toggleLike(logId) {
  const { data } = await api.post(`/api/like/${logId}`)
  return data
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export async function getAdminUsers() {
  const { data } = await api.get('/api/admin/users')
  return data
}

export async function deleteUser(userId) {
  const { data } = await api.delete(`/api/admin/users/${userId}`)
  return data
}

// ── FOOTER 패밀리 사이트 (Footer.jsx에서 호출) ─────────────────────────────────
export async function getFamilySites() {
  // 백엔드 API 없으므로 기본값 반환
  return [
    { id: 1, name: '구글',  url: 'https://www.google.com' },
    { id: 2, name: '네이버', url: 'https://www.naver.com' },
    { id: 3, name: '카카오', url: 'https://www.kakao.com' },
  ]
}

// ── FAVORITES (찜 기능) ───────────────────────────────────────────────────────

export async function toggleFavorite(restaurantId) {
  const { data } = await api.post('/api/favorites', { restaurant_id: restaurantId });
  return data; // { status: "added" | "removed", msg: "..." }
}

export async function getMyFavorites() {
  const { data } = await api.get('/api/favorites');
  return data; // [ {id, name, ...}, ... ]
}

/**
 * 찜하기 액션 (통합 관리)
 * @param {string|number} id - 대상 ID (로그ID 또는 식당ID)
 * @param {Array} list - 현재 컴포넌트의 리스트 상태
 * @param {Function} setter - 리스트 상태를 변경하는 함수
 * @param {string} type - 'log' 또는 'restaurant' 구분
 */
export async function toggleFavoriteAction({ id, list, setter, type = 'log' }) {
  const previousList = [...list];

  // 1. 낙관적 업데이트: UI 즉시 반응
  setter((prev) =>
    prev.map((item) => {
      const targetId = type === 'log' ? (item.log_id || item.id) : (item.restaurant?.id ?? item.id);
      return targetId === id ? { ...item, is_liked: !item.is_liked } : item;
    })
  );

  try {
    // 2. 서버 요청: 이제 통합된 toggleFavorite API만 사용
    const res = await toggleFavorite(id); 

    // 3. 서버 응답 반영 (res.status === 'added' 면 true, 아니면 false)
    setter((prev) =>
      prev.map((item) => {
        const targetId = type === 'log' ? (item.log_id || item.id) : (item.restaurant?.id ?? item.id);
        return targetId === id ? { ...item, is_liked: res.status === 'added' } : item;
      })
    );
  } catch (err) {
    console.error('찜하기 처리 실패:', err);
    setter(previousList); // 실패 시 원상복구
    alert('찜 상태 변경에 실패했습니다.');
  }
}

// ── NOTICES ──────────────────────────────────────────────────────────────────
export async function getNotices() {
  const { data } = await api.get('/api/notices')
  return data
}
export async function createNotice({ title, content, category }) {
  const { data } = await api.post('/api/notices', { title, content, category })
  return data
}
export async function deleteNotice(noticeId) {
  const { data } = await api.delete(`/api/notices/${noticeId}`)
  return data
}
