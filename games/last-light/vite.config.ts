import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { offlineCache } from './scripts/offline-cache';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: '/games/last-light/',
  plugins: [react(), offlineCache()],
  resolve: {
    // Browsers stream Rapier's WebAssembly; tests keep the compat build.
    alias: [
      {
        find: '@dimforge/rapier3d-compat',
        replacement: fileURLToPath(new URL('./src/vendor/rapier.ts', import.meta.url)),
      },
      {
        find: /^\.\/rapier_wasm3d$/,
        replacement: fileURLToPath(new URL('./src/vendor/rapier-wasm.ts', import.meta.url)),
      },
    ],
  },
  // Served as source in development, so the wasm alias above applies to it.
  optimizeDeps: { exclude: ['@dimforge/rapier3d'] },
  server: { port: 5175, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['@dimforge/rapier3d'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
