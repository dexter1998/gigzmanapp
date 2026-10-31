import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import { comparePassword } from "@/lib/password";
import { isDisposableEmail } from "@/lib/disposable-email";
import { isV2Email } from "@/lib/v2";
import { isSessionRevoked } from "@/lib/account-deletion";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // "Mantis Web" client (Mantis's own GCP project) first; the Dhando-project client is the fallback.
      clientId: process.env.MANTIS_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.MANTIS_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      id: "email-password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [row] = await sql`
          SELECT email, password_hash, name, email_verified FROM user_profiles WHERE email = ${email}
        `;
        if (!row?.password_hash) return null; // no such account, or a Google-only account
        if (!row.email_verified) return null; // must verify before first sign-in
        if (!(await comparePassword(password, row.password_hash))) return null;
        return { email: row.email as string, name: (row.name as string | null) ?? undefined };
      },
    }),
  ],

  // Google already carries email/name through implicitly; Credentials providers don't unless
  // explicitly threaded through jwt -> session here.
  callbacks: {
    // Google Workspace can be run on any custom domain, including a throwaway one, so the same
    // rule that guards the signup form guards this door too. Returning false sends the user back
    // to /login with an error rather than creating the account.
    async signIn({ user }) {
      return !(user.email && isDisposableEmail(user.email));
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        if (user.name) token.name = user.name;
        return token;
      }
      // Sessions are JWTs, so a deleted account has no session row to revoke. Instead every
      // existing token is checked against approved deletion requests: one issued before the
      // approval is dropped (returning null signs the browser out). Fails open on a DB error —
      // a blip must not sign everyone out — which is acceptable because the account's data is
      // already gone and any page that needs the profile finds nothing.
      if (token.email) {
        const revoked = await isSessionRevoked(token.email as string, token.iat as number | undefined).catch(() => false);
        if (revoked) return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
      // The V2 flag rides on the session so client components can branch without a fetch of their
      // own. Derived from env on every call, never stored in the token: flipping V2_EMAILS must
      // take effect on the next request, not whenever a stale JWT happens to be reissued.
      session.user.v2 = isV2Email(token.email as string | undefined);
      // last_seen_at, throttled through the token: at most one write per ~6h per user, because
      // this callback fires on every request and an unthrottled version would turn each page
      // load into a database write. Best-effort — presence tracking must never block a session.
      const now = Date.now();
      const last = typeof token.lastSeenWrite === "number" ? token.lastSeenWrite : 0;
      if (token.email && now - last > 6 * 60 * 60 * 1000) {
        token.lastSeenWrite = now;
        sql`UPDATE user_profiles SET last_seen_at = now() WHERE email = ${token.email as string}`
          .catch(() => {});
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});
