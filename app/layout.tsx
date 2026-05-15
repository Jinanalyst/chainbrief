import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chain Brief | Market Intelligence, Connected.",
  description:
    "Market intelligence network connecting crypto, stocks, and macro news into one connected financial information feed.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
