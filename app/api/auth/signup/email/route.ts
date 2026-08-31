import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/ses";
import { generateCode, hashCode, CODE_TTL_MINUTES, PER_EMAIL_CODE_COOLDOWN_SECONDS } from "@/lib/verification-code";
import { isDisposableEmail, DISPOSABLE_EMAIL_MESSAGE } from "@/lib/disposable-email";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });

  // Checked before anything is written or sent: a throwaway signup costs real Places API spend
  // against an account that can never be billed or contacted. `disposable` lets the client show
  // its own treatment rather than a generic form error.
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: DISPOSABLE_EMAIL_MESSAGE, disposable: true }, { status: 400 });
  }

  const [existing] = await sql`SELECT email, password_hash, email_verified FROM user_profiles WHERE email = ${email}`;
  if (existing?.password_hash && existing.email_verified) {
    return NextResponse.json({ error: "an account with this email already exists" }, { status: 409 });
  }

  const [recentCode] = await sql`
    SELECT id FROM email_verifications
    WHERE email = ${email} AND created_at > now() - (${PER_EMAIL_CODE_COOLDOWN_SECONDS} || ' seconds')::interval
    LIMIT 1
  `;
  if (recentCode) return NextResponse.json({ error: "please wait before requesting another code" }, { status: 429 });

  const passwordHash = await hashPassword(password);
  await sql`
    INSERT INTO user_profiles (email, password_hash, email_verified)
    VALUES (${email}, ${passwordHash}, false)
    ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}, updated_at = now()
  `;

  const code = generateCode();
  await sql`
    INSERT INTO email_verifications (email, code_hash, purpose, expires_at)
    VALUES (${email}, ${hashCode(code)}, 'signup', now() + (${CODE_TTL_MINUTES} || ' minutes')::interval)
  `;
  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}
