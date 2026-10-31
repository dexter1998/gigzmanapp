import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";

/** V2 outreach routes: the signed-in V2 user's email, or a 404 response. */
export async function v2User(): Promise<{ email: string; name: string | null } | NextResponse> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return { email, name: session?.user?.name ?? null };
}
export const isResp = (x: unknown): x is NextResponse => x instanceof NextResponse;
const UUID = /^[0-9a-f-]{36}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);
/** The public origin for OAuth redirects (App Runner's internal host is not what Google sees). */
export const origin = (reqOrigin: string) => process.env.AUTH_URL?.replace(/\/$/, "") || reqOrigin;
