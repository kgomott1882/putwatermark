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
        ink: "#000000",
        paper: "#FFFFFF",
        signal: "#D97757",
        platinum: "#DCDCDD",
        frenchGray: "#C5C3C6",
        battleship: "#899097",
        payne: "#4C5C68",
        charcoal: "#36454F",
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
