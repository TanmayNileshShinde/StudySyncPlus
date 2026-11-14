/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        sunk: "#f8fafc",
        ink: {
          DEFAULT: "#0f172a",
          2: "#475569",
          3: "#64748b"
        },
        rule: "#cbd5e1",
        'rule-dark': "#0f172a",
        lime: {
          DEFAULT: "#facc15", // ClassPost signature yellow
          text: "#713f12",
          wash: "#fef9c3",
          deep: "#eab308"
        },
        alert: "#ef4444",
        cp: {
          dark: "#0f172a",
          yellow: "#facc15",
          'yellow-light': "#fef9c3",
          green: "#22c55e",
          'green-light': "#dcfce7",
          red: "#ef4444",
          'red-light': "#fee2e2",
          blue: "#3b82f6",
          'blue-light': "#dbeafe",
          purple: "#a855f7",
          'purple-light': "#f3e8ff",
          teal: "#14b8a6",
          'teal-light': "#ccfbf1",
          slate: "#f1f5f9"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        neo: "4px 4px 0px #0f172a",
        'neo-sm': "2px 2px 0px #0f172a",
        'neo-lg': "6px 6px 0px #0f172a",
        'neo-hover': "6px 6px 0px #0f172a",
        overlay: "0 24px 64px rgba(15, 23, 42, 0.25)"
      }
    },
  },
  plugins: [],
}
