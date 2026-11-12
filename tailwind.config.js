/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#eef2f6",
          card: "#ffffff",
          primary: "#6366f1",
          primaryLight: "#818cf8",
          secondary: "#ec4899",
          accent: "#06b6d4",
          success: "#10b981",
          warning: "#f59e0b",
          dark: "#1e293b",
          surface: "#f8fafc",
          border: "#e2e8f0"
        }
      },
      boxShadow: {
        'clay-card': '12px 12px 24px #d1d9e6, -12px -12px 24px #ffffff, inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.03)',
        'clay-card-hover': '16px 16px 30px #c5cfdd, -16px -16px 30px #ffffff, inset 2px 2px 4px rgba(255,255,255,0.9), inset -2px -2px 4px rgba(0,0,0,0.04)',
        'clay-btn': '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff, inset 1px 1px 2px rgba(255,255,255,0.6)',
        'clay-btn-active': 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff',
        'clay-input': 'inset 4px 4px 8px #d9e1ec, inset -4px -4px 8px #ffffff',
        'clay-badge': '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
        'clay-colored': '8px 8px 18px rgba(99, 102, 241, 0.35), -8px -8px 18px rgba(255, 255, 255, 0.9), inset 2px 2px 3px rgba(255, 255, 255, 0.6)',
      },
      borderRadius: {
        'clay': '1.5rem',
        'clay-lg': '2rem',
        'clay-xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
