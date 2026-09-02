import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

/**
 * CSV import for one campaign's recipients. Data-only: no email content generation happens here,
 * only storage of recipient rows and their {{placeholder}} values (campaign_steps carries the
 * actual copy, edited separately). Re-uploading the same email updates its row instead of
 * duplicating it, so a corrected CSV can be re-run safely.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [campaign] = await sql`SELECT id FROM campaigns WHERE id = ${id}`;
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const defaultBatch = String(form.get("batch") ?? "A").trim() || "A";
  if (!(file instanceof File)) return NextResponse.json({ error: "no file uploaded" }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: "csv has no data rows" }, { status: 400 });

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const emailCol = header.indexOf("email");
  const batchCol = header.indexOf("batch");
  if (emailCol === -1) return NextResponse.json({ error: "csv needs an 'email' column" }, { status: 400 });

  let imported = 0, skipped = 0;
  for (const row of rows.slice(1)) {
    const email = (row[emailCol] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) { skipped++; continue; }

    const values: Record<string, string> = {};
    header.forEach((col, i) => {
      if (col && col !== "email" && col !== "batch") values[col] = (row[i] ?? "").trim();
    });
    const batch = (batchCol !== -1 ? row[batchCol] : "")?.trim() || defaultBatch;

    await sql`
      INSERT INTO campaign_recipients (campaign_id, email, batch, values)
      VALUES (${id}, ${email}, ${batch}, ${sql.json(values)})
      ON CONFLICT (campaign_id, email) DO UPDATE SET batch = EXCLUDED.batch, values = EXCLUDED.values
    `;
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
