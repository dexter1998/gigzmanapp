import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __gigzmanSql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__gigzmanSql ??
  postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  global.__gigzmanSql = sql;
}
