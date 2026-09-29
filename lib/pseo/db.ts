import postgres from "postgres";

declare global {
  var __pseoSql: ReturnType<typeof postgres> | undefined;
}

/**
 * A separate, deliberately small connection pool for the public lead pages.
 *
 * The app's own pool (lib/db.ts) is capped at 10 and is shared by every authenticated request and
 * every cron. These pages are statically rendered and revalidated in batches, so without their own
 * pool a revalidation sweep could hold connections the dashboard needs. Three is enough for
 * rendering — pages are cached, so this is only touched at build and revalidation time — and small
 * enough that it can never starve the product.
 *
 * This is also what makes the pSEO section removable: it shares no runtime state with the app.
 */
// Raised from 3. Three was sized on the assumption stated above — "pages are cached, so this is
// only touched at build and revalidation time" — which the group layout's `force-dynamic` had
// quietly made false: every visitor rendered live through these three connections, so concurrent
// visits queued behind each other on top of the per-render cost. The layout now caches for real,
// and eight still leaves the app's own pool of 10 alone while letting a revalidation sweep and the
// four parallel reads in loadPageData() actually overlap.
export const pseoSql =
  global.__pseoSql ?? postgres(process.env.DATABASE_URL!, { max: 8 });

if (process.env.NODE_ENV !== "production") {
  global.__pseoSql = pseoSql;
}
