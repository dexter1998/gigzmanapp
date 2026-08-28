import crypto from "crypto";

// The safe hand-off for the phone-OTP auth provider: authorize() in auth.ts must never trust a
// bare client claim of "this phone is verified" directly. POST /api/auth/phone/otp/verify mints
// one of these only right after a real MSG91 verify call succeeds; auth.ts (and
// /api/user/phone/confirm) check the HMAC + expiry before trusting the phone at all. Reuses the
// existing AUTH_SECRET — no new secret needed.
const SECRET = process.env.AUTH_SECRET!;
const TTL_MS = 2 * 60 * 1000;

export function signPhoneToken(phone: string): string {
  const payload = Buffer.from(JSON.stringify({ phone, exp: Date.now() + TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPhoneToken(token: string, expectedPhone: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;

  const { phone, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { phone: string; exp: number };
  return phone === expectedPhone && exp > Date.now();
}
