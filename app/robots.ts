import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/join"],
        // Session-gated app surfaces — nothing useful to a crawler, and
        // /admin is a security-sensitive path best kept out of indexes.
        disallow: ["/board", "/tracker", "/admin"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
