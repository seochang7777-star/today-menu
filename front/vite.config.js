import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth':   { target: 'http://localhost:5000', changeOrigin: true },
      '/menu':   { target: 'http://localhost:5000', changeOrigin: true },
      '/party':  { target: 'http://localhost:5000', changeOrigin: true },
      '/mypage': { target: 'http://localhost:5000', changeOrigin: true },
      '/api':    { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
