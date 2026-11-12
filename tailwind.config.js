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
        sunk: "#f7f7f5",
        ink: {
          DEFAULT: "#111111",
          2: "#57534e",
          3: "#78716c"
        },
        rule: "#e7e5e4",
        lime: {
          DEFAULT: "#a3e635",
          text: "#365314",
          wash: "#f4fce4",
          deep: "#65a30d"
        },
        alert: "#b91c1c",
        chart2: "#78716c",
        chart3: "#d6d3d1"
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        overlay: "0 24px 64px rgba(17, 17, 17, 0.18)"
      }
    },
  },
  plugins: [],
}
