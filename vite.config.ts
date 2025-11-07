import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Убираем ненужные заголовки, чтобы не получить 431
            proxyReq.removeHeader('cookie')
            proxyReq.removeHeader('authorization')
          })
        },
      },
    },
  },
  preview: { port: 5174 },
})
