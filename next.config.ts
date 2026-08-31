import type { NextConfig } from "next";
import { CITIES } from "./lib/pseo/locations";

const nextConfig: NextConfig = {
  // Container deploys (App Runner) run node server.js from a self-contained folder instead of
  // needing the full node_modules tree. Vercel ignores this setting, so it is safe to keep on
  // while both deploy targets exist during the migration.
  output: "standalone",
  // The OG renderer reads its background art and fonts from disk. public/ is served from the CDN and
  // is not otherwise present in a serverless function, so these have to be traced in explicitly.
  outputFileTracingIncludes: {
    "/api/og": ["./public/og/**/*", "./public/mantis-logo-wordmark.png", "./app/api/og/fonts/**/*"],
  },
  async redirects() {
    return [
      // The partnership email that goes to paid users at their limit links to
      // /partnership-program; the site's own nav and footer call the same thing /partner. Rather
      // than have two pages saying the same thing and splitting their ranking, /partner is
      // canonical and the emailed URL redirects into it. Permanent so the link equity follows.
      { source: "/partnership-program", destination: "/partner", permanent: true },
      // "Manage alerts" in lead emails: what a recipient actually wants there is control over which
      // emails reach them, which is the preferences page.
      { source: "/alerts", destination: "/preferences", permanent: false },
      { source: "/about", destination: "/company", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      // Lead pages gained a country segment when the section went from one country to five:
      // `/leads/<service>/<city>` -> `/leads/<service>/<country>/<city>`. City slugs are globally
      // unique, so the segment is redundant for lookup — it is there because the hierarchy is what
      // the pages claim to be, and a five-country section whose URLs cannot say which country a
      // city is in is not one.
      //
      // Generated from the registry rather than hand-listed: the old flat space could only ever
      // have contained Indian slugs, and missing one would 404 a page that used to work. `:path*`
      // matches zero or more segments, so one rule per city covers the city page and everything
      // beneath it. Permanent, because the old shape is never coming back.
      ...CITIES.filter((c) => c.countryCode === "in").map((c) => ({
        source: `/leads/:service/${c.slug}/:path*`,
        destination: `/leads/:service/in/${c.slug}/:path*`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
