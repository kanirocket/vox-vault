import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// During `vite dev`, the backend runs separately on :3000; proxy /api to it.
// `vite build` emits a static bundle into dist/ that the Express backend serves.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 4030,
    allowedHosts: ['dev-vox-vault.kanirocket.com'],
    proxy: {
      '/api': process.env.VITE_API_TARGET || 'http://localhost:4031',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
