import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // On Vercel (or any root domain deployment), base must be '/'.
  // On GitHub Pages (subpath repo StudySyncPlus), base is '/StudySyncPlus/'.
  // Vercel build environment automatically defines process.env.VERCEL = '1'.
  base: process.env.VITE_BASE || (process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/StudySyncPlus/' : '/')),
})
