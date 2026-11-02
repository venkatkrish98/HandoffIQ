import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Forge Custom UI serves the bundle from a sub-path, so assets must be relative.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { fs: { allow: ['../..'] } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
});
