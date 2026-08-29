import { sql } from "@/lib/db";

/**
 * Whether `email` has opted out of a given non-transactional stream. Call this before every
 * marketing/lifecycle send -- the List-Unsubscribe header promises the opt-out is honoured, and
 * mailing someone who used it is what turns an unsubscribe into a spam complaint.
 *
 * Never gate transactional mail (sign-in codes, password reset, receipts) on this: those are not
 * what someone unsubscribes from, and withholding them locks people out of their own account.
 */
export async function isUnsubscribed(email: string, stream: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM email_unsubscribes
    WHERE email = ${email} AND stream IN ('all', ${stream})
    LIMIT 1
  `;
  return Boolean(row);
}

/** Batch form for a send run -- one query instead of one per recipient. Returns the addresses to
 *  SKIP, so the caller filters its list down rather than testing each address in a loop. */
export async function suppressedAmong(emails: string[], stream: string): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const rows = (await sql`
    SELECT DISTINCT email FROM email_unsubscribes
    WHERE email = ANY(${emails}) AND stream IN ('all', ${stream})
  `) as Array<{ email: string }>;
  return new Set(rows.map((r) => r.email));
}
