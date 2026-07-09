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
        "editor-rail": "#121212",
        "editor-panel": "#1A1A1A",
        "editor-panel-header": "#222222",
        "editor-panel-border": "#2E2C28",
        "editor-accent": "#D97757",
        "editor-finish": "#D97757",
        "editor-exit": "#222222",
        "editor-ink": "#F2EBE3",
        "editor-muted": "#B8B0A4",
      },
    },
  },
  plugins: [],
};

export default config;
