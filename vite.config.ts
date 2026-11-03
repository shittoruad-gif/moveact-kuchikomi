import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      // Host をそのまま渡す（どのお店かをドメインで決めているため。例：http://example.localhost:5174）
      '/trpc': { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
})
