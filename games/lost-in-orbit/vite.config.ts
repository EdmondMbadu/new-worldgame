import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/games/lost-in-orbit/',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
