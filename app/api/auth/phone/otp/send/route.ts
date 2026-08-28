import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { toE164India } from "@/lib/phone";
import { sendPhoneOtp } from "@/lib/message-central";
import { PER_PHONE_OTP_COOLDOWN_SECONDS } from "@/lib/verification-code";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { phone?: string };
  const phone = toE164India(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "a valid 10-digit mobile number is required" }, { status: 400 });

  const [recentSend] = await sql`
    SELECT id FROM phone_otp_sends
    WHERE phone = ${phone} AND created_at > now() - (${PER_PHONE_OTP_COOLDOWN_SECONDS} || ' seconds')::interval
    LIMIT 1
  `;
  if (recentSend) return NextResponse.json({ error: "please wait before requesting another code" }, { status: 429 });

  const { verificationId } = await sendPhoneOtp(phone);
  await sql`INSERT INTO phone_otp_sends (phone) VALUES (${phone})`;

  return NextResponse.json({ ok: true, phone, verificationId });
}
