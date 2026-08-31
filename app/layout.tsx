import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";

const GA_MEASUREMENT_ID = "G-BBJ4EB6XYK";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Headline/greeting moments only ("Welcome back, Tarun.") — everything else (UI, body,
// labels) stays Plus Jakarta Sans, matching Origami's own display+body pairing without
// adopting Origami's colors.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

// The "mantis" wordmark specifically (sidebar, login) — everything else keeps its existing
// font treatment.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
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
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* afterInteractive: loads once the page is interactive, matching Next.js's own
            recommendation for analytics scripts that don't need to block rendering. */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />
        <Script id="ga-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
