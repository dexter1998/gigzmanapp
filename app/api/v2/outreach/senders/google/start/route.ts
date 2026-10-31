import { NextRequest, NextResponse } from "next/server";
import { v2User, isResp, origin } from "../../../_auth";
import { googleAuthUrl } from "@/lib/v2/outreach/senders";

export async function GET(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  return NextResponse.redirect(googleAuthUrl(u.email, origin(req.nextUrl.origin)));
}
