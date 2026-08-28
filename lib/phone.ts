// India-only normalization (this app's whole user base today) — best-effort, not a general
// libphonenumber replacement. Returns digits only, no leading "+", matching what MSG91's API and
// the E.164-without-plus format stored in user_profiles.phone/phone_otp_sends.phone expect.
export function toE164India(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}
