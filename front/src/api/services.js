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

// ── CHATBOT ───────────────────────────────────────────────────────────────────
export async function sendChat(message, history = [], mode = 'recommend', lat = null, lng = null, loc_index = null) {
  const { data } = await api.post('/api/chat', { message, history, mode, lat, lng, loc_index })
  return data
}

// ── LIKE ──────────────────────────────────────────────────────────────────────
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
