import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateCode, hashCode, CODE_TTL_MINUTES, PER_EMAIL_CODE_COOLDOWN_SECONDS } from "@/lib/verification-code";
import { sendPasswordResetEmail } from "@/lib/ses";

/**
 * Step 1 of password reset: mail a 6-digit code. Always answers {ok:true} — whether the account
 * exists is not something this endpoint may reveal (the login form already refuses to say which
 * of email/password was wrong, and an enumerable reset form would undo that).
 *
 * Any existing profile qualifies, including Google-only ones: receiving the code proves the
 * mailbox, and setting a first password on a Google account is a legitimate "add password".
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const [profile] = await sql`SELECT email FROM user_profiles WHERE email = ${email}`;
  if (!profile) return NextResponse.json({ ok: true });

  const [recentCode] = await sql`
    SELECT id FROM email_verifications
    WHERE email = ${email} AND created_at > now() - (${PER_EMAIL_CODE_COOLDOWN_SECONDS} || ' seconds')::interval
    LIMIT 1
  `;
  if (recentCode) return NextResponse.json({ ok: true }); // cooldown, same silent answer

  const code = generateCode();
  await sql`
    INSERT INTO email_verifications (email, code_hash, purpose, expires_at)
    VALUES (${email}, ${hashCode(code)}, 'password_reset', now() + (${CODE_TTL_MINUTES} || ' minutes')::interval)
  `;
  await sendPasswordResetEmail(email, code);
  return NextResponse.json({ ok: true });
}
