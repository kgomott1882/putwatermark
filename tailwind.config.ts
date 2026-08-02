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
        /** Landing dark background — charcoal navy (#23292F) */
        night: "#23292F",
        "night-elevated": "#2A3139",
        "night-card": "#2F3740",
        /** Light landing band background (#F2F2F2) */
        "landing-light": "#F2F2F2",
        payne: "#4C5C68",
        charcoal: "#2A3139",
        /** Editor grayscale palette — four-step hierarchy; editor-only usage */
        "ed-bg": "#FFFFFF",
        "ed-panel": "#D4D4D4",
        "ed-bg-card": "#B3B3B3",
        "ed-bg-muted": "#EBEBEB",
        "ed-accent": "#2B2B2B",
        "ed-fg": "#000000",
        "ed-fg-muted": "#6B6B6B",
        "ed-border": "#999999",
        "editor-rail": "#D4D4D4",
        "editor-panel": "#D4D4D4",
        "editor-panel-header": "#B3B3B3",
        "editor-panel-border": "#999999",
        "editor-accent": "#2B2B2B",
        "editor-finish": "#D97757",
        "editor-exit": "#B3B3B3",
        "editor-ink": "#000000",
        "editor-muted": "#6B6B6B",
      },
    },
  },
  plugins: [],
};

export default config;
