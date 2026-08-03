import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://linsssas.github.io/mycompany-site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/invoice"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));
}
