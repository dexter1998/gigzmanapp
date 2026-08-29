import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

type ContactBody = {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  topic?: string;
  message: string;
  /** Honeypot — a real person never sees this field, so anything in it came from a bot. */
  website?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_CHARS = 4000;

export async function POST(req: NextRequest) {
  const session = await auth();
  const b = (await req.json()) as ContactBody;

  // Silently accept and drop honeypot hits — returning an error just tells a bot what to fix.
  if (b.website) return NextResponse.json({ ok: true });

  if (!b.firstName?.trim() || !b.email?.trim() || !EMAIL_RE.test(b.email) || !b.message?.trim()) {
    return NextResponse.json({ error: "Name, a valid email and a message are required" }, { status: 400 });
  }

  const [recent] = await sql`
    SELECT id FROM contact_messages
    WHERE email = ${b.email} AND created_at > now() - interval '60 seconds'
    LIMIT 1
  `;
  if (recent) return NextResponse.json({ ok: true, duplicate: true });

  const [row] = await sql`
    INSERT INTO contact_messages (first_name, last_name, email, company, topic, message, user_email)
    VALUES (
      ${b.firstName}, ${b.lastName ?? null}, ${b.email}, ${b.company ?? null},
      ${b.topic ?? null}, ${b.message.slice(0, MAX_MESSAGE_CHARS)}, ${session?.user?.email ?? null}
    )
    RETURNING id
  `;

  return NextResponse.json({ ok: true, id: row.id });
}
