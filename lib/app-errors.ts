import { sql } from "@/lib/db";

/**
 * Error rows with user attribution — CloudWatch already has the text, but "which user hit this,
 * on which route, why" needs a queryable row for the admin panel.
 *
 * Best-effort by contract: this is called from inside catch blocks, where the request is already
 * failing — the logger throwing would replace a real error with a logging error.
 */
export async function logAppError(
  route: string,
  err: unknown,
  opts: { userEmail?: string | null; context?: Record<string, unknown> } = {}
) {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    await sql`
      INSERT INTO app_errors (user_email, route, message, stack_head, context)
      VALUES (
        ${opts.userEmail ?? null}, ${route}, ${e.message.slice(0, 500)},
        ${(e.stack ?? "").split("\n").slice(0, 2).join(" | ").slice(0, 300)},
        ${opts.context ? sql.json(JSON.parse(JSON.stringify(opts.context))) : null}
      )
    `;
  } catch (logErr) {
    console.error(`logAppError(${route}) failed:`, logErr);
  }
}
