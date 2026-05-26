import type { MetadataRoute } from "next";

const SITE_URL = "https://chainbrief.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/settings",
          "/library",
          "/insights/studio",
          "/analyst/dashboard",
          "/analyst/payouts",
          "/analyst/write",
          "/community/new",
          "/community/write",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
