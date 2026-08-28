import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/ses";
import { generateCode, hashCode, CODE_TTL_MINUTES, PER_EMAIL_CODE_COOLDOWN_SECONDS } from "@/lib/verification-code";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const [account] = await sql`SELECT email FROM user_profiles WHERE email = ${email} AND password_hash IS NOT NULL`;
  if (!account) return NextResponse.json({ error: "no pending signup for this email" }, { status: 400 });

  const [recentCode] = await sql`
    SELECT id FROM email_verifications
    WHERE email = ${email} AND created_at > now() - (${PER_EMAIL_CODE_COOLDOWN_SECONDS} || ' seconds')::interval
    LIMIT 1
  `;
  if (recentCode) return NextResponse.json({ error: "please wait before requesting another code" }, { status: 429 });

  const code = generateCode();
  await sql`
    INSERT INTO email_verifications (email, code_hash, purpose, expires_at)
    VALUES (${email}, ${hashCode(code)}, 'resend', now() + (${CODE_TTL_MINUTES} || ' minutes')::interval)
  `;
  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}
