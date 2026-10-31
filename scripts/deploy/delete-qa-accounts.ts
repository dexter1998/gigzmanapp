/**
 * One-off (2026-10-23): delete the production QA accounts created for the live chat test suite
 * (mail.tm addresses @maxxspace.com, all created 2026-10-23) through the same path an approved
 * deletion request takes — Tarun approved this in chat ("hn krdo"). Run via delete-qa-accounts.sh.
 */
import { sql } from "@/lib/db";
import { createRequest, approveDeletion } from "@/lib/account-deletion";

async function main() {
  const rows = await sql`SELECT email FROM user_profiles WHERE email LIKE '%@maxxspace.com' AND created_at >= '2026-10-22' ORDER BY created_at`;
  console.log(`QA accounts found: ${rows.length}`);
  for (const r of rows) {
    const email = r.email as string;
    const { request } = await createRequest(email, "QA test account (live chat test suite, 2026-10-23)");
    const out = await approveDeletion(request.id, "qa-cleanup@mantisai.in");
    console.log(`deleted ${email.replace(/^(.{3}).*@/, "$1***@")}: ${Object.entries(out.counts).filter(([, n]) => n).map(([t, n]) => `${t}=${n}`).join(" ")}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
