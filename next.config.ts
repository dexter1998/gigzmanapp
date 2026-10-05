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
  async headers() {
    return [
      {
        // Everything EXCEPT /widget. The widget is an iframe by design — it is embedded on other
        // sites — so the blanket DENY below would stop the one page that has to be framable,
        // including on our own marketing pages. Excluding it here rather than trying to override
        // the header in a second matching rule: Next applies every matching entry, and relying on
        // which one wins for a duplicate key is exactly the kind of thing that breaks silently.
        source: "/((?!widget$|widget/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          {
            // unsafe-inline/unsafe-eval are required by Next.js's inline hydration script and GTM;
            // tightening this further needs per-script nonces, which standalone output doesn't wire up.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // maps.googleapis.com is the Maps JS API bootstrap; it then pulls its own module
              // chunks from maps.gstatic.com and talks to *.googleapis.com for tiles, Places and
              // the key-auth call. Without these the loader is blocked outright and every map on
              // the site (landing demo and /home alike) silently renders as an empty box.
              // sdk.cashfree.com / checkout.razorpay.com are the two checkout loaders
              // (components/billing/useCashfreeCheckout.ts fetches both up front and the server
              // picks the gateway per order). Without them here the scripts are blocked outright,
              // window.Razorpay/window.Cashfree never exist, and every Buy credits click dies on
              // "Payment window couldn't load" -- which is how orders ended up stuck at `created`
              // in payments with no checkout ever opening. Wildcarded rather than pinned to the two
              // loader hosts: Razorpay's loader pulls its own risk-detection bundle from
              // cdn.razorpay.com, so checkout.razorpay.com alone still throws mid-checkout.
              // cdn.stickly.live serves the rewards widget. Without it here the script is blocked
              // outright, window.stk never exists, the boot call sits in a queue nothing drains,
              // and the widget simply never appears -- no error anywhere except a CSP line in the
              // browser console. Exactly how this CSP broke checkout in September; caught this time
              // by watching the console while the widget loaded rather than after someone reported
              // it missing.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com https://*.cashfree.com https://*.razorpay.com https://cdn.stickly.live",
              // Both gateways call their own APIs from the browser mid-checkout (Razorpay also
              // posts telemetry to lumberjack), so script-src alone is not enough.
              // The widget talks to its own API from the browser to list tasks and post a claim, so
              // script-src alone would load it and then leave it unable to do anything.
              "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.cashfree.com https://*.razorpay.com https://*.stickly.live",
              // The checkout itself renders in a gateway-hosted iframe, and the bank/UPI step
              // submits a form to it -- default-src 'self' would reject both.
              // The widget renders its panel in its own iframe.
              "frame-src 'self' https://*.cashfree.com https://*.razorpay.com https://*.stickly.live",
              "form-action 'self' https://*.cashfree.com https://*.razorpay.com",
              "img-src 'self' data: https: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              // Maps runs parts of its renderer in blob-backed workers, which default-src 'self'
              // would otherwise reject.
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // The widget page, and only the widget page. It renders no account data of its own — the
        // visitor's own conversation, reached with a token their browser already holds — so there
        // is nothing here for a clickjacked frame to steal. Everything else keeps DENY.
        source: "/widget",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self'",
              // Themeable logo and avatar images come from whichever site embedded the widget.
              "img-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              // Deliberately open: the embed is meant to work on sites we do not control or know
              // about yet. The block switch in widget_sites is what stops a slug being abused,
              // not a list of hosts that would need a deploy every time a landing page ships.
              "frame-ancestors *",
            ].join("; "),
          },
        ],
      },
    ];
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
      // Generated from the registry rather than hand-listed, and covers every city -- not just the
      // Indian ones that were actually live under the flat shape. The flat URL is what a person
      // naturally guesses regardless of which country the city is in (a user did exactly this for
      // London, which was never live flat), so restricting the rule to "cities that used to have
      // this URL for real" protects nothing and 404s a guess that should just work. `:path*`
      // matches zero or more segments, so one rule per city covers the city page and everything
      // beneath it. Permanent, because the old shape is never coming back.
      ...CITIES.map((c) => ({
        source: `/leads/:service/${c.slug}/:path*`,
        destination: `/leads/:service/${c.countryCode}/${c.slug}/:path*`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
