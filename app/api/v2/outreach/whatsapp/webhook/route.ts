import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { applyResponse } from "@/lib/v2/outreach/inbox";

/**
 * Meta WhatsApp Cloud API webhook: inbound replies → Inbox (a reply stops that lead's sequence),
 * delivery/read receipts → the send row. Public by design (Meta calls it); authenticated by the
 * verify token on subscribe and the X-Hub-Signature-256 HMAC on every event.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = process.env.V2_WA_VERIFY_TOKEN;
  if (token && sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === token) return new NextResponse(sp.get("hub.challenge") ?? "");
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

type WaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
  messages?: Array<{ id: string; from: string; timestamp: string; type: string; text?: { body: string }; button?: { text: string } }>;
  statuses?: Array<{ id: string; status: string; recipient_id: string }>;
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const want = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const body = JSON.parse(raw) as { entry?: Array<{ changes?: Array<{ value?: WaValue }> }> };
  for (const ch of body.entry?.flatMap((e) => e.changes ?? []) ?? []) {
    const v = ch.value ?? {};
    const [sender] = await sql`SELECT id, user_email FROM v2_senders WHERE channel = 'whatsapp' AND config->>'phoneNumberId' = ${v.metadata?.phone_number_id ?? ""}`;
    if (!sender) continue;
    for (const st of v.statuses ?? []) {
      if (st.status === "read") await sql`UPDATE v2_sends SET opened_at = coalesce(opened_at, now()) WHERE external_id = ${st.id}`;
      if (st.status === "failed") await sql`UPDATE v2_sends SET status = 'failed', status_note = 'WhatsApp reported the message failed' WHERE external_id = ${st.id}`;
    }
    for (const m of v.messages ?? []) {
      const digits = m.from.replace(/\D/g, "").slice(-10);
      const [match] = await sql`
        SELECT s.id, s.campaign_id, s.result_id FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
        WHERE c.user_email = ${sender.user_email} AND s.channel = 'whatsapp' AND s.status = 'sent' AND right(regexp_replace(s.to_address, '\\D', '', 'g'), 10) = ${digits}
        ORDER BY s.sent_at DESC LIMIT 1`;
      if (!match) continue;
      const text = m.text?.body ?? m.button?.text ?? `[${m.type}]`;
      await sql`
        INSERT INTO v2_inbox (user_email, campaign_id, result_id, channel, from_address, from_name, body, received_at, external_id, sender_id, kind, sentiment)
        VALUES (${sender.user_email}, ${match.campaign_id}, ${match.result_id}, 'whatsapp', ${m.from}, ${v.contacts?.[0]?.profile?.name ?? null}, ${text},
                to_timestamp(${Number(m.timestamp)}), ${`wa:${m.id}`}, ${sender.id}, 'reply', ${/\b(stop|unsubscribe)\b/i.test(text) ? "unsubscribe" : null})
        ON CONFLICT (user_email, external_id) DO NOTHING`;
      await applyResponse(sender.user_email, { campaign_id: match.campaign_id, result_id: match.result_id, id: Number(match.id) }, "reply", null);
    }
  }
  return NextResponse.json({ ok: true });
}
