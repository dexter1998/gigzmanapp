import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { toE164India } from "@/lib/phone";

// The "skip verification, keep it unverified" path — saves an unverified phone against the
// already-signed-in account. phone_verified stays false; verification (optional) happens
// separately via /api/auth/phone/otp/send+verify -> /api/user/phone/confirm.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { phone?: string };
  const phone = toE164India(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "a valid 10-digit mobile number is required" }, { status: 400 });

  try {
    await sql`UPDATE user_profiles SET phone = ${phone}, phone_verified = false WHERE email = ${session.user.email}`;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "this number is already linked to another account" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
