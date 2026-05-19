import type { Metadata } from "next";
import Script from "next/script";
import { RealtimeKeywordAlerts } from "@/components/realtime-keyword-alerts";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import "./globals.css";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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
        {adsenseClient ? (
          <Script
            async
            crossOrigin="anonymous"
            id="google-adsense"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="font-sans antialiased">
        {children}
        <RealtimeKeywordAlerts />
      </body>
    </html>
  );
}
