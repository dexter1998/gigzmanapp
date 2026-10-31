import Image from "next/image";
import Link from "next/link";
import { PageShell, Hero, Section } from "@/components/landing/NoWebsitePieces";
import { Breadcrumbs, type Crumb } from "@/components/pseo/Breadcrumbs";
import type { ListDef } from "@/lib/lists/defs";
import { listPath } from "./ListView";

/** A hub of list pages: every child linked with its own image and audience line (click depth 1). */
export function ListHub({ crumbs, eyebrow, h1, lede, groups }: {
  crumbs: Crumb[]; eyebrow: string; h1: string; lede: React.ReactNode;
  groups: Array<{ h2: string; intro?: string; items: ListDef[] }>;
}) {
  return (
    <PageShell>
      <Breadcrumbs items={crumbs} />
      <Hero eyebrow={eyebrow} h1={h1} lede={lede} />
      {groups.map((g) => (
        <Section key={g.h2} h2={g.h2}>
          {g.intro && <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "0 0 16px" }}>{g.intro}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
            {g.items.map((d) => (
              <Link key={d.slug} href={listPath(d)} style={{ display: "block", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", textDecoration: "none" }}>
                <Image src={d.image} alt={d.imageAlt} width={800} height={450} sizes="(max-width: 600px) 100vw, 280px" style={{ width: "100%", height: "auto", display: "block" }} />
                <div style={{ padding: "12px 14px 14px" }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)" }}>{d.h1.charAt(0).toUpperCase() + d.h1.slice(1)}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--g-ink-soft)", marginTop: 4 }}>{d.audience}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </PageShell>
  );
}
