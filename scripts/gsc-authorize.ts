/**
 * One-time helper to mint the Search Console refresh token.
 *
 * The app's Google OAuth client is only consented for sign-in; reading Search Console needs the
 * webmasters.readonly scope, which requires a browser consent by an account that owns the property.
 * That can't be done headlessly, so this prints the URL and exchanges the code you paste back.
 *
 *   npx tsx scripts/gsc-authorize.ts
 *
 * The client's authorised redirect URIs must include http://localhost:3000/oauth2callback.
 */
import { createInterface } from "readline/promises";
import fs from "node:fs";
import path from "node:path";

const REDIRECT = "http://localhost:3000/oauth2callback";

/**
 * The client id and secret already live in .env.local, and tsx does not load it. This used to
 * require them on the command line, which put real credentials into shell history for a script
 * that is run once -- so they are read from the file when the environment does not carry them.
 */
function loadEnvLocal() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue; // an explicitly exported value still wins
    process.env[key] = raw.trim().replace(/^["'](.*)["']$/, "$1");
  }
}

async function main() {
  loadEnvLocal();
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: id,
      redirect_uri: REDIRECT,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent", // forces a refresh_token even if this client was consented before
    });

  console.log("\n1. Open this URL as the account that owns the Search Console property:\n");
  console.log(url);
  console.log("\n2. Approve, then copy the `code` parameter from the redirected URL.\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("code: ")).trim();
  rl.close();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as { refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.refresh_token) {
    throw new Error(`token exchange failed: ${data.error ?? res.status} ${data.error_description ?? ""}`);
  }

  console.log("\nAdd this as GSC_REFRESH_TOKEN to .env.local and to the App Runner service config:\n");
  console.log(data.refresh_token);
}

main().catch((e) => { console.error(e); process.exit(1); });
