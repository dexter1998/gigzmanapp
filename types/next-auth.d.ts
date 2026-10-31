import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** True only for the V2 demo allowlist — see lib/v2.ts. */
      v2?: boolean;
    } & DefaultSession["user"];
  }
}
