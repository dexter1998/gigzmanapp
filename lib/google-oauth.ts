/**
 * Google OAuth web clients, primary first: "Mantis Web" on Mantis's own GCP project (MANTIS_GOOGLE_*),
 * then the older Dhando-project client (GOOGLE_CLIENT_*). New sign-ins and new Gmail connections use
 * the primary. A refresh token only works with the client that issued it, so Gmail senders connected
 * before the switch keep refreshing through the old one (see googleAccessToken in outreach/senders).
 * Search Console's GSC_REFRESH_TOKEN was issued to the old client and stays on GOOGLE_CLIENT_*.
 */
export type OAuthClient = { id: string; secret: string };

export function googleOAuthClients(): OAuthClient[] {
  const out: OAuthClient[] = [];
  for (const [id, secret] of [
    [process.env.MANTIS_GOOGLE_CLIENT_ID, process.env.MANTIS_GOOGLE_CLIENT_SECRET],
    [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
  ]) if (id && secret && !out.some((c) => c.id === id)) out.push({ id, secret });
  return out;
}

export const googleOAuthClient = (): OAuthClient | null => googleOAuthClients()[0] ?? null;
