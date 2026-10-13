import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { CookieConsent } from "@/components/CookieConsent";
import { FounderWidgetScript } from "@/components/widget/FounderWidgetScript";

const GA_MEASUREMENT_ID = "G-BBJ4EB6XYK";

/*
 * Self-hosted, not next/font/google.
 *
 * next/font/google fetches every face from Google at BUILD time, and the Docker build has no font
 * cache mount -- so each cold production build made six live calls to fonts.gstatic.com and failed
 * the whole image if any of them did not answer. Two of three builds died that way on 2026-10-14,
 * with "Can't resolve '@vercel/turbopack-next/internal/font/google/font'", which reads like a code
 * fault and is not one. The files are 200 kB in total; a deploy that cannot fail on somebody
 * else's network is worth that.
 *
 * Variable files where Google has them (one request covers 400-800), static weights for Poppins,
 * which has no variable cut. Latin only, matching the subsets the Google config asked for.
 */

const jakarta = localFont({
  variable: "--font-jakarta",
  src: [{ path: "./fonts/PlusJakartaSans-Variable.woff2", weight: "400 800", style: "normal" }],
  // "optional" over "swap": Lighthouse measured a real 0.213 CLS on a pSEO H1 (Faridabad, using
  // this weight) caused by the swap-in reflow once the font finished loading. "optional" makes the
  // browser commit to the fallback the instant the font isn't ready in time, so the swap that
  // caused the shift simply never happens on that load. It also means the loss of next/font/google's
  // per-font fallback metrics costs nothing here: with no swap there is nothing to shift.
  display: "optional",
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Headline/greeting moments only ("Welcome back, Tarun.") — everything else (UI, body,
// labels) stays Plus Jakarta Sans.
const fraunces = localFont({
  variable: "--font-display",
  src: [
    { path: "./fonts/Fraunces-Variable.woff2", weight: "500 600", style: "normal" },
    { path: "./fonts/Fraunces-Italic-Variable.woff2", weight: "500 600", style: "italic" },
  ],
  display: "optional",
  adjustFontFallback: "Times New Roman",
  fallback: ["ui-serif", "Georgia", "serif"],
});

// The "mantis" wordmark specifically (sidebar, login). Poppins has no variable cut on Google
// Fonts, so these stay three static files.
const poppins = localFont({
  variable: "--font-poppins",
  src: [
    { path: "./fonts/Poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Poppins-700.woff2", weight: "700", style: "normal" },
  ],
  display: "optional",
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  // metadataBase resolves any relative URL a page emits. Every OG image today is already
  // absolute (lib/og builds them from COMPANY.site), but a single relative one anywhere would
  // otherwise silently produce a broken social card.
  metadataBase: new URL(COMPANY.site),
  // `template` applies to every page that sets a plain string title, so an app page writes only
  // its own name ("Billing") and still renders "Billing | Mantis" in the tab. `default` is what
  // a page with no title of its own gets — it must stand on its own as a real title, because
  // anything that falls through to it is a page nobody wrote metadata for.
  title: {
    default: `${COMPANY.brandLong} — Find Local Clients Who Need a Website`,
    template: `%s — ${COMPANY.brand}`,
  },
  description:
    "Find local businesses with no website and turn them into high-intent leads for your agency. " +
    "Real-time map search, not a stale database. Start free.",
  openGraph: {
    siteName: COMPANY.brand,
    type: "website",
    images: ogImageMeta({
      v: "hero",
      eyebrow: COMPANY.brandLong,
      t1: "Find local clients.",
      t2: "Reach the right people.",
      cta: "Get free access →",
      url: "mantisai.in",
    }),
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} ${poppins.variable} h-full antialiased`}
      // The admin section sets/clears `data-bs-theme` on this element imperatively (see
      // app/(admin)/admin/ThemeSetter.tsx) because Tabler's dark mode keys off `:root[data-bs-
      // theme=dark]`, which only `<html>` — owned by this shared root layout — can satisfy. That
      // makes a server/client attribute mismatch expected on every admin page load, not a bug.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsScripts measurementId={GA_MEASUREMENT_ID} />
        <CookieConsent />
        <FounderWidgetScript />
      </body>
    </html>
  );
}
