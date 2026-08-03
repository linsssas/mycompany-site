import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

const PATHS = [
  "/",
  "/tools",
  "/tools/etsy-fee-calculator",
  "/tools/fiverr-fee-calculator",
  "/tools/upwork-fee-calculator",
  "/tools/gumroad-fee-calculator",
  "/tools/youtube-money-calculator",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));
}
