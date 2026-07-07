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
      },
    },
  },
  plugins: [],
};

export default config;
