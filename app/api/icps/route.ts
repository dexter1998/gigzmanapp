import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

const DEFAULT_VERTICAL = "web_dev_agency";
const DEFAULT_OFFER = "Website design & development services";

/** Returns the caller's ICP row, creating it on first read from their existing onboarding
 * profile (no new onboarding screen). vertical_key is hardcoded to the one vertical that
 * exists today — it's a marker for future industry-specific discovery branching, not a
 * live registry yet. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = session.user.email;

  const [existing] = await sql`SELECT vertical_key, offer FROM icps WHERE user_email = ${email}`;
  if (existing) return NextResponse.json(existing);

  const [agency] = await sql`SELECT agency_name, website FROM agency_profiles WHERE email = ${email}`;
  const [freelancer] = await sql`SELECT business_name, website FROM freelancer_profiles WHERE email = ${email}`;
  const sellerName = agency?.agency_name ?? freelancer?.business_name ?? null;
  const website = agency?.website ?? freelancer?.website ?? null;
  const offer = sellerName ? `${DEFAULT_OFFER} — ${sellerName}${website ? ` (${website})` : ""}` : DEFAULT_OFFER;

  const [created] = await sql`
    INSERT INTO icps (user_email, vertical_key, offer)
    VALUES (${email}, ${DEFAULT_VERTICAL}, ${offer})
    ON CONFLICT (user_email) DO UPDATE SET user_email = EXCLUDED.user_email
    RETURNING vertical_key, offer
  `;

  return NextResponse.json(created);
}
