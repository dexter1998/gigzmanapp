import { sql } from "@/lib/db";

/** One row per cron execution — the admin panel's "did last night's run happen" answer.
 * Best-effort writes; a bookkeeping failure must not fail the job. */
export async function recordCronRun(
  job: "enrich" | "lifecycle_email" | "pseo",
  startedAt: Date,
  ok: boolean,
  summary?: Record<string, unknown>,
  error?: string
) {
  try {
    await sql`
      INSERT INTO cron_runs (job, started_at, ok, summary, error)
      VALUES (${job}, ${startedAt}, ${ok}, ${summary ? sql.json(JSON.parse(JSON.stringify(summary))) : null}, ${error ?? null})
    `;
  } catch (e) { console.error("recordCronRun failed", e); }
}
