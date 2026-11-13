import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // In production for GitHub Pages (repo StudySyncPlus), use '/StudySyncPlus/'.
  // In dev (or if VITE_BASE is overridden), use root or custom base.
  base: process.env.VITE_BASE || (process.env.NODE_ENV === 'production' ? '/StudySyncPlus/' : '/'),
})
