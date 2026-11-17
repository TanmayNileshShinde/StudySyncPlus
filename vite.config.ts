import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // On Vercel (or any root domain deployment), base must be '/'.
  // On GitHub Pages (subpath repo StudySyncPlus), base is '/StudySyncPlus/'.
  // Vercel build environment automatically defines process.env.VERCEL = '1'.
  base: process.env.VITE_BASE || (process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/StudySyncPlus/' : '/')),
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('pptx-preview')) {
              return 'vendor-pptx';
            }
            if (id.includes('mermaid')) {
              return 'vendor-mermaid';
            }
            if (id.includes('rehype-highlight') || id.includes('remark-gfm') || id.includes('highlight.js')) {
              return 'vendor-markdown';
            }
          }
        }
      }
    }
  }
})
