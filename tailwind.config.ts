import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0A1220", 2: "#101B2E", 3: "#17233A" },
        line: "#253654",
        chalk: { DEFAULT: "#F4F3EC", dim: "#C7CCD8" },
        turf: { DEFAULT: "#3FA34D", bright: "#55C264", dim: "#1F4A28" },
        amber: { DEFAULT: "#E8A33D", dim: "#7A5A22" },
        clay: "#C7502B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: { xl2: "20px" },
    },
  },
  plugins: [],
};
export default config;
