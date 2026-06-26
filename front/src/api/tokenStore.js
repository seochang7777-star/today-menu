const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

export const TokenStore = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setTokens({ accessToken, refreshToken }) {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    }

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  isLoggedIn() {
    return Boolean(this.getAccessToken())
  },

  // 기존 코드 호환용 별칭입니다.
  getAccess() {
    return this.getAccessToken()
  },

  getRefresh() {
    return this.getRefreshToken()
  },

  setTokensLegacy(accessToken, refreshToken) {
    this.setTokens({ accessToken, refreshToken })
  },

  clear() {
    this.clearTokens()
  },
}
