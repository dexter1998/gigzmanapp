import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import {
  appendMessage, newVisitorToken, normaliseSlug, tooManyRecently, touchSite,
  upsertContact, validateDetails, MAX_MESSAGE_CHARS,
} from "@/lib/widget/store";

/** A new conversation: the visitor's details, plus the first thing they wanted to say. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    site?: string; origin?: string; name?: string; email?: string;
    countryCode?: string; phone?: string; message?: string;
  };

  const slug = normaliseSlug(body.site);
  const { blocked } = await touchSite(slug, body.origin ?? null);
  if (blocked) return NextResponse.json({ error: "unavailable" }, { status: 403 });

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const session = await auth();
  const userEmail = session?.user?.email ?? null;

  const details = validateDetails(body);
  if (!details.ok) return NextResponse.json({ error: details.error }, { status: 400 });

  // Flood guard keyed on the email rather than an IP: the widget sits behind App Runner, so every
  // request arrives from the same handful of addresses and an IP limit would throttle real people
  // in the same office. Three new conversations an hour from one address is already generous for
  // someone trying to reach a founder.
  if (await tooManyRecently(slug, details.value.email, 3, 60)) {
    return NextResponse.json({ error: "You've sent a few messages already — I'll reply to those first." }, { status: 429 });
  }

  const contactId = await upsertContact(details.value, slug);
  const visitorToken = newVisitorToken();

  const [thread] = await sql`
    INSERT INTO widget_threads (
      site_slug, user_email, contact_id, visitor_name, visitor_email, visitor_phone,
      subject, visitor_token, last_sender, visitor_last_read_at
    ) VALUES (
      ${slug}, ${userEmail}, ${contactId}, ${details.value.name}, ${details.value.email},
      ${`${details.value.countryCode}${details.value.phone}`},
      -- The inbox list needs a one-line handle for the thread, and the first message is the most
      -- honest one available — a "subject" field would just be another thing to leave blank.
      ${message.slice(0, 80)}, ${visitorToken}, 'visitor', now()
    )
    RETURNING id
  `;

  await sql`
    UPDATE widget_contacts SET thread_count = thread_count + 1, last_seen_at = now()
    WHERE id = ${contactId}
  `;
  await sql`UPDATE widget_sites SET thread_count = thread_count + 1 WHERE slug = ${slug}`;

  const first = await appendMessage(thread.id as string, "visitor", message.slice(0, MAX_MESSAGE_CHARS));

  return NextResponse.json({ threadId: thread.id, token: visitorToken, message: first });
}
