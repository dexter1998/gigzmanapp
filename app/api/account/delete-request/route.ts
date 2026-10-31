import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelRequest, createRequest, getPendingRequest } from "@/lib/account-deletion";
import { sendDeletionRequested } from "@/lib/email/account-deletion";

/**
 * The user's side of account deletion. POST files a request (staff approve it in
 * /admin/deletions), DELETE cancels it while it is still pending, GET reports the pending one.
 * Nothing here deletes data — see lib/account-deletion.ts.
 */

async function sessionEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function GET() {
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pending = await getPendingRequest(email);
  return NextResponse.json({ pending: pending ? { id: pending.id, requestedAt: pending.requested_at } : null });
}

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { confirmEmail?: string; reason?: string };
  // The typed confirmation is enforced here too, not only in the dialog: the route is its own
  // entry point and a stray POST must not file a request.
  if ((body.confirmEmail ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Type your account email exactly to confirm." }, { status: 400 });
  }

  const { request, created } = await createRequest(email, typeof body.reason === "string" ? body.reason : null);
  if (created) void sendDeletionRequested(email);
  return NextResponse.json({ pending: { id: request.id, requestedAt: request.requested_at } }, { status: created ? 201 : 200 });
}

export async function DELETE() {
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cancelled = await cancelRequest(email);
  if (!cancelled) return NextResponse.json({ error: "No pending request to cancel." }, { status: 404 });
  return NextResponse.json({ pending: null });
}
