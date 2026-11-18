import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the Vite server proxies API + WebSocket calls to the backend, so there is no CORS to configure locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': { target: 'ws://localhost:4000', ws: true },
    },
  },
});
