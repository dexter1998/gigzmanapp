import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../../../_auth";
import { fetchRecording } from "@/lib/v2/outreach/hosted-voice";

/**
 * An AI call's recording, streamed from the voice platform with the server's key (the platform's
 * own audio link sits behind a browser check). `id` is an Inbox message id, or `send-<id>` for a
 * campaign send. Only the owner's calls.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const send = /^send-(\d+)$/.exec(id);
  const [row] = send
    ? await sql`SELECT s.recording FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id WHERE s.id = ${Number(send[1])} AND c.user_email = ${u.email}`
    : /^\d+$/.test(id) ? await sql`SELECT recording FROM v2_inbox WHERE id = ${Number(id)} AND user_email = ${u.email}` : [];
  if (!row?.recording) return NextResponse.json({ error: "no_recording" }, { status: 404 });
  const r = await fetchRecording(String(row.recording));
  if (!r?.body) return NextResponse.json({ error: "Recording isn't available yet — try again in a minute." }, { status: 502 });
  return new Response(r.body, {
    headers: {
      "content-type": r.headers.get("content-type") ?? "audio/wav",
      ...(r.headers.get("content-length") ? { "content-length": r.headers.get("content-length")! } : {}),
      "cache-control": "private, max-age=3600",
    },
  });
}
