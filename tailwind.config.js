/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta da marca — fixa, NÃO mexer sem alinhar com o spec
        primary: "#0EA5E9", // azul elétrico
        graphite: "#111827", // grafite (bg principal)
        // Tons neutros para painéis/bordas (espelham o estilo do roku.html)
        panel: {
          DEFAULT: "rgba(255,255,255,0.03)",
          border: "rgba(255,255,255,0.06)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Geist Sans", "Inter", "sans-serif"],
      },
      borderRadius: {
        // Cantos arredondados padrão do design system (8–12px)
        DEFAULT: "10px",
      },
      animation: {
        "pulse-soft": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
