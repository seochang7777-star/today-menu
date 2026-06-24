import api, { TokenStore } from './axiosInstance'

// ── AUTH ──────────────────────────────────────────────────────────────────────
export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data   // { access_token, refresh_token, user_id, nickname, role, ... }
}

/** 카카오 소셜 로그인 — 카카오 SDK에서 받은 access_token 전달 */
export async function kakaoLogin(kakaoAccessToken) {
  const { data } = await api.post('/auth/kakao', { access_token: kakaoAccessToken })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}


// ── KAKAO SEARCH ─────────────────────────────────────────────
export async function searchKakao({ q, lat, lng, radius = 1000 }) {
  const { data } = await api.get('/api/kakao/search', {
    params: { q, lat, lng, radius }
  })
  return data   // { places, total }
}


/** 네이버 소셜 로그인 — 네이버 SDK에서 받은 access_token 전달 */
export async function naverLogin(naverAccessToken) {
  const { data } = await api.post('/auth/naver', { access_token: naverAccessToken })
  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}

export async function logout() {
  TokenStore.clear()
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  return data
}

// export async function updateMe(payload) {
//   const { data } = await api.put('/auth/me', payload)
//   return data
// }

// ── RESTAURANT ────────────────────────────────────────────────────────────────
export async function getRestaurants(params = {}) {
  const { data } = await api.get('/menu/', { params })
  return data   // { items, total, pages, page, categories }
}

export async function getRestaurant(restId) {
  const { data } = await api.get(`/menu/${restId}`)
  return data
}

export async function createRestaurant(payload) {
  const { data } = await api.post('/menu/', payload)
  return data
}

export async function deleteRestaurant(restId) {
  const { data } = await api.delete(`/menu/${restId}`)
  return data
}

// ── NEARBY ────────────────────────────────────────────────────────────────────
export async function getNearby({ lat, lng, radius = 500 }) {
  const { data } = await api.get('/api/nearby', { params: { lat, lng, radius } })
  return data   // [{ id, name, category, address, avg_rating, dist }]
}

// ── PARTY ─────────────────────────────────────────────────────────────────────
export async function getParties(params = {}) {
  const { data } = await api.get('/party/', { params })
  return data
}

export async function getParty(partyId) {
  const { data } = await api.get(`/party/${partyId}`)
  return data   // { ...party, messages: [] }
}

export async function createParty(payload) {
  const { data } = await api.post('/party/', payload)
  return data
}

export async function joinParty(partyId) {
  const { data } = await api.post(`/party/${partyId}/join`)
  return data
}

export async function sendPartyChat(partyId, content) {
  const { data } = await api.post(`/party/${partyId}/chat`, { content })
  return data
}

export async function updatePartyStatus(partyId, status) {
  const { data } = await api.patch(`/party/${partyId}/status`, { status })
  return data
}

// ── MYPAGE ────────────────────────────────────────────────────────────────────
export async function getMyPage() {
  const { data } = await api.get('/mypage/')
  return data   // { user, my_parties, rec_logs }
}

// 🏠 임시 변경: 백엔드 API가 준비될 때까지 에러가 안 나도록 프론트에서만 가상 처리!
export async function updateMyPageProfile(payload) {
  return { user: payload }
}

// ── CHATBOT ───────────────────────────────────────────────────────────────────
/**
 * @param {string} message      사용자 입력
 * @param {Array}  history      이전 대화 [{role, content}, ...]
 * @param {'recommend'|'qna'} mode  탭 모드
 * @param {number|null} lat      현재 위도 (위치 허용 시)
 * @param {number|null} lng      현재 경도 (위치 허용 시)
 */
export async function sendChat(message, history = [], mode = 'recommend', lat = null, lng = null) {
  const { data } = await api.post('/api/chat', { message, history, mode, lat, lng })
  return data   // { reply }
}

// ── LIKE ──────────────────────────────────────────────────────────────────────
export async function toggleLike(logId) {
  const { data } = await api.post(`/api/like/${logId}`)
  return data   // { liked }
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