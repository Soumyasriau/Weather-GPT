import { fileURLToPath, URL } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Backend port. Change here if FastAPI runs elsewhere.
const backend = 'http://localhost:8000'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Dev and preview both proxy /api, so the browser only ever sees one origin.
  // CORS never applies and the backend needs no change (spec section 12).
  server: { proxy: { '/api': { target: backend, changeOrigin: true } } },
  preview: { proxy: { '/api': { target: backend, changeOrigin: true } } },
})
