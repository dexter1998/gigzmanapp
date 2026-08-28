import crypto from "crypto";

export const generateCode = () => crypto.randomInt(100000, 999999).toString();
export const hashCode = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

// Mirrors PER_AREA_COOLDOWN_SECONDS in app/api/leads/find/route.ts — same reasoning: a costly
// external call (SES send / MSG91 send) throttled per-identity via a DB-row-timestamp check.
export const PER_EMAIL_CODE_COOLDOWN_SECONDS = 60;
export const PER_PHONE_OTP_COOLDOWN_SECONDS = 60;
export const CODE_TTL_MINUTES = 10;
export const MAX_VERIFY_ATTEMPTS = 5;
