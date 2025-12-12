/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",     // <-- FALTABA ESTA LÍNEA (crítica)
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        primary: "#7c3aed",
        secondary: "#1e293b",
        muted: "#94a3b8",
        card: "rgba(255, 255, 255, 0.05)",
        border: "rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [],
};
