import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";

/**
 * Exists only to carry metadata: /login is a client component, and a client component cannot
 * export `metadata`. Without this the page fell through to the root layout's defaults, which is
 * why the one page people actually share had no title of its own and no social card.
 *
 * robots.txt disallows /login, so this is not an SEO play — it is what a pasted link looks like
 * in WhatsApp, Slack or a DM, which is how most first visits to this page arrive.
 */
export const metadata: Metadata = {
  title: { absolute: `Sign In or Create Your Free Account — ${COMPANY.brandLong}` },
  description:
    `Sign in to ${COMPANY.brandLong} or create a free account. Get 100 credits a month to find local ` +
    "businesses with no website near you. No card required to start.",
  alternates: { canonical: `${COMPANY.site}/login` },
  openGraph: {
    title: `Start Finding Local Clients — Free`,
    description: "100 free credits a month. Search the map, unlock the leads you want. No card required.",
    url: `${COMPANY.site}/login`,
    siteName: COMPANY.brand,
    type: "website",
    images: ogImageMeta({
      v: "network",
      eyebrow: COMPANY.brandLong,
      t1: "Start finding",
      t2: "local clients.",
      cta: "Create a free account →",
      url: "mantisai.in/login",
    }),
  },
  twitter: { card: "summary_large_image" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
