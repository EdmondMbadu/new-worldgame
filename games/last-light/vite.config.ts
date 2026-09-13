import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/games/last-light/',
  plugins: [react()],
  server: { port: 5175, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['@dimforge/rapier3d-compat'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
