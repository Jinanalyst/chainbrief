import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community — Market Discussions & Opinions",
  description:
    "Live discussion, stance posts, and creator-led market opinions on crypto, stocks, and macro. Join the Chain Brief community feed.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "Chain Brief Community",
    description:
      "Live discussion and stance posts from analysts and readers across crypto, stocks, and macro.",
    url: "/community",
    type: "website",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
