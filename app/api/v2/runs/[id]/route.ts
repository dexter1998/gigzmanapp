import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { snapshot } from "@/lib/v2/runner";
import { publicRun } from "@/lib/v2/public";

/** Current state of a run — what the panel shows after a reload. V2 only; others get 404. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { id } = await params;
  const snap = publicRun(await snapshot(id, email));
  return snap ? NextResponse.json({ run: snap }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
