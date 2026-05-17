import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", "html:not(.theme-light)"],
  theme: {
    extend: {
      colors: {
        background: withAlpha("--color-background"),
        surface: withAlpha("--color-surface"),
        "surface-2": withAlpha("--color-surface-2"),
        "surface-3": withAlpha("--color-surface-3"),
        border: withAlpha("--color-border"),
        line: withAlpha("--color-line"),
        ink: withAlpha("--color-ink"),
        muted: withAlpha("--color-muted"),
        "muted-2": withAlpha("--color-muted-2"),
        accent: withAlpha("--color-accent"),
        "accent-soft": withAlpha("--color-accent-soft"),
        success: withAlpha("--color-success"),
        danger: withAlpha("--color-danger"),
        tint: withAlpha("--color-tint"),
        "accent-ink": withAlpha("--color-accent-ink"),
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
