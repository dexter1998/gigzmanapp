import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { isV2Email } from "@/lib/v2";
import { toLead, mapLeads } from "@/lib/v2/lms";
import { loadProfile } from "@/lib/v2/scout";
import { suggestFor } from "@/lib/v2/suggest";
import { SIGNALS, type SignalId } from "@/lib/v2/playbooks";
import { publicEmailSource, publicProvenance } from "@/lib/v2/public";

/** One lead in full, with what to sell / what to offer from its signals and the seller's profile. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { id } = await params;
  // A lead added from the Home map (Leads → "Saved from map"): only what the map stored.
  const m = /^m-([0-9a-f-]{36})$/i.exec(id);
  if (m) {
    const [lead] = await mapLeads(email, m[1]);
    if (!lead) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const sig = lead.signalKeys.includes("no_website") ? { no_website: true } : {};
    return NextResponse.json({
      lead, signalsExplained: lead.signalKeys.map((k) => ({ key: k, label: SIGNALS[k as SignalId].label, why: SIGNALS[k as SignalId].why })),
      tech: {}, allEmails: lead.emails.map((e) => ({ email: e, source: publicEmailSource("maps") })), socials: {}, contact: null,
      provenance: {}, suggestions: suggestFor(sig, await loadProfile(email, null)),
    });
  }
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const [r] = await sql`
    SELECT r.*, u.chat_id, u.finished_at, c.title AS list_name, u.plan->'extraColumns' AS extra_columns,
           d.site_signals->'phones' AS site_phones,
           (SELECT max(score) FROM v2_results x WHERE x.run_id = r.run_id) AS max_score
    FROM v2_results r JOIN v2_runs u ON u.id = r.run_id AND u.user_email = ${email}
    LEFT JOIN chats c ON c.id = u.chat_id LEFT JOIN scrape_domains d ON d.domain = r.domain WHERE r.id = ${id}`;
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const lead = toLead(r, Number(r.max_score ?? 0));
  const sig = (r.signals ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    lead,
    // The combined "no ad pixel" is redundant next to the per-network ones.
    signalsExplained: lead.signalKeys.filter((k) => !(k === "no_ad_pixel" && (lead.signalKeys.includes("no_meta_pixel") || lead.signalKeys.includes("no_google_ads")))).map((k) => ({ key: k, label: SIGNALS[k as SignalId].label, why: SIGNALS[k as SignalId].why })),
    tech: typeof sig.cms === "string" ? { cms: sig.cms } : {},
    // Sources and provenance are translated to neutral codes: the DB keeps the internal ones.
    allEmails: ((r.emails ?? []) as Array<{ email: string; source?: string; person?: unknown }>).map((e) => ({ email: e.email, source: publicEmailSource(e.source), ...(e.person ? { person: e.person } : {}) })),
    socials: r.socials ?? {},
    contact: r.contact ? { name: r.contact.name ?? null, role: r.contact.role ?? null, email: r.contact.email ?? null, linkedin: r.contact.linkedin ?? null } : null,
    provenance: publicProvenance(r.provenance),
    suggestions: suggestFor(sig, await loadProfile(email, r.chat_id as string | null)),
  });
}
