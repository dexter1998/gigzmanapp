import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { loadFunded } from "@/lib/funded/load";
import { FundedView } from "@/components/lists/FundedView";
import { fmtCount } from "@/lib/landing/no-website";

/** "funded startups india" 1,300/mo, "recently funded startups india" 260, "startup funding news india" 260 (2026-10-24). */
/** Per request (data read through day-cached aggregates / one indexed query): a static prerender
 *  would query the database during `next build`, which has no route to it. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = await loadFunded().catch(() => null);
  return {
    title: { absolute: "Recently Funded Startups in India (Updated Weekly) | Mantis" },
    description: `${d ? fmtCount(d.total) : "Every"} Indian startups that raised a round in the last six months — round, amount, investors and source, re-read from funding news every week.`,
    alternates: { canonical: `${COMPANY.site}/funded-startups-india` },
    robots: d && d.total >= 25 ? undefined : { index: false, follow: true },
    openGraph: { title: "Recently funded startups in India", url: `${COMPANY.site}/funded-startups-india`, images: ogImageMeta({ v: "leads", eyebrow: "Updated weekly", t1: "Recently funded", t2: "startups in India", url: "mantisai.in/funded-startups-india" }) },
  };
}

export default async function Page() {
  const data = await loadFunded();
  if (!data.total) notFound();
  return <FundedView data={data} />;
}
