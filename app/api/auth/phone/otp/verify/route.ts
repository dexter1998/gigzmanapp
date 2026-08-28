import { NextRequest, NextResponse } from "next/server";
import { toE164India } from "@/lib/phone";
import { verifyPhoneOtp } from "@/lib/message-central";
import { signPhoneToken } from "@/lib/verification-token";

// Touches no auth state itself — purely "prove control of this phone right now." The returned
// token is what auth.ts's phone-otp provider (and /api/user/phone/confirm) actually trust; a
// bare { verified: true } from the client is never accepted on its own.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { phone?: string; verificationId?: string; otp?: string };
  const phone = toE164India(body.phone ?? "");
  const verificationId = (body.verificationId ?? "").trim();
  const otp = (body.otp ?? "").trim();
  if (!phone || !verificationId || !otp) {
    return NextResponse.json({ error: "phone, verificationId, and otp are required" }, { status: 400 });
  }

  const ok = await verifyPhoneOtp(phone, verificationId, otp);
  if (!ok) return NextResponse.json({ error: "incorrect or expired code" }, { status: 400 });

  return NextResponse.json({ verificationToken: signPhoneToken(phone), phone });
}
