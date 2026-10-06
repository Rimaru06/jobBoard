import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Only the truly public, unauthenticated pages belong here — /board,
// /tracker/*, and /admin are session-gated and excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
