import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chain Brief | Crypto News Briefing",
  description:
    "Simple, easy-to-read crypto briefings across Bitcoin, Ethereum, Solana, DeFi, blockchain, and macro markets.",
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
