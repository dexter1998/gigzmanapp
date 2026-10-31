import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { tickRun } from "@/lib/v2/runner";
import { publicRun } from "@/lib/v2/public";

// A tick works for ~15s and then returns; the client calls again while the run is running.
// Same tick-driven shape as enrich-tick: App Runner only gives CPU inside a request.
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { id } = await params;
  const snap = publicRun(await tickRun(id, email));
  return snap ? NextResponse.json({ run: snap }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
