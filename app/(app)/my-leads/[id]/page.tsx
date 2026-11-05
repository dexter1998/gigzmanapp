import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { maskBusinessName } from "@/lib/mask";
import { formatCategory } from "@/lib/categories";
import { creditCost } from "@/lib/credits/pricing";
import { UnlockLeadButton } from "./UnlockLeadButton";

/**
 * One lead, the page every lead-alert button lands on (lib/email/lead-alert.ts). Before unlocking it
 * shows what the alert showed — masked name, area, rating, whether there's a website — and an
 * Unlock button that spends credits through /api/leads/[id]/unlock; after, the full name, phone,
 * email, address and website.
 *
 * It used to redirect to the leads table, where a lead from an alert never appears (the table lists
 * the user's own searches), so the button every alert leads with went nowhere.
 */
/** wa.me wants the number with country code and no symbols; Indian listings often omit the 91. */
function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^0+/, "");
  return d.length === 10 ? `91${d}` : d;
}

const action: React.CSSProperties = {
  padding: "12px 22px", borderRadius: "var(--radius-pill)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const email = (await auth())?.user?.email;
  if (!email) notFound();

  const [lead] = (await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.phone, l.email, l.rating, l.review_count,
           l.has_website, l.website_url, l.postal_code,
           EXISTS (SELECT 1 FROM unlocks u WHERE u.lead_id = l.id AND u.unlocked_by = ${email}) AS unlocked,
           (SELECT COALESCE(credits, 0) FROM user_profiles WHERE email = ${email}) AS credits
    FROM leads l WHERE l.id = ${id}
  `) as Array<{
    id: string; business_name: string; category: string | null; address: string | null; phone: string | null;
    email: string | null; rating: number | null; review_count: number | null; has_website: boolean | null;
    website_url: string | null; postal_code: string | null; unlocked: boolean; credits: number | null;
  }>;
  if (!lead) notFound();

  const cost = creditCost("lead_unlock");
  const category = formatCategory(lead.category) ?? "Business";
  const city = (lead.address ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(-3, -2)[0] ?? "";
  const rating = lead.rating != null ? `${lead.rating.toFixed(1)}★ from ${lead.review_count ?? 0} reviews` : null;
  const rows: Array<[string, string | null]> = lead.unlocked
    ? [
        ["Business", lead.business_name],
        ["Phone", lead.phone],
        ["Email", lead.email],
        ["Address", lead.address],
        ["Website", lead.website_url ?? (lead.has_website === false ? "No website on Google" : null)],
        ["Google rating", rating],
      ]
    : [
        ["Business", maskBusinessName(lead.business_name)],
        ["Area", [city, lead.postal_code].filter(Boolean).join(", ") || null],
        ["Phone", lead.phone ? "Listed, unlock to see it" : "Not listed"],
        ["Email", lead.email ? "Found, unlock to see it" : "Not found yet"],
        ["Website", lead.has_website === false ? "No website on Google" : lead.has_website ? "Has a website" : null],
        ["Google rating", rating],
      ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}>
      <Link href="/my-leads" style={{ fontSize: 13, color: "var(--g-gray-500)" }}>← All leads</Link>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--g-ink)", margin: "14px 0 6px" }}>
        {lead.unlocked ? lead.business_name : maskBusinessName(lead.business_name)}
      </h1>
      <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 22px" }}>{category}{city ? ` in ${city}` : ""}</p>

      <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "4px 22px" }}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--g-border)" }}>
            <div style={{ width: 120, flex: "0 0 auto", fontSize: 13, color: "var(--g-gray-500)" }}>{k}</div>
            <div style={{ fontSize: 14.5, color: "var(--g-ink)", wordBreak: "break-word" }}>{v}</div>
          </div>
        ))}
      </div>

      {lead.unlocked && lead.phone && (
        // What users do with a lead is message it themselves: 231 WhatsApp-link clicks from 26 users
        // in the first ten days of event data, against zero approved campaigns.
        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <a href={`https://wa.me/${waNumber(lead.phone)}`} target="_blank" rel="noreferrer" style={{ ...action, background: "#1f8f4e" }}>WhatsApp</a>
          <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} style={{ ...action, background: "var(--g-ink)" }}>Call</a>
        </div>
      )}

      {!lead.unlocked && (
        <div style={{ marginTop: 22 }}>
          <UnlockLeadButton leadId={lead.id} cost={cost} credits={Number(lead.credits ?? 0)} />
        </div>
      )}
    </div>
  );
}
