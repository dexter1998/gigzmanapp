import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // Signed unsubscribe links. A crawler following one would be requesting an opt-out URL
          // for a real subscriber; the endpoint only mutates on POST, but these should not be
          // indexed or fetched at all.
          "/u/",
          // Authenticated product surfaces — nothing here renders for a crawler anyway.
          "/home",
          "/leads",
          "/chat",
          "/lms",
          "/profile",
          "/onboarding",
          // Account flows: no search value, and /verify carries an email in its query string.
          "/login",
          "/verify",
          "/preferences",
        ],
      },
    ],
    sitemap: `${COMPANY.site}/sitemap.xml`,
    host: COMPANY.site,
  };
}
