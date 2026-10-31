/**
 * Session-aware side of the V2 gate. Separate from lib/v2.ts because auth.ts imports that one to
 * stamp session.user.v2, and importing @/auth back into it would close an import cycle.
 */

import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { isV2Email } from "@/lib/v2";

/** Server components and route handlers that only need to branch. */
export async function isV2(): Promise<boolean> {
  const session = await auth();
  return isV2Email(session?.user?.email);
}

/**
 * V2-only API routes. Non-V2 callers get 404, not 403 — same reasoning as requireAdmin: a 403
 * confirms there is something here worth denying.
 */
export async function requireV2(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!isV2Email(email)) notFound();
  return email as string;
}
