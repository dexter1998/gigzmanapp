import { createHash } from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Account deletion, as a request staff approve.
 *
 * The user files a request from /profile; nothing changes for them while it is pending (they can
 * keep using the app, and cancel). Staff approve or reject it at /admin/deletions. Approval runs
 * approveDeletion() below — every step in ONE transaction, so a failure anywhere rolls the whole
 * thing back rather than leaving half an account behind.
 *
 * The request row is kept after approval: it is the record that the deletion happened, and auth.ts
 * reads it to end any session that was issued before the approval (sessions are JWTs, so there is
 * no session table to delete from — see isSessionRevoked).
 */

export type DeletionStatus = "pending" | "approved" | "rejected" | "cancelled";

export type DeletionRequest = {
  id: string;
  user_email: string;
  reason: string | null;
  status: DeletionStatus;
  requested_at: Date;
  decided_at: Date | null;
  decided_by: string | null;
  note: string | null;
};

const MAX_REASON = 1000;
const MAX_NOTE = 500;

/** What payments / ledger rows keep instead of the email: stable per account (so an accountant can
 *  still group one customer's rows), but not reversible to the address. */
export function anonymisedEmail(email: string): string {
  return `deleted:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}

export async function getPendingRequest(email: string): Promise<DeletionRequest | null> {
  const [row] = await sql<DeletionRequest[]>`
    SELECT * FROM account_deletion_requests WHERE user_email = ${email} AND status = 'pending' LIMIT 1
  `;
  return row ?? null;
}

/** Files a request. Idempotent: a second call while one is pending returns the existing one
 *  (the partial unique index enforces one-per-account even under a double click). */
export async function createRequest(email: string, reason: string | null): Promise<{ request: DeletionRequest; created: boolean }> {
  const clean = (reason ?? "").trim().slice(0, MAX_REASON) || null;
  const [row] = await sql<DeletionRequest[]>`
    INSERT INTO account_deletion_requests (user_email, reason)
    VALUES (${email}, ${clean})
    ON CONFLICT (user_email) WHERE status = 'pending' DO NOTHING
    RETURNING *
  `;
  if (row) return { request: row, created: true };
  const existing = await getPendingRequest(email);
  if (!existing) throw new Error("deletion request insert raced and vanished");
  return { request: existing, created: false };
}

export async function cancelRequest(email: string): Promise<boolean> {
  const rows = await sql`
    UPDATE account_deletion_requests
       SET status = 'cancelled', decided_at = now(), decided_by = ${email}
     WHERE user_email = ${email} AND status = 'pending'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function rejectRequest(id: string, by: string, note: string | null): Promise<DeletionRequest | null> {
  const [row] = await sql<DeletionRequest[]>`
    UPDATE account_deletion_requests
       SET status = 'rejected', decided_at = now(), decided_by = ${by}, note = ${(note ?? "").trim().slice(0, MAX_NOTE) || null}
     WHERE id = ${id} AND status = 'pending'
    RETURNING *
  `;
  return row ?? null;
}

/**
 * True when this token's account was deleted after the token was issued. auth.ts calls this from
 * the jwt callback and drops the session when it is true.
 *
 * `iat` comparison rather than "any approved request for this email": someone whose account was
 * deleted may sign up again later with the same address, and that new session must not be killed
 * by the old request.
 */
export async function isSessionRevoked(email: string, issuedAtSec: number | undefined): Promise<boolean> {
  const issued = typeof issuedAtSec === "number" ? issuedAtSec : 0;
  const rows = await sql`
    SELECT 1 FROM account_deletion_requests
     WHERE user_email = ${email} AND status = 'approved' AND decided_at > to_timestamp(${issued})
     LIMIT 1
  `;
  return rows.length > 0;
}

/* ------------------------------------------------------------------------------------------------
 * The deletion plan.
 *
 * Every column in the database that can hold a user's identity must be listed in exactly one of
 * the four groups below. approveDeletion() reads information_schema first and REFUSES TO RUN if it
 * finds a candidate column (see IDENTITY_COLUMN_NAMES) that is not classified — a new table with a
 * user_email column must be added here deliberately, never silently left behind.
 *
 * Order matters for the deletes: children before parents where the FK is NO ACTION.
 * ------------------------------------------------------------------------------------------------ */

/** Column names that might hold a user's email. The schema guard scans for these. */
const IDENTITY_COLUMN_NAMES = [
  "user_email", "email", "unlocked_by", "requested_by", "claimed_by", "visitor_email", "work_email", "recipient",
];

/** DELETED: rows owned by the user. (table.column that ties the row to them) */
const DELETED = [
  "chat_messages (via chats.user_email)",
  "signal_outcomes (via v2_campaigns.user_email)",
  "v2_inbox.user_email",
  "v2_campaigns.user_email",          // cascades v2_campaign_messages, v2_sends
  "v2_runs.user_email",               // cascades v2_results, v2_run_steps
  "chats.user_email",                 // cascades v2_chat_state (+ any remaining v2_runs)
  "v2_business_profiles.user_email",
  "v2_media.user_email",
  "v2_outcomes.user_email",
  "v2_senders.user_email",            // connected mailboxes / channels incl. stored tokens
  "v2_templates.user_email",
  "v2_turn_log.user_email",
  "v2_voice_tests.user_email",
  "icps.user_email",
  "popup_seen.user_email",
  "nav_seen.user_email",              // sidebar badge "last seen" marks
  "unresolved_phrases.user_email",
  "stickly_users.user_email",
  "unlocks.unlocked_by",              // the user's unlocked leads list (leads themselves are shared)
  "job_applications.user_email",
  "applicant_profiles.user_email",
  "agency_profiles.email", "agency_profiles.work_email",
  "freelancer_profiles.email", "freelancer_profiles.work_email",
  "email_verifications.email",
  "phone_otp_sends (via user_profiles.phone)",
  "contact_messages.user_email", "contact_messages.email",
  "partner_applications.user_email", "partner_applications.email",
  "widget_threads.user_email", "widget_threads.visitor_email", // cascades widget_messages
  "widget_contacts.user_email", "widget_contacts.email",
  "user_profiles.email",              // last: the account itself (credits are forfeited with it)
] as const;

/** ANONYMISED: kept for accounting / tax / audit, email replaced by anonymisedEmail(). */
const ANONYMISED = [
  "payments.user_email",              // + raw gateway payload scrubbed of the email and customer_details
  "credit_ledger.user_email",
  "plan_grants.user_email",
  "app_errors.user_email",
  "area_scans.requested_by",          // the scan + its leads are a shared cache other users read
] as const;

/** RELEASED: shared resources the user had claimed, handed back to the pool. */
const RELEASED = [
  "v2_sender_pool.claimed_by",
] as const;

/** KEPT on purpose — not the user's data, or must survive the deletion. */
const KEPT = [
  "account_deletion_requests.user_email", // the record of this deletion; auth.ts reads it
  "email_unsubscribes.email",             // suppression must outlive the account or we could mail them again
  "email_sends.recipient",                // send log tied to SES events; same reason as suppression
  "email_events.recipient",
  "campaign_recipients.email",            // staff outreach lists (prospects), not account data
  "leads.email",                          // public business contact data, shared across users
  "scrape_emails.email",                  // scraped public data
  "lead_finds.user_email",                // a VIEW over unlocks + v2_runs: its rows go with those tables
] as const;

function columnsOf(list: readonly string[]): Set<string> {
  // Entries like "chat_messages (via chats.user_email)" describe an indirect key and don't map to
  // a column of their own, so only plain "table.column" entries count for the schema guard.
  return new Set(list.filter((s) => /^[a-z0-9_]+\.[a-z0-9_]+$/.test(s)));
}
const CLASSIFIED = new Set([...columnsOf(DELETED), ...columnsOf(ANONYMISED), ...columnsOf(RELEASED), ...columnsOf(KEPT)]);

export const DELETION_PLAN = { DELETED, ANONYMISED, RELEASED, KEPT };

export type DeletionSummary = { email: string; anonymisedAs: string; counts: Record<string, number> };

/**
 * Approves a pending request and deletes the account. One transaction; any error rolls everything
 * back (including the status change) and is rethrown to the caller.
 */
export async function approveDeletion(id: string, by: string): Promise<DeletionSummary> {
  // Schema guard, before touching anything.
  const cols = await sql<{ t: string; c: string }[]>`
    SELECT table_name AS t, column_name AS c FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = ANY(${IDENTITY_COLUMN_NAMES})
  `;
  const unclassified = cols.map((r) => `${r.t}.${r.c}`).filter((k) => !CLASSIFIED.has(k));
  if (unclassified.length) {
    throw new Error(`Refusing to delete: unclassified identity columns ${unclassified.join(", ")} — add them to lib/account-deletion.ts`);
  }
  const present = new Set(cols.map((r) => r.t));

  const result = await sql.begin(async (tx) => {
    // Lock the request row so two admins clicking Approve can't both run this.
    const [req] = await tx<DeletionRequest[]>`
      SELECT * FROM account_deletion_requests WHERE id = ${id} FOR UPDATE
    `;
    if (!req) throw new Error("deletion request not found");
    if (req.status !== "pending") throw new Error(`deletion request is ${req.status}, not pending`);
    const email = req.user_email;
    const anon = anonymisedEmail(email);
    const counts: Record<string, number> = {};
    const run = async (label: string, q: PromiseLike<ArrayLike<unknown>>) => { counts[label] = (await q).length; };

    // A table that doesn't exist in this environment (e.g. a migration not applied locally) is
    // skipped; the guard above already proved nothing unclassified exists.
    const has = (t: string) => present.has(t);

    const [profile] = await tx<{ phone: string | null }[]>`SELECT phone FROM user_profiles WHERE email = ${email}`;

    // ---- DELETE (children first) ----
    await run("chat_messages", tx`DELETE FROM chat_messages WHERE chat_id IN (SELECT id FROM chats WHERE user_email = ${email}) RETURNING 1`);
    await run("signal_outcomes", tx`DELETE FROM signal_outcomes WHERE campaign_id IN (SELECT id FROM v2_campaigns WHERE user_email = ${email}) RETURNING 1`);
    for (const t of ["v2_inbox", "v2_campaigns", "v2_runs", "chats", "v2_business_profiles", "v2_media", "v2_outcomes",
      "v2_senders", "v2_templates", "v2_turn_log", "v2_voice_tests", "icps", "popup_seen", "nav_seen", "unresolved_phrases",
      "stickly_users", "job_applications", "applicant_profiles"] as const) {
      if (has(t)) await run(t, tx`DELETE FROM ${tx(t)} WHERE user_email = ${email} RETURNING 1`);
    }
    await run("unlocks", tx`DELETE FROM unlocks WHERE unlocked_by = ${email} RETURNING 1`);
    for (const t of ["agency_profiles", "freelancer_profiles"] as const) {
      if (has(t)) await run(t, tx`DELETE FROM ${tx(t)} WHERE email = ${email} OR work_email = ${email} RETURNING 1`);
    }
    await run("email_verifications", tx`DELETE FROM email_verifications WHERE email = ${email} RETURNING 1`);
    if (profile?.phone) await run("phone_otp_sends", tx`DELETE FROM phone_otp_sends WHERE phone = ${profile.phone} RETURNING 1`);
    for (const t of ["contact_messages", "partner_applications"] as const) {
      if (has(t)) await run(t, tx`DELETE FROM ${tx(t)} WHERE user_email = ${email} OR email = ${email} RETURNING 1`);
    }
    if (has("widget_threads")) {
      await run("widget_threads", tx`
        DELETE FROM widget_threads
         WHERE user_email = ${email} OR visitor_email = ${email}
            OR contact_id IN (SELECT id FROM widget_contacts WHERE user_email = ${email} OR email = ${email})
        RETURNING 1`);
      await run("widget_contacts", tx`DELETE FROM widget_contacts WHERE user_email = ${email} OR email = ${email} RETURNING 1`);
    }

    // ---- ANONYMISE ----
    // The gateway payload can carry the email (and phone) in customer_details; scrub both.
    await run("payments", tx`
      UPDATE payments
         SET user_email = ${anon},
             raw = CASE WHEN raw IS NULL THEN NULL
                        ELSE (replace(raw::text, ${email}, ${anon})::jsonb) #- '{data,customer_details}' #- '{customer_details}' END
       WHERE user_email = ${email} RETURNING 1`);
    await run("credit_ledger", tx`UPDATE credit_ledger SET user_email = ${anon} WHERE user_email = ${email} RETURNING 1`);
    await run("plan_grants", tx`UPDATE plan_grants SET user_email = ${anon} WHERE user_email = ${email} RETURNING 1`);
    await run("app_errors", tx`UPDATE app_errors SET user_email = ${anon} WHERE user_email = ${email} RETURNING 1`);
    await run("area_scans", tx`UPDATE area_scans SET requested_by = ${anon} WHERE requested_by = ${email} RETURNING 1`);

    // ---- RELEASE ----
    if (has("v2_sender_pool")) await run("v2_sender_pool", tx`UPDATE v2_sender_pool SET claimed_by = NULL WHERE claimed_by = ${email} RETURNING 1`);

    // ---- the account itself ----
    await run("user_profiles", tx`DELETE FROM user_profiles WHERE email = ${email} RETURNING 1`);

    // ---- verify: nothing classified DELETED/ANONYMISED/RELEASED still names the email ----
    for (const key of [...columnsOf(DELETED), ...columnsOf(ANONYMISED), ...columnsOf(RELEASED)]) {
      const [t, c] = key.split(".");
      if (!has(t)) continue;
      const [left] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM ${tx(t)} WHERE ${tx(c)} = ${email}`;
      if (left.n > 0) throw new Error(`deletion incomplete: ${left.n} row(s) left in ${key}`);
    }

    await tx`
      UPDATE account_deletion_requests
         SET status = 'approved', decided_at = now(), decided_by = ${by},
             note = ${`deleted: ${Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(", ") || "no rows"}`}
       WHERE id = ${id}`;

    return { email, anonymisedAs: anon, counts };
  });
  return result as DeletionSummary;
}

/** What the admin list shows next to each request. */
export async function accountStats(email: string): Promise<{ exists: boolean; credits: number; plan: string | null; leads: number; campaigns: number; chats: number }> {
  const [row] = await sql<{ exists: boolean; credits: number | null; plan: string | null; leads: number; campaigns: number; chats: number }[]>`
    SELECT EXISTS (SELECT 1 FROM user_profiles WHERE email = ${email}) AS exists,
           (SELECT credits FROM user_profiles WHERE email = ${email}) AS credits,
           (SELECT plan FROM user_profiles WHERE email = ${email}) AS plan,
           (SELECT count(*)::int FROM unlocks WHERE unlocked_by = ${email}) AS leads,
           (SELECT count(*)::int FROM v2_campaigns WHERE user_email = ${email}) AS campaigns,
           (SELECT count(*)::int FROM chats WHERE user_email = ${email}) AS chats
  `;
  return { exists: row.exists, credits: row.credits ?? 0, plan: row.plan, leads: row.leads, campaigns: row.campaigns, chats: row.chats };
}
