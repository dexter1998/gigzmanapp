import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { verifyPhoneToken } from "@/lib/verification-token";

// Reuses the same signed-token hand-off as the standalone phone login provider (auth.ts) —
// no parallel "trust the client" mechanism.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { phone?: string; verificationToken?: string };
  const phone = body.phone ?? "";
  const token = body.verificationToken ?? "";
  if (!phone || !token || !verifyPhoneToken(token, phone)) {
    return NextResponse.json({ error: "invalid or expired verification" }, { status: 400 });
  }

  await sql`UPDATE user_profiles SET phone = ${phone}, phone_verified = true WHERE email = ${session.user.email}`;
  return NextResponse.json({ ok: true });
}
