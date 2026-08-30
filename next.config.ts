import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
