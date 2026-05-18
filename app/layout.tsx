import type { Metadata } from "next";
import { RealtimeKeywordAlerts } from "@/components/realtime-keyword-alerts";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        <RealtimeKeywordAlerts />
      </body>
    </html>
  );
}
