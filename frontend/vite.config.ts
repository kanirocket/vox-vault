import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `vite dev`, the backend runs separately on :3000; proxy /api to it.
// `vite build` emits a static bundle into dist/ that the Express backend serves.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': process.env.VITE_API_TARGET || 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
