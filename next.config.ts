import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "i.ytimg.com",
        protocol: "https",
      },
      {
        hostname: "i1.ytimg.com",
        protocol: "https",
      },
      {
        hostname: "i2.ytimg.com",
        protocol: "https",
      },
      {
        hostname: "i3.ytimg.com",
        protocol: "https",
      },
      {
        hostname: "i4.ytimg.com",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
