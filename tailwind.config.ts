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
        steel: "#A2A2A2",
        mist: "#D4DDE2",
        paper: "#FFFFFF",
        signal: "#D97757",
      },
    },
  },
  plugins: [],
};

export default config;
