import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: [
        "/api/",
        "/account",
        "/auth/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
      userAgent: "*",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
