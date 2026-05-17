export const colors = {
  bg: "#FFFFFF",
  bgMuted: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F4F8",
  border: "#ECEEF3",
  borderStrong: "#DDE1E8",

  text: "#111827",
  textMuted: "#6B7280",
  textFaint: "#9AA1AF",

  brand: "#2F7BFF",
  brandSoft: "#E8F0FF",

  bullish: "#1FBF6B",
  bearish: "#F0413E",
  warning: "#F4A93C",

  bitcoin: "#F7931A",
  ethereum: "#627EEA",

  tabActive: "#2F7BFF",
  tabInactive: "#9AA1AF",
} as const;

export type ThemeColor = keyof typeof colors;
