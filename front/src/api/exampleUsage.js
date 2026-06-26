import React, { useEffect, useState } from 'react'
import api, { publicApi, TokenStore } from './axiosInstance'

// 1. 백엔드 라우팅 URL로 JSON 요청하기
export async function getMenusByAxios() {
  const { data } = await publicApi.get('/menu/', {
    params: {
      cat: '한식',
      q: '김치찌개',
    },
  })

  return data
}

// 2. 로그인 후 토큰 저장하기
export async function loginByAxios(email, password) {
  const { data } = await publicApi.post('/auth/login', { email, password })

  TokenStore.setTokens(data.access_token, data.refresh_token)
  return data
}

// 3. JWT가 필요한 API 호출하기
// api 인스턴스는 요청 전에 Authorization: Bearer <accessToken>을 자동으로 붙입니다.
export async function getMyInfoByJwt() {
  const { data } = await api.get('/auth/me')
  return data
}

// 4. 컴포넌트에서 사용하는 예시
export function MyPageExample() {
  const [me, setMe] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await getMyInfoByJwt()
        setMe(data)
      } catch (error) {
        setErrorMessage(error.response?.data?.message ?? '내 정보를 불러오지 못했습니다.')
      }
    }

    loadMe()
  }, [])

  if (errorMessage) {
    return React.createElement('p', null, errorMessage)
  }

  if (!me) {
    return React.createElement('p', null, '불러오는 중...')
  }

  return React.createElement('p', null, `${me.nickname}님, 반갑습니다.`)
}
