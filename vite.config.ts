import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const repoBase = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base: repoBase,
  plugins: [react(), tailwindcss()],
})
