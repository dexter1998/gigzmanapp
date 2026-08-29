import crypto from "crypto";

// Signed, stateless unsubscribe links: the recipient's address travels inside the token so a
// one-click unsubscribe needs no lookup table and no logged-in session, and the HMAC stops anyone
// unsubscribing an address that wasn't theirs by editing the URL.
//
// Deliberately has NO expiry, unlike the phone token this mirrors. An unsubscribe link has to keep
// working for as long as the email exists in someone's mailbox -- a dead one is worse than useless,
// it turns into a spam complaint instead. Reuses AUTH_SECRET, same as verification-token.
const SECRET = process.env.AUTH_SECRET!;

export type UnsubscribePayload = { email: string; stream: string };

/** `stream` scopes the opt-out; "all" (the default) covers every non-transactional stream. */
export function signUnsubscribeToken(email: string, stream = "all"): string {
  const payload = Buffer.from(JSON.stringify({ email, stream })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readUnsubscribeToken(token: string): UnsubscribePayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as UnsubscribePayload;
    if (!parsed?.email || !parsed?.stream) return null;
    return parsed;
  } catch {
    return null;
  }
}
