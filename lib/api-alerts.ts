import { sql } from "@/lib/db";

export type ApiProvider = "google_places" | "google_geocoding" | "bedrock" | "ses" | "message_central";

// Best-effort observability, not a critical path — a failure writing the alert itself must
// never break the caller (which is usually already in the middle of handling its own real
// failure). Falls back to console.error so it's still visible in server logs either way.
// Surfaced later by an admin panel reading api_alerts directly; nothing else in the app reads
// this table today.
export async function recordApiFailure(provider: ApiProvider, message: string, context?: Record<string, unknown>) {
  try {
    // context is arbitrary debug data (request params, error bodies, ...) — not worth a strict
    // JSONValue type here, it's a logging path, not something read back and relied on structurally.
    await sql`
      INSERT INTO api_alerts (provider, message, context)
      VALUES (${provider}, ${message}, ${context ? sql.json(JSON.parse(JSON.stringify(context))) : null})
    `;
  } catch (err) {
    console.error(`recordApiFailure(${provider}) failed:`, err);
  }
}
