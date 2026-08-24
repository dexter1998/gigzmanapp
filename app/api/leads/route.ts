import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const hasWebsite = params.get("has_website"); // "true" | "false" | null (= any)
  const category = params.get("category");

  const rows = await sql`
    SELECT id, business_name, category, address, lat, lng, phone, email,
           has_website, contacted, is_competitor, created_at
    FROM leads
    WHERE 1=1
      ${hasWebsite === "true" ? sql`AND has_website = true` : sql``}
      ${hasWebsite === "false" ? sql`AND has_website = false` : sql``}
      ${category ? sql`AND category = ${category}` : sql``}
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json({ leads: rows });
}
