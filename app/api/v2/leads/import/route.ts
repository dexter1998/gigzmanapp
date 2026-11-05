import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { isV2Email } from "@/lib/v2";
import { trackEvent } from "@/lib/events";

/**
 * Import a list from the user's own CSV / XLSX (Tarun, 2026-11-03: "jaki apni list pr bhi log campaign
 * chla ske"). The browser parses the file and maps the columns; this saves the rows as a list exactly
 * like a chat's: a chat named after the list, one finished run, and a v2_results row per lead — so the
 * list shows in Leads and every campaign path (planner, test, approve, calls) works on it unchanged.
 * Free: these are the user's own contacts, nothing is looked up.
 */
const MAX_IMPORT_ROWS = 5000;

type Row = { name?: unknown; phone?: unknown; email?: unknown; website?: unknown; category?: unknown; area?: unknown; person?: unknown; role?: unknown };

const str = (v: unknown, n: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, n) : "");
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** Indian numbers to +91…, anything else with a country code kept; junk dropped. */
function phoneOf(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(d)) return d;
  const digits = d.replace(/\D/g, "").replace(/^0+/, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return digits.length >= 8 ? raw.trim() : null;
}

function siteOf(raw: string): { website: string; domain: string } | null {
  const s = raw.trim();
  if (!s || /\s/.test(s) || !/\.[a-z]{2,}/i.test(s)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return { website: u.toString(), domain: u.hostname.replace(/^www\./, "").toLowerCase() };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { name?: unknown; rows?: unknown };
  const listName = str(b.name, 80);
  if (!listName) return NextResponse.json({ error: "Give the list a name." }, { status: 400 });
  if (!Array.isArray(b.rows) || !b.rows.length) return NextResponse.json({ error: "The file has no rows to import." }, { status: 400 });
  if (b.rows.length > MAX_IMPORT_ROWS) return NextResponse.json({ error: `Up to ${MAX_IMPORT_ROWS.toLocaleString("en-IN")} rows per import.` }, { status: 400 });

  // A row needs a name and a way to reach it; everything else is optional.
  const rows = (b.rows as Row[]).map((r) => {
    const mail = str(r.email, 200).toLowerCase();
    return {
      name: str(r.name, 200), phone: phoneOf(str(r.phone, 40)), email: EMAIL.test(mail) ? mail : null, site: siteOf(str(r.website, 300)),
      category: str(r.category, 80) || null, area: str(r.area, 120) || null, person: str(r.person, 120) || null, role: str(r.role, 80) || null,
    };
  }).filter((r) => r.name && (r.phone || r.email));
  if (!rows.length) return NextResponse.json({ error: "No row has a name plus a phone or an email — check the column mapping." }, { status: 400 });

  const result = await sql.begin(async (tx) => {
    const [chat] = await tx`INSERT INTO chats (user_email, title) VALUES (${email}, ${listName}) RETURNING id`;
    const plan = { title: listName, source: "import", trades: [], areaText: "", target: rows.length, needContacts: false, mustHave: [], playbookIds: [], steps: [] };
    const [run] = await tx`
      INSERT INTO v2_runs (chat_id, user_email, kind, plan, status, target, delivered, est_credits, started_at, finished_at)
      VALUES (${chat.id}, ${email}, 'import', ${tx.json(plan)}, 'done', ${rows.length}, ${rows.length}, 0, now(), now()) RETURNING id`;
    const values = rows.map((r, i) => ({
      run_id: run.id as string, name: r.name, category: r.category, area: r.area, website: r.site?.website ?? null, domain: r.site?.domain ?? null, phone: r.phone,
      emails: tx.json(r.email ? [{ email: r.email, source: "import", ...(r.person ? { person: r.person } : {}) }] : []),
      contact: r.person ? tx.json({ name: r.person, role: r.role, email: r.email, tier: "import" }) : null,
      provenance: tx.json({ source: "import" }), rank: i + 1,
    }));
    for (let i = 0; i < values.length; i += 500) await tx`INSERT INTO v2_results ${tx(values.slice(i, i + 500))}`;
    return { chatId: chat.id as string, count: rows.length };
  });
  trackEvent(email, "leads.import", { rows: result.count, dropped: b.rows.length - result.count });
  return NextResponse.json({ ...result, dropped: (b.rows as unknown[]).length - result.count });
}
