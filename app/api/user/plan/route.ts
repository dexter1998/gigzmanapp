import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

const PLAN_CREDITS: Record<string, number> = {
  free: 20,
  starter: 2000,
  pro: 12000,
  business: 30000,
};

// UI-only "upgrade" — no real payment gateway yet (plan-confirmed decision, same as the lead
// Premium unlock). Just updates the plan + credit allowance directly.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan?: string };
  if (!plan || !(plan in PLAN_CREDITS)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const credits = PLAN_CREDITS[plan];
  await sql`
    INSERT INTO user_profiles (email, plan, credits, credits_limit, updated_at)
    VALUES (${session.user.email}, ${plan}, ${credits}, ${credits}, now())
    ON CONFLICT (email) DO UPDATE SET plan = ${plan}, credits = ${credits}, credits_limit = ${credits}, updated_at = now()
  `;

  return NextResponse.json({ ok: true, plan, credits });
}
