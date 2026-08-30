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
export const pseoSql =
  global.__pseoSql ?? postgres(process.env.DATABASE_URL!, { max: 3 });

if (process.env.NODE_ENV !== "production") {
  global.__pseoSql = pseoSql;
}
