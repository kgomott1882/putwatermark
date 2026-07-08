import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#FFFFFF",
        signal: "#D97757",
        platinum: "#DCDCDD",
        frenchGray: "#C5C3C6",
        battleship: "#899097",
        /** Primary landing text — warm light cream */
        beige: "#F2EBE3",
        /** Muted landing body / labels */
        "beige-dim": "#B8B0A4",
        /** Inline keyword accent — golden tan */
        sand: "#CDBA9A",
        /** Landing dark background */
        night: "#121212",
        "night-elevated": "#1A1A1A",
        "night-card": "#222222",
        payne: "#4C5C68",
        charcoal: "#2A2826",
        "editor-rail": "#5A6775",
        "editor-panel": "#DFE8F2",
        "editor-panel-header": "#CFDAE8",
        "editor-panel-border": "#C2CEDC",
        "editor-accent": "#6B9FD4",
        "editor-finish": "#5CB8A8",
        "editor-exit": "#E86A6A",
        "editor-ink": "#2C3E50",
        "editor-muted": "#7A8B9C",
      },
    },
  },
  plugins: [],
};

export default config;
