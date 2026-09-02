import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5005',
        changeOrigin: true
      },
      '/virtual_printers': {
        target: 'http://localhost:5005',
        changeOrigin: true
      }
    }
  }
});
