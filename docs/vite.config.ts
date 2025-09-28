import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },
  publicDir: '../public',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/scripts': resolve(__dirname, './src/scripts'),
      '@/components': resolve(__dirname, './src/components')
    }
  },
  css: {
    postcss: {
      plugins: []
    }
  },
  server: {
    port: 5173,
    host: true
  }
});