import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { maskName } from "@/lib/mask";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const hasWebsite = params.get("has_website"); // "true" | "false" | null (= any)
  const category = params.get("category");
  const unlockedOnly = params.get("unlocked") === "true";
  const userEmail = session.user.email;

  const rows = await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.lat, l.lng, l.phone, l.email,
           l.has_website, l.contacted, l.is_competitor, l.created_at,
           (u.id IS NOT NULL) AS is_unlocked
    FROM leads l
    LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE 1=1
      ${hasWebsite === "true" ? sql`AND l.has_website = true` : sql``}
      ${hasWebsite === "false" ? sql`AND l.has_website = false` : sql``}
      ${category ? sql`AND l.category = ${category}` : sql``}
      ${unlockedOnly ? sql`AND u.id IS NOT NULL` : sql``}
    ORDER BY l.created_at DESC
    LIMIT 500
  `;

  // Real protection, not cosmetic — an unpurchased lead's identity/contact info must not be
  // recoverable from the raw response even if a client happened to skip the masked display value.
  // Competitors are exempt: there's nothing to sell on a competitor, showing who they are is the
  // whole point of flagging them.
  const leads = rows.map((r) => {
    const reveal = r.is_unlocked || r.is_competitor;
    return {
      ...r,
      business_name: reveal ? r.business_name : maskName(r.business_name),
      category: reveal || !r.category ? r.category : maskName(r.category),
      address: reveal ? r.address : null,
      phone: reveal ? r.phone : null,
      email: reveal ? r.email : null,
    };
  });

  return NextResponse.json({ leads });
}
