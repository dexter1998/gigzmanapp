import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let [profile] = await sql`SELECT * FROM user_profiles WHERE email = ${session.user.email}`;

  if (!profile) {
    [profile] = await sql`
      INSERT INTO user_profiles (email)
      VALUES (${session.user.email})
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `;
    if (!profile) {
      [profile] = await sql`SELECT * FROM user_profiles WHERE email = ${session.user.email}`;
    }
  }

  return NextResponse.json({ profile });
}

const MAX_NAME_CHARS = 80;
const DASHBOARD_MODES = new Set(["leads", "jobs"]);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Both fields optional and independently settable — the settings page saves the name and the
  // dashboard switcher saves the mode, and neither should have to send the other's value.
  const updates: Record<string, string> = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim().slice(0, MAX_NAME_CHARS);
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = name;
  }
  if (body?.dashboard_mode !== undefined) {
    const mode = String(body.dashboard_mode).trim();
    if (!DASHBOARD_MODES.has(mode)) return NextResponse.json({ error: "invalid dashboard_mode" }, { status: 400 });
    updates.dashboard_mode = mode;
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const [profile] = await sql`
    UPDATE user_profiles SET ${sql(updates)}, updated_at = now()
    WHERE email = ${session.user.email}
    RETURNING *
  `;

  return NextResponse.json({ profile });
}
