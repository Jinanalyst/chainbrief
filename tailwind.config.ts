import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070A12",
        surface: "#0D111C",
        "surface-2": "#121827",
        "surface-3": "#182033",
        border: "#263044",
        line: "#263044",
        ink: "#F7FAFC",
        muted: "#9AA7B8",
        "muted-2": "#66758A",
        accent: "#2F7BFF",
        "accent-soft": "#102B5C",
        success: "#25C685",
        danger: "#FF5E6C",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      spacing: {
        section: "5rem",
        "section-sm": "3rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(47, 123, 255, 0.18), 0 24px 70px rgba(0, 0, 0, 0.35)",
        soft: "0 18px 50px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
