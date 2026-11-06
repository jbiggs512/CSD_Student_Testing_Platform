import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.BACKEND_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/docs': {
        target: process.env.BACKEND_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: process.env.BACKEND_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/index.ts'],
    },
  },
})
