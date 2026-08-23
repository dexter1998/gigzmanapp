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
