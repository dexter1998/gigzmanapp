import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { listLeads, MAP_LIST } from "@/lib/v2/lms";
import { pitchFor } from "@/lib/v2/outreach/sender-profile";

/** V2 LMS: all leads, or one list (?list=<chatId>), plus the lists themselves, the extra columns and
 *  the seller's pitch for prefilled messages (docs/lead-contact-contract.md). */
export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const list = req.nextUrl.searchParams.get("list");
  const chatId = list === MAP_LIST || (list && /^[0-9a-f-]{36}$/i.test(list)) ? list : null;
  const [data, pitch] = await Promise.all([listLeads(email, chatId), pitchFor(email, chatId === MAP_LIST ? null : chatId).catch(() => null)]);
  return NextResponse.json({ ...data, pitch });
}
