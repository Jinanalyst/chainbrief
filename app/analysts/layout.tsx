import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analysts — Verified Market Voices",
  description:
    "Browse verified Chain Brief analysts covering crypto, stocks, and macro. Follow analysts, read their track records, and subscribe to premium research.",
  alternates: { canonical: "/analysts" },
  openGraph: {
    title: "Chain Brief Analysts",
    description:
      "Browse verified analysts and follow their market calls across crypto, stocks, and macro.",
    url: "/analysts",
    type: "website",
  },
};

export default function AnalystsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
