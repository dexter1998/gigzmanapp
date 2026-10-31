import { NextRequest, NextResponse } from "next/server";
import { v2User, isResp, origin } from "../../../_auth";
import { readGoogleState, finishGoogle } from "@/lib/v2/outreach/senders";

/** Google sends the user back here; the signed state must belong to the signed-in user. */
export async function GET(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const o = origin(req.nextUrl.origin);
  const back = (q: Record<string, string>) => NextResponse.redirect(`${o}/integrations/email?${new URLSearchParams(q)}`);
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return back({ error: sp.get("error") === "access_denied" ? "You cancelled the Google connection." : `Google: ${sp.get("error")}` });
  if (readGoogleState(sp.get("state") ?? "") !== u.email) return back({ error: "That Google sign-in didn't start from this account — try again." });
  const r = await finishGoogle(u.email, sp.get("code") ?? "", o);
  return r.ok ? back({ connected: r.address }) : back({ error: r.error });
}
