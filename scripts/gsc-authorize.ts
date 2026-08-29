/**
 * One-time helper to mint the Search Console refresh token.
 *
 * The app's Google OAuth client is only consented for sign-in; reading Search Console needs the
 * webmasters.readonly scope, which requires a browser consent by an account that owns the property.
 * That can't be done headlessly, so this prints the URL and exchanges the code you paste back.
 *
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npx tsx scripts/gsc-authorize.ts
 *
 * The client's authorised redirect URIs must include http://localhost:3000/oauth2callback.
 */
import { createInterface } from "readline/promises";

const REDIRECT = "http://localhost:3000/oauth2callback";

async function main() {
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

  console.log("\nAdd this to Vercel as GSC_REFRESH_TOKEN (production):\n");
  console.log(data.refresh_token);
}

main().catch((e) => { console.error(e); process.exit(1); });
