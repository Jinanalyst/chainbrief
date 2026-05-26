import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership — Paid Analyst Access",
  description:
    "Subscribe to verified Chain Brief analysts for premium research, member-only updates, and recurring access to their highest-conviction market work.",
  alternates: { canonical: "/membership" },
  openGraph: {
    title: "Chain Brief Membership",
    description:
      "Premium analyst research, member-only updates, and recurring access to top market work.",
    url: "/membership",
    type: "website",
  },
};

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
