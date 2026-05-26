import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { RealtimeKeywordAlerts } from "@/components/realtime-keyword-alerts";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import "./globals.css";

const adsenseClient =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-4572550568039838";

const SITE_URL = "https://chainbrief.kr";
const SITE_NAME = "Chain Brief";
const SITE_TITLE = "Chain Brief | Market Intelligence, Connected.";
const SITE_DESCRIPTION =
  "Market intelligence network connecting crypto, stocks, and macro news into one connected financial information feed. Real-time analyst insights, briefs, and heatmaps.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Chain Brief",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "Chain Brief",
    "체인브리프",
    "crypto news",
    "stock market",
    "macro analysis",
    "market intelligence",
    "analyst insights",
    "암호화폐",
    "주식",
    "매크로",
    "시장 분석",
    "투자 인사이트",
  ],
  authors: [{ name: "Chain Brief" }],
  creator: "Chain Brief",
  publisher: "Chain Brief",
  category: "finance",
  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
      "en-US": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070a12" },
  ],
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: "체인브리프",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: SITE_DESCRIPTION,
  sameAs: [] as string[],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["ko-KR", "en-US"],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/briefs?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap"
        />
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
        <OnboardingBanner />
        {children}
        <RealtimeKeywordAlerts />
      </body>
    </html>
  );
}
