import type { Config } from "tailwindcss";

// Systeme de design FIADO — voir /DESIGN.md pour le raisonnement complet.
// Le vert profond est la couleur d'identite dominante (pas un simple accent).
// L'or est reserve au bouton "+" et aux accents de tres haute importance.
// Le fond reste un neutre chaud discret, pas le "creme signature" generique.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#1C1B18",
          700: "#3A3833",
          500: "#6B6860",
          300: "#A6A29A",
        },
        sand: {
          50: "#FBF9F5",
          100: "#F3F0E9",
          200: "#E7E2D6",
        },
        forest: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
          700: "#0B5545",
          800: "#085041",
          900: "#04342C",
        },
        gold: {
          50: "#FAEEDA",
          100: "#FAC775",
          200: "#EF9F27",
          400: "#BA7517",
          600: "#854F0B",
          900: "#412402",
        },
        alert: {
          50: "#FCEBEB",
          100: "#F7C1C1",
          400: "#D85A30",
          600: "#A32D2D",
          900: "#501313",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sheet: "28px",
      },
    },
  },
  plugins: [],
};

export default config;
