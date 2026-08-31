import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashCode, MAX_VERIFY_ATTEMPTS } from "@/lib/verification-code";
import { hashPassword } from "@/lib/password";

/**
 * Step 2: code + new password. Same verification discipline as verify-email — purpose-scoped
 * row, attempt counter, expiry, consumed-once. A successful reset also marks the email verified:
 * receiving and returning the code IS proof of the mailbox, and leaving a freshly-reset account
 * stuck at "isn't verified yet" would recreate the exact dead end this flow exists to fix.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  const password = body.password ?? "";
  if (!email || !code) return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });

  const [row] = await sql`
    SELECT id, code_hash, attempt_count, expires_at FROM email_verifications
    WHERE email = ${email} AND purpose = 'password_reset' AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!row) return NextResponse.json({ error: "no pending reset code — request a new one" }, { status: 400 });
  if (row.attempt_count >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json({ error: "too many attempts — request a new code" }, { status: 429 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "code has expired — request a new one" }, { status: 400 });
  }
  if (hashCode(code) !== row.code_hash) {
    await sql`UPDATE email_verifications SET attempt_count = attempt_count + 1 WHERE id = ${row.id}`;
    return NextResponse.json({ error: "incorrect code" }, { status: 400 });
  }

  await sql`UPDATE email_verifications SET consumed_at = now() WHERE id = ${row.id}`;
  await sql`
    UPDATE user_profiles
    SET password_hash = ${await hashPassword(password)}, email_verified = true, updated_at = now()
    WHERE email = ${email}
  `;
  return NextResponse.json({ ok: true });
}
