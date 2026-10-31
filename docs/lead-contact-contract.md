# Leads: contact tiers, phone kinds, extra columns (contract, 2026-10-23)

Additions to `LmsLead` (lib/v2/lms.ts) and the leads list API. Existing fields stay as they are.

```ts
type EmailTier = 1 | 2 | 3;
// 1 = a named person / decision maker (rahul@, rahul.sharma@, founder's own address)
// 2 = role inbox that reaches a business decision (sales@, business@, owner@, director@, hello@ on a small business, contact@ when it's the only one)
// 3 = generic / support / unlikely to reach a buyer (support@, care@, help@, noreply@, info@ on a large org, careers@, hr@, jobs@, accounts@, billing@, admin@, webmaster@)
type LeadEmail = { email: string; tier: EmailTier; kind: "person" | "role" | "generic" };
type PhoneKind = "mobile" | "landline" | "tollfree" | "unknown";
type LeadPhone = { number: string; e164: string | null; kind: PhoneKind }; // India: mobile = 10 digits starting 6-9; landline = STD code; 1800/1860 = tollfree

LmsLead += {
  emailList: LeadEmail[];          // sorted tier 1 → 3, de-duplicated; `emails` (string[]) keeps the same order
  phones: LeadPhone[];             // all known numbers, mobile first
  whatsapp: string | null;         // e164 of the best mobile (only mobiles), else null
  extras: Record<string, string>;  // extra column values by key (see columns)
}

listLeads(...) also returns
  columns: Array<{ key: string; label: string }>;  // the extra columns for this list/run, in display order
```

Extra columns ("Origami-style" enrichment): for each run the planner picks 4–8 attributes that matter for the user's ICP/offer (e.g. "Founder", "Team size", "Services", "Year founded", "Branches", "Funding", "Tech stack", "Instagram followers", "Price range", "Hiring for"), stored on the run plan as `extraColumns: [{key,label,hint}]`. During qualification the site read + facts are summarised into those keys per lead, stored in `v2_results.extras` (JSONB `{key: value}`), short values (< 80 chars), empty when unknown — never invented.

UI (leads table): action icons per row — mail (mailto with a short prefilled subject/body), call (tel:, mobile preferred), WhatsApp (wa.me/<e164>?text=short message) — enabled only when that contact exists; tier badge on emails; landline/toll-free tag on phones; extra columns appended after existing ones, table scrolls horizontally.

Seller context for the prefilled message comes from the user's seller profile / campaign sending-as profile: returned by the leads API as `pitch: { senderName, company, offer } | null`.
