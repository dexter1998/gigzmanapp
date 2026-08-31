import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import { comparePassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) session.user.email = token.email as string;
      if (token.name) session.user.name = token.name as string;
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
