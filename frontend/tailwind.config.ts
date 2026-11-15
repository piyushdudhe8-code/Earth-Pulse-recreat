import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        space: "#0b1d35",
        earth: "#2f7d58",
        ocean: "#167d8d",
        ember: "#e9824c",
      },
    },
  },
  plugins: [],
};

export default config;
