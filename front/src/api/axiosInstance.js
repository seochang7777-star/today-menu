import axios from 'axios'
import { TokenStore as BaseTokenStore } from './tokenStore'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const REFRESH_URL = '/auth/refresh'

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export const TokenStore = {
  getAccessToken() {
    return BaseTokenStore.getAccessToken()
  },
  getRefreshToken() {
    return BaseTokenStore.getRefreshToken()
  },
  setTokens(accessToken, refreshToken) {
    BaseTokenStore.setTokens({ accessToken, refreshToken })
  },
  setTokenObject(tokens) {
    BaseTokenStore.setTokens(tokens)
  },
  clearTokens() {
    BaseTokenStore.clearTokens()
  },
  isLoggedIn() {
    return BaseTokenStore.isLoggedIn()
  },
  getAccess() {
    return BaseTokenStore.getAccessToken()
  },
  getRefresh() {
    return BaseTokenStore.getRefreshToken()
  },
  clear() {
    BaseTokenStore.clearTokens()
  },
}

api.interceptors.request.use(
  (config) => {
    const token = TokenStore.getAccess()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(resolve, reject) {
  refreshSubscribers.push({ resolve, reject })
}

function notifyTokenRefresh(error, accessToken = null) {
  refreshSubscribers.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }

    resolve(accessToken)
  })

  refreshSubscribers = []
}

async function refreshAccessToken() {
  const refreshToken = TokenStore.getRefresh()

  if (!refreshToken) {
    throw new Error('Refresh token does not exist.')
  }

  const { data } = await publicApi.post(
    REFRESH_URL,
    {},
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  )

  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(resolve, reject)
      }).then((accessToken) => {
        originalRequest.headers ??= {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const accessToken = await refreshAccessToken()
      notifyTokenRefresh(null, accessToken)
      originalRequest.headers ??= {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      notifyTokenRefresh(refreshError)
      TokenStore.clear()
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
