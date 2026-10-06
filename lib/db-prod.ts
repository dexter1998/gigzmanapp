import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Points this process at the private gigzman-prod RDS, through the SSM tunnel that
 * `scripts/prod-tunnel.sh` opens on 127.0.0.1:5433.
 *
 * The secret is read in-process and `DATABASE_URL` is set on `process.env` here, so the password
 * never reaches a shell environment, argv, or a printed connection string — a psql crash once put
 * one, password included, into a service log.
 *
 * `lib/db` builds its pool at import time from `DATABASE_URL`, so every module that reaches the
 * database — including `lib/email/send-bulk`, which records each send — has to be imported
 * *after* this resolves. Callers use a dynamic `await import()`, not a top-level one.
 */
const TUNNEL_HOST = "127.0.0.1";
const TUNNEL_PORT = 5433;
const SECRET_ID = "gigzman/database-url";

export async function useProdDb(): Promise<{ host: string; database: string; user: string }> {
  // The CLI, not the SDK: @aws-sdk/client-secrets-manager is not a dependency here. The secret
  // arrives on this child process's stdout and stays in memory — it is never printed or passed
  // as an argument.
  const { stdout } = await run("aws", [
    "secretsmanager", "get-secret-value",
    "--secret-id", SECRET_ID,
    "--query", "SecretString",
    "--output", "text",
  ], { env: process.env });
  const secret = stdout.trim();
  if (!secret) throw new Error(`secret ${SECRET_ID} is empty`);

  const u = new URL(secret);
  const database = u.pathname.replace(/^\//, "");
  const realHost = u.hostname;
  u.hostname = TUNNEL_HOST;
  u.port = String(TUNNEL_PORT);
  // require, not verify-full: through the tunnel RDS's cert arrives under a localhost hostname.
  u.search = "?sslmode=require";
  process.env.DATABASE_URL = u.toString();

  return { host: realHost, database, user: decodeURIComponent(u.username) };
}
