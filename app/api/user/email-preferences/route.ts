import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Marketing-email opt-in state for the signed-in account.
 *
 * The same email_unsubscribes table the one-click /u/[token] endpoint writes to, so a recipient who
 * unsubscribes from a message and a user who flips the switch here end up in exactly one place --
 * two separate stores would eventually disagree, and the disagreement would be sending mail to
 * someone who opted out.
 *
 * Transactional mail (sign-in codes, account notices) is deliberately not covered: an opt-out must
 * never be able to lock someone out of their own account.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [row] = await sql`
    SELECT 1 FROM email_unsubscribes
    WHERE email = ${session.user.email} AND stream = 'all'
    LIMIT 1
  `;
  return NextResponse.json({ subscribed: !row });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscribed } = (await req.json()) as { subscribed?: boolean };
  if (typeof subscribed !== "boolean") {
    return NextResponse.json({ error: "subscribed must be a boolean" }, { status: 400 });
  }

  if (subscribed) {
    // Re-subscribing clears every scoped opt-out too, not just the blanket one -- otherwise the
    // switch reads as "on" while a per-stream row quietly keeps suppressing that stream.
    await sql`DELETE FROM email_unsubscribes WHERE email = ${session.user.email}`;
  } else {
    await sql`
      INSERT INTO email_unsubscribes (email, stream, source)
      VALUES (${session.user.email}, 'all', 'preferences')
      ON CONFLICT (email, stream) DO NOTHING
    `;
  }
  return NextResponse.json({ subscribed });
}
