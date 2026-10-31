import postgres from "postgres";

declare global {
  var __listsSql: ReturnType<typeof postgres> | undefined;
}

/**
 * The list pages' own pool, separate from the /leads pages' (lib/pseo/db.ts).
 *
 * 2026-10-24: the website-signal queries behind /leads-for and the tech lists ran long enough on
 * production data to hold all eight pSEO connections, and every /leads city page then queued behind
 * them and timed out. Three connections and a 25 s statement timeout mean a slow list can only ever
 * slow itself — it can no longer starve the rest of the section.
 */
export const listsSql =
  global.__listsSql ?? postgres(process.env.DATABASE_URL!, { max: 3, connection: { statement_timeout: 25_000 } });

if (process.env.NODE_ENV !== "production") global.__listsSql = listsSql;
