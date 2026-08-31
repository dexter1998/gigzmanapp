import { DISPOSABLE_DOMAINS } from "@/lib/disposable-domains";

/**
 * Whether an address belongs to a throwaway mailbox.
 *
 * Why this exists: a temp-mail signup burned 122 area scans and 3 unlocks on the free allowance,
 * which is real Places API spend against an account that can never be contacted, billed, or
 * emailed. Verification does not stop it — a disposable inbox receives the code perfectly well.
 *
 * Two layers, because either alone fails:
 *  - the bundled snapshot, which covers the thousands of known services, and
 *  - a heuristic, because the domain that prompted this (tempumail.cv) was not in that snapshot
 *    and new ones appear faster than any list is updated.
 *
 * ALLOWED_EMAIL_DOMAINS is the escape hatch: if a real customer is ever caught, add their domain
 * there rather than weakening the rule for everyone.
 */

const ALLOWLIST = new Set(
  (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean)
);

/** Words that only appear in a throwaway service's name. Deliberately narrow — see the pairing
 *  rule below, which is what keeps "templeton.com" and "mailchimp.com" out of trouble. */
const THROWAWAY_WORDS = [
  "temp", "tmp", "trash", "throw", "dispos", "burner", "fake", "junk", "spam",
  "guerrilla", "mailinator", "yopmail", "10minute", "tenminute", "minutemail",
  "dropmail", "getnada", "maildrop", "sharklasers", "moakt", "mohmal", "emailfake",
  "grr", "tempr", "fakeinbox", "spamgourmet", "mytemp", "onetime", "self-destruct",
];

/** A throwaway word on its own is not enough: "templeton" is a surname, "mailchimp" is a business.
 *  The signal is a throwaway word AND a mailbox word in the same label. */
const MAILBOX_WORDS = ["mail", "inbox", "box", "letter"];

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  if (ALLOWLIST.has(domain)) return false;

  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Subdomains of a listed service (mail.tempmail.com) count as the service itself.
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }

  const sld = parts.length >= 2 ? parts[parts.length - 2] : domain;
  const hasThrowaway = THROWAWAY_WORDS.some((w) => sld.includes(w));
  const hasMailbox = MAILBOX_WORDS.some((w) => sld.includes(w));
  return hasThrowaway && hasMailbox;
}

/** What the user is told. Deliberately blunt and a little smug — a throwaway signup is a
 *  deliberate act, not a mistake, so a polite "please use a valid email" reads as a puzzle to
 *  solve rather than a wall. */
export const DISPOSABLE_EMAIL_MESSAGE =
  "Don't be smart — temp mail won't work here. Use a real email, or your IP gets to sit in timeout.";
