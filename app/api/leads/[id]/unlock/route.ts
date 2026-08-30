import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { creditCost } from "@/lib/credits/pricing";

/**
 * "Add to leads" — costs 1 credit, reveals full contact/address detail for this lead in Leads
 * (see /api/leads GET, which nulls those fields out server-side until a matching `unlocks` row
 * exists). Credits only ever go down here; they go up via /api/user/plan on an "upgrade".
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const userEmail = session.user.email;

  let [profile] = await sql`SELECT credits FROM user_profiles WHERE email = ${userEmail}`;
  if (!profile) {
    [profile] = await sql`
      INSERT INTO user_profiles (email) VALUES (${userEmail})
      ON CONFLICT (email) DO NOTHING
      RETURNING credits
    `;
  }
  const credits = profile?.credits ?? 0;
  // One lookup drives both the balance change and the ledger row. They used to disagree: the
  // UPDATE subtracted a hardcoded 1 while the ledger recorded creditCost(), so the moment that
  // price stopped being 1 the audit trail would have stopped matching the balance it audits.
  const cost = creditCost("lead_unlock");

  const [alreadyUnlocked] = await sql`
    SELECT id FROM unlocks WHERE lead_id = ${id} AND unlocked_by = ${userEmail}
  `;
  if (alreadyUnlocked) return NextResponse.json({ unlocked: true, alreadyUnlocked: true, credits });

  if (credits < cost) {
    return NextResponse.json({ error: "insufficient_credits", credits, required: cost }, { status: 402 });
  }

  const [inserted] = await sql`
    INSERT INTO unlocks (lead_id, unlocked_by)
    VALUES (${id}, ${userEmail})
    ON CONFLICT (lead_id, unlocked_by) DO NOTHING
    RETURNING id
  `;

  if (!inserted) return NextResponse.json({ unlocked: true, alreadyUnlocked: true, credits });

  const [updated] = await sql`
    UPDATE user_profiles SET credits = credits - ${cost}, updated_at = now()
    WHERE email = ${userEmail}
    RETURNING credits
  `;

  // Audit trail alongside the unlocks row above. ON CONFLICT DO NOTHING backstops the same
  // double-charge case the unlocks insert already guards against.
  await sql`
    INSERT INTO credit_ledger (user_email, lead_id, reason, amount)
    VALUES (${userEmail}, ${id}, 'lead_unlock', ${-cost})
    ON CONFLICT (user_email, lead_id, reason) DO NOTHING
  `;

  return NextResponse.json({ unlocked: true, alreadyUnlocked: false, credits: updated.credits });
}
