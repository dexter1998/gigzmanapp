import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { runChatIntent, type ChatIntent } from "@/lib/planner";
import { geocodeText, reverseGeocode } from "@/lib/geocode";
import { CLARIFICATIONS, USE_LAST_MAP_AREA } from "@/lib/chat-clarifications";
import { maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, CATEGORY_SECTIONS } from "@/lib/categories";
import { POST as findLeadsPost } from "@/app/api/leads/find/route";

const DEFAULT_SEARCH_RADIUS_METERS = 1500;
const HISTORY_LIMIT = 10;

type AssistantIntent = ChatIntent & {
  clarification?: { question: string; options: { label: string; description: string; value?: string }[] };
  leads?: Array<{
    id: string;
    business_name: string;
    category: string | null;
    has_website: boolean | null;
    heat_score: number | null;
  }>;
  tookMs?: number; // real elapsed time for the Bedrock call, shown as "Mantis worked for Ns"
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;
  const { chatId } = await params;

  const [chat] = await sql`SELECT id FROM chats WHERE id = ${chatId} AND user_email = ${userEmail}`;
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json()) as { message?: string };
  let message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // "Reuse my last searched area" resolves here, before anything else touches `message` —
  // the rest of the pipeline never needs to know this turn started from a clarification tap
  // rather than typed text.
  if (message === USE_LAST_MAP_AREA) {
    const [lastScan] = await sql`
      SELECT center_lat, center_lng FROM area_scans
      WHERE requested_by = ${userEmail} AND center_lat IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;
    const resolved = lastScan ? await reverseGeocode(lastScan.center_lat, lastScan.center_lng) : null;
    message = resolved ? `Search near ${resolved}` : "my last searched area";
  }

  await sql`INSERT INTO chat_messages (chat_id, role, content) VALUES (${chatId}, 'user', ${message})`;

  const historyRows = await sql`
    SELECT role, content, intent FROM chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at DESC
    LIMIT ${HISTORY_LIMIT}
  `;
  // Results from a prior search aren't otherwise visible to the model — only the short
  // reply text is stored as that turn's content — so a follow-up like "what was the top
  // one" has nothing to answer from. Restating the found business names here (context
  // only, not re-stored) is what actually makes that a real "answer_from_existing" case
  // instead of the model just asking for clarification with no memory of the results.
  const history = historyRows
    .map((r) => {
      const priorLeads = (r.intent as AssistantIntent | null)?.leads;
      const summary = priorLeads?.length
        ? ` [Found: ${priorLeads.map((l) => l.business_name).join(", ")}]`
        : "";
      return { role: r.role as "user" | "assistant", content: `${r.content as string}${summary}` };
    })
    .reverse();

  const startedAt = Date.now();
  const intent = await runChatIntent({ message, history: history.slice(0, -1) });
  const result: AssistantIntent = { ...intent, tookMs: Date.now() - startedAt };

  if (intent.action === "search_leads" && !intent.category) {
    result.action = "needs_clarification";
    result.missingField = "category";
  }
  if (result.action === "search_leads" && !intent.areaText) {
    result.action = "needs_clarification";
    result.missingField = "location";
  }

  let center: { lat: number; lng: number } | null = null;
  if (result.action === "search_leads" && intent.areaText) {
    center = await geocodeText(intent.areaText);
    if (!center) {
      result.action = "needs_clarification";
      result.missingField = "location";
    }
  }

  if (result.action === "needs_clarification" && result.missingField) {
    result.clarification = CLARIFICATIONS[result.missingField];

    if (result.missingField === "location") {
      const [lastScan] = await sql`
        SELECT id FROM area_scans WHERE requested_by = ${userEmail} AND center_lat IS NOT NULL LIMIT 1
      `;
      if (lastScan) {
        result.clarification = {
          ...result.clarification,
          options: [
            { label: "My last searched area", description: "Reuse the location from your most recent map search", value: USE_LAST_MAP_AREA },
            ...result.clarification.options,
          ],
        };
      }
    }
  }

  if (result.action === "search_leads" && center && intent.category) {
    // Reuses the map's own discovery route directly (same function, same throttles/cache/
    // dedup) rather than a parallel pipeline — chat is a natural-language front end onto
    // the same data, not a second way of finding it. Its own result is best-effort/
    // throttle-aware and discarded here on purpose: whether or not this call actually ran
    // live discovery (vs. being cooldown-throttled), the bounding-box read below always
    // shows whatever's already cached for this area+category, so a repeat/refinement
    // query never silently comes back empty just because the live half was throttled.
    const findReq = new NextRequest("http://internal/api/leads/find", {
      method: "POST",
      body: JSON.stringify({ lat: center.lat, lng: center.lng, radius: DEFAULT_SEARCH_RADIUS_METERS, category: intent.category }),
      headers: { "content-type": "application/json" },
    });
    await findLeadsPost(findReq);

    const placeTypes = CATEGORY_SECTIONS[intent.category] ?? [];
    const latDelta = DEFAULT_SEARCH_RADIUS_METERS / 111320;
    const lngDelta = DEFAULT_SEARCH_RADIUS_METERS / (111320 * Math.cos((center.lat * Math.PI) / 180));

    const rows = await sql`
      SELECT l.id, l.business_name, l.category, l.has_website, l.is_competitor, l.rating, l.review_count, l.address,
             (u.id IS NOT NULL) AS is_unlocked
      FROM leads l
      LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
      WHERE l.category = ANY(${placeTypes})
        AND l.lat BETWEEN ${center.lat - latDelta} AND ${center.lat + latDelta}
        AND l.lng BETWEEN ${center.lng - lngDelta} AND ${center.lng + lngDelta}
        AND l.is_competitor = false
        ${result.noWebsiteOnly ? sql`AND l.has_website = false` : sql``}
      ORDER BY l.review_count DESC NULLS LAST
      LIMIT 25
    `;
    result.leads = rows.map((r) => {
      const reveal = r.is_unlocked || r.is_competitor || r.has_website === true;
      return {
        id: r.id as string,
        business_name: reveal ? (r.business_name as string) : maskName(r.business_name as string),
        category: r.category as string | null,
        has_website: r.has_website as boolean | null,
        heat_score: r.is_competitor
          ? null
          : heatScore({
              rating: r.rating,
              review_count: r.review_count,
              has_website: r.has_website,
              primary_type: r.category,
              section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
              address: r.address,
            }),
      };
    });
  }

  const [assistantMessage] = await sql`
    INSERT INTO chat_messages (chat_id, role, content, intent)
    VALUES (${chatId}, 'assistant', ${result.reply}, ${sql.json(result)})
    RETURNING id, role, content, intent, created_at
  `;
  await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;

  return NextResponse.json({ message: assistantMessage });
}
