import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // 모든 /api 시작 요청만 백엔드로 토스
      '/auth':   { target: 'http://localhost:5000', changeOrigin: true },
      '/menu':   { target: 'http://localhost:5000', changeOrigin: true },
      '/party':  { target: 'http://localhost:5000', changeOrigin: true },
      '/mypage': { target: 'http://localhost:5000', changeOrigin: true },
      '/api': { 
        target: 'http://localhost:5000', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
