import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: process.env.NODE_ENV === 'development' ? {
      '/proxy': {
        target: 'https://api.wipon.kz7',
        changeOrigin: true,
        secure: false,
      },
    } : {},
  },
  preview: { port: 5174 }
});
