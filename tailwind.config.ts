import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paragraph-function map palette (semantic writing roles)
        fn: {
          hook: "#f59e0b",
          context: "#3b82f6",
          argument: "#8b5cf6",
          evidence: "#10b981",
          turn: "#ef4444",
          closing: "#6366f1",
          neutral: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
