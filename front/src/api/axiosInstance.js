/**
 * axiosInstance.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 재사용 가능한 Axios 인스턴스
 * - 요청 인터셉터 : localStorage의 accessToken을 Authorization 헤더에 자동 주입
 * - 응답 인터셉터 : 401 토큰 만료 시 refreshToken으로 재발급 → 원래 요청 재시도
 *                  재발급도 실패하면 로그아웃 처리
 * ─────────────────────────────────────────────────────────────────────────────
 */
import axios from 'axios'


// ── 1. 인스턴스 생성 ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL ?? '',
  timeout:         10_000,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── 2. 토큰 저장소 ───────────────────────────────────────────────────────────
export const TokenStore = {
  getAccess:  ()      => localStorage.getItem('accessToken'),
  getRefresh: ()      => localStorage.getItem('refreshToken'),
  setTokens:  (a, r)  => {
    localStorage.setItem('accessToken', a)
    if (r) localStorage.setItem('refreshToken', r)
  },
  clear: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
}

// ── 3. 요청 인터셉터 : accessToken 자동 첨부 ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = TokenStore.getAccess()
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── 4. 응답 인터셉터 : 401 → refresh → 재시도 ────────────────────────────────
let isRefreshing = false
let failedQueue  = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  )
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config
    if (error.response?.status !== 401 || orig._retry) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((newToken) => {
        orig.headers['Authorization'] = `Bearer ${newToken}`
        return api(orig)
      })
    }

    orig._retry  = true
    isRefreshing = true

    try {
      const { data } = await axios.post('/api/auth/refresh', {}, {
        headers: { Authorization: `Bearer ${TokenStore.getRefresh()}` },
      })
      const newToken = data.access_token
      TokenStore.setTokens(newToken, data.refresh_token ?? TokenStore.getRefresh())
      processQueue(null, newToken)
      orig.headers['Authorization'] = `Bearer ${newToken}`
      return api(orig)
    } catch (refreshError) {
      processQueue(refreshError)
      TokenStore.clear()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
