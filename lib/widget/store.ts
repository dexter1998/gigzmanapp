import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Server side of the founder widget.
 *
 * The widget renders inside an iframe served from this app, so everything it calls is same-origin
 * and there is no CORS layer here — the embedding site never talks to this API directly, only the
 * iframe does. That also means the Origin header is always our own, so `origins` below is recorded
 * from what the loader reports about its host page. It exists to show the admin where a slug is
 * actually being used, not to authorise anything: the embed snippet is public HTML, so treating it
 * as a secret would be theatre. Rate limits and the per-site block switch are the real controls.
 */

export const MAX_MESSAGE_CHARS = 4000;
export const MAX_NAME_CHARS = 80;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VisitorDetails = { name: string; email: string; countryCode: string; phone: string };

/**
 * Both an email and a phone are required before a conversation can start.
 *
 * Not a form-validation preference — a founder thread with one unreachable channel is a lead that
 * cannot be followed up. Whatever is already known (a signed-in user's email, a stored profile
 * phone) is prefilled by the caller, so this only ever rejects details nobody has.
 */
export function validateDetails(raw: Partial<VisitorDetails>): { ok: true; value: VisitorDetails } | { ok: false; error: string } {
  const name = (raw.name ?? "").trim().slice(0, MAX_NAME_CHARS);
  const email = (raw.email ?? "").trim().toLowerCase();
  const countryCode = (raw.countryCode ?? "").replace(/[^0-9+]/g, "");
  const phone = (raw.phone ?? "").replace(/\D/g, "");

  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!countryCode || countryCode === "+") return { ok: false, error: "Please pick your country code." };
  // Seven is the shortest national number in real use; fifteen is E.164's ceiling. Deliberately
  // loose — a stricter per-country rule would reject real numbers from countries nobody tested.
  if (phone.length < 7 || phone.length > 15) return { ok: false, error: "Please enter a valid mobile number." };

  return { ok: true, value: { name, email, countryCode: countryCode.startsWith("+") ? countryCode : `+${countryCode}`, phone } };
}

/**
 * Records who wrote in, and whether they are a customer or audience.
 *
 * `is_registered_user` is resolved against user_profiles on every contact rather than stored once:
 * somebody who writes in as audience and signs up later should read as a customer the next time
 * the admin opens the thread, with no backfill. Nothing is ever written to user_profiles — an
 * audience member is not a half-account, and inventing one would corrupt every user count and
 * lifecycle segment that reads that table today.
 */
export async function upsertContact(d: VisitorDetails, siteSlug: string) {
  const e164 = `${d.countryCode}${d.phone}`;
  const [row] = await sql`
    INSERT INTO widget_contacts (email, phone, country_code, name, first_site, is_registered_user, user_email)
    VALUES (
      ${d.email}, ${e164}, ${d.countryCode}, ${d.name}, ${siteSlug},
      EXISTS (SELECT 1 FROM user_profiles WHERE email = ${d.email}),
      (SELECT email FROM user_profiles WHERE email = ${d.email})
    )
    ON CONFLICT (email) DO UPDATE SET
      phone = EXCLUDED.phone,
      country_code = EXCLUDED.country_code,
      name = COALESCE(EXCLUDED.name, widget_contacts.name),
      is_registered_user = EXCLUDED.is_registered_user,
      user_email = EXCLUDED.user_email,
      last_seen_at = now()
    RETURNING id
  `;
  return row.id as string;
}

export type WidgetThread = {
  id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  last_sender: string;
  visitor_last_read_at: string | null;
};

export type WidgetMessage = {
  id: string;
  sender: "visitor" | "admin";
  body: string;
  created_at: string;
};

/** A slug is trusted only as an identifier — never interpolated anywhere but a parameter. */
export function normaliseSlug(raw: string | null | undefined): string {
  const slug = (raw ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return slug || "unknown";
}

/**
 * Finds or creates the site row, and records the host origin we were told about.
 *
 * Created on first contact rather than registered ahead of time: the embed is one script tag, and
 * making a new landing page wait on a database row is the kind of setup step that turns into "the
 * widget doesn't work on the new site" three weeks later.
 */
export async function touchSite(slug: string, origin: string | null): Promise<{ blocked: boolean }> {
  const [row] = await sql`
    INSERT INTO widget_sites (slug, name, origins, last_seen_at)
    VALUES (${slug}, ${slug}, ${origin ? sql.array([origin]) : sql.array([])}, now())
    ON CONFLICT (slug) DO UPDATE SET
      last_seen_at = now(),
      -- Appended only when new, so a busy site doesn't grow an array of duplicates.
      origins = CASE
        WHEN ${origin}::text IS NULL OR widget_sites.origins @> ARRAY[${origin}]::text[]
          THEN widget_sites.origins
        ELSE widget_sites.origins || ARRAY[${origin}]::text[]
      END
    RETURNING is_blocked
  `;
  return { blocked: Boolean(row?.is_blocked) };
}

/** Opaque, unguessable, and stored only inside the widget's own frame — see the schema comment. */
export function newVisitorToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Every thread this visitor can see.
 *
 * Two identities, because the widget appears on public pages and inside the dashboard. A signed-in
 * user is matched by email, so their conversations follow them across devices and survive clearing
 * site data. Everyone else is matched by the token their browser is holding.
 */
export async function threadsFor(
  siteSlug: string,
  opts: { userEmail?: string | null; token?: string | null }
): Promise<WidgetThread[]> {
  if (!opts.userEmail && !opts.token) return [];
  const rows = await sql`
    SELECT id, subject, status, last_message_at, last_sender, visitor_last_read_at
      FROM widget_threads
     WHERE site_slug = ${siteSlug}
       AND (
         (${opts.userEmail ?? null}::text IS NOT NULL AND user_email = ${opts.userEmail ?? null})
         OR (${opts.token ?? null}::text IS NOT NULL AND visitor_token = ${opts.token ?? null})
       )
     ORDER BY last_message_at DESC
     LIMIT 20
  `;
  return rows as unknown as WidgetThread[];
}

/** Ownership check for every per-thread call — the id alone is never enough. */
export async function threadOwnedBy(
  threadId: string,
  opts: { userEmail?: string | null; token?: string | null }
) {
  const [row] = await sql`
    SELECT id, site_slug, subject, status, visitor_name, last_sender,
           visitor_last_read_at, admin_last_read_at
      FROM widget_threads
     WHERE id = ${threadId}
       AND (
         (${opts.userEmail ?? null}::text IS NOT NULL AND user_email = ${opts.userEmail ?? null})
         OR (${opts.token ?? null}::text IS NOT NULL AND visitor_token = ${opts.token ?? null})
       )
  `;
  return row ?? null;
}

export async function messagesFor(threadId: string): Promise<WidgetMessage[]> {
  const rows = await sql`
    SELECT id, sender, body, created_at FROM widget_messages
     WHERE thread_id = ${threadId} ORDER BY created_at
  `;
  return rows as unknown as WidgetMessage[];
}

/**
 * Appends a message and moves the thread's clocks in one place.
 *
 * `last_sender` is what the admin inbox sorts "needs a reply" on, and what the notification cron
 * reads to decide who the pending email is even for — keeping it in step with the insert is why
 * this is one function rather than two calls at each site.
 */
export async function appendMessage(threadId: string, sender: "visitor" | "admin", body: string) {
  const [msg] = await sql`
    INSERT INTO widget_messages (thread_id, sender, body)
    VALUES (${threadId}, ${sender}, ${body.slice(0, MAX_MESSAGE_CHARS)})
    RETURNING id, sender, body, created_at
  `;
  await sql`
    UPDATE widget_threads
       SET last_message_at = now(),
           last_sender = ${sender},
           -- Sending is reading: the side that just wrote has by definition seen everything above.
           visitor_last_read_at = CASE WHEN ${sender} = 'visitor' THEN now() ELSE visitor_last_read_at END,
           admin_last_read_at   = CASE WHEN ${sender} = 'admin'   THEN now() ELSE admin_last_read_at END
     WHERE id = ${threadId}
  `;
  return msg as unknown as WidgetMessage;
}

export async function markVisitorRead(threadId: string) {
  await sql`UPDATE widget_threads SET visitor_last_read_at = now() WHERE id = ${threadId}`;
}

/**
 * Crude per-identity flood guard.
 *
 * The embed snippet is public, so anyone can point it at this API. This is not trying to stop a
 * determined attacker — it stops a loop, a bored visitor and a scraped snippet from filling the
 * inbox, which is the realistic failure. The admin's per-site block switch handles the rest.
 */
export async function tooManyRecently(siteSlug: string, key: string, limit: number, minutes: number) {
  const [row] = await sql`
    SELECT count(*)::int AS n FROM widget_messages m
      JOIN widget_threads t ON t.id = m.thread_id
     WHERE t.site_slug = ${siteSlug}
       AND m.sender = 'visitor'
       AND (t.visitor_token = ${key} OR t.visitor_email = ${key})
       AND m.created_at > now() - (${minutes} || ' minutes')::interval
  `;
  return (row?.n ?? 0) >= limit;
}
