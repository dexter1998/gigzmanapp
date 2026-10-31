/**
 * The V2 gate.
 *
 * V2 features, signals and UI are being built in the open inside the live app, but only one
 * account is meant to see them: a demo account. So every V2 entry point asks this one question,
 * the same way jobs asks lib/jobs/access.ts.
 *
 * An env allowlist rather than a column, deliberately: V2 is a demonstration, not a plan tier.
 * There is nothing to migrate, nothing to backfill, and turning V2 off is editing V2_EMAILS on
 * App Runner — no deploy, no schema step, and no risk of the jobs trap where the thing that
 * proved access was a value the user could give away.
 *
 * Scope note: this gate is server-side, but V2 component code still ships in the client bundle.
 * It hides the feature, not its existence — so never put a secret behind it.
 */
const V2_EMAILS = (process.env.V2_EMAILS ?? "test@mantisai.in")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * The whole gate. Pure on purpose: auth.ts imports this to stamp the session flag, so anything
 * that reached back into @/auth from here would be an import cycle. The session-aware helpers
 * live in lib/v2-session.ts instead.
 */
export function isV2Email(email: string | null | undefined): boolean {
  // "*" opens V2 to every signed-in account (general launch, 2026-10-23) — still one env edit to close.
  return !!email && (V2_EMAILS.includes("*") || V2_EMAILS.includes(email.toLowerCase()));
}
