import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { runChatIntent, BedrockUnavailableError, type ChatIntent } from "@/lib/planner";
import { geocodeText, reverseGeocode } from "@/lib/geocode";
import { CLARIFICATIONS, USE_LAST_MAP_AREA } from "@/lib/chat-clarifications";
import { maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, CATEGORY_SECTIONS, formatCategory } from "@/lib/categories";
import { resolveCategoryPhrase } from "@/lib/category-resolve";
import { POST as findLeadsPost } from "@/app/api/leads/find/route";

const DEFAULT_SEARCH_RADIUS_METERS = 1500;
const HISTORY_LIMIT = 10;

/** Deliberately a local three-liner rather than importing areaDisplayName from lib/pseo: the
 *  contract is that the product never depends on the pSEO section, so that section stays deletable. */
function areaLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type AssistantIntent = ChatIntent & {
  clarification?: { question: string; options: { label: string; description: string; value?: string }[] };
  leads?: Array<{
    id: string;
    business_name: string;
    category: string | null;
    has_website: boolean | null;
    heat_score: number | null;
    // Shown on every row whether or not the lead is unlocked. None of it identifies the business —
    // it is what a user needs to decide which masked row is worth spending a credit on, and holding
    // it back only made the table impossible to judge.
    rating: number | null;
    review_count: number | null;
    area: string | null;
    verified_at: string | null;
  }>;
  tookMs?: number; // real elapsed time for the Bedrock call, shown as "Mantis worked for Ns"
  apiDown?: boolean; // a real third-party API failure happened this turn (not just an empty/ambiguous result)
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
  let turnApiDown = false;
  if (message === USE_LAST_MAP_AREA) {
    const [lastScan] = await sql`
      SELECT center_lat, center_lng FROM area_scans
      WHERE requested_by = ${userEmail} AND center_lat IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;
    const resolved = lastScan ? await reverseGeocode(lastScan.center_lat, lastScan.center_lng) : { value: null, apiDown: false };
    turnApiDown = turnApiDown || resolved.apiDown;
    message = resolved.value ? `Search near ${resolved.value}` : "my last searched area";
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
  let intent: ChatIntent;
  try {
    intent = await runChatIntent({ message, history: history.slice(0, -1) });
  } catch (err) {
    if (!(err instanceof BedrockUnavailableError)) throw err;
    intent = {
      action: "needs_clarification",
      category: null,
      categoryText: null,
      areaText: null,
      noWebsiteOnly: false,
      minReviews: null,
      minRating: null,
      missingField: null,
      reply: "I'm having trouble reaching my search engine right now — please try again in a few minutes.",
      nextActions: [],
    };
    turnApiDown = true;
  }
  const result: AssistantIntent = { ...intent, tookMs: Date.now() - startedAt, apiDown: turnApiDown };

  // A specific trade beats a broad section. "CA" resolves to accounting; the section enum could
  // never express it, which is why asking for CAs used to loop on "category specify karni hogi"
  // no matter how many times the user answered.
  const resolvedType = resolveCategoryPhrase(intent.categoryText);
  const haveCategory = Boolean(resolvedType || intent.category);

  // The model contradicts itself: it will fill categoryText "CA", areaText "Gurgaon" and
  // minReviews 25, and in the same breath report category as missing. Its output is untrusted —
  // when we can see the field it is asking for, we already have it, so asking again is a loop with
  // nothing at the end of it.
  if (result.action === "needs_clarification" && result.missingField === "category" && haveCategory) {
    result.missingField = intent.areaText ? null : "location";
    result.action = intent.areaText ? "search_leads" : "needs_clarification";
  }
  if (result.action === "needs_clarification" && result.missingField === "location" && intent.areaText) {
    result.missingField = haveCategory ? null : "category";
    result.action = haveCategory ? "search_leads" : "needs_clarification";
  }

  if (result.action === "search_leads" && !haveCategory) {
    result.action = "needs_clarification";
    result.missingField = "category";
  }
  if (result.action === "search_leads" && !intent.areaText) {
    result.action = "needs_clarification";
    result.missingField = "location";
  }

  let center: { lat: number; lng: number } | null = null;
  if (result.action === "search_leads" && intent.areaText) {
    const geocoded = await geocodeText(intent.areaText);
    center = geocoded.value;
    if (geocoded.apiDown) result.apiDown = true;
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

  if (result.action === "search_leads" && center && (resolvedType || intent.category)) {
    // Reuses the map's own discovery route directly (same function, same throttles/cache/
    // dedup) rather than a parallel pipeline — chat is a natural-language front end onto
    // the same data, not a second way of finding it. Its own leads/hasMore are best-effort/
    // throttle-aware and discarded here on purpose: whether or not this call actually ran
    // live discovery (vs. being cooldown-throttled), the bounding-box read below always
    // shows whatever's already cached for this area+category, so a repeat/refinement
    // query never silently comes back empty just because the live half was throttled. Its
    // `apiDown` flag is the one thing still read from it, since a real Places failure here
    // should still surface the maintenance banner even though the leads themselves aren't used.
    const findReq = new NextRequest("http://internal/api/leads/find", {
      method: "POST",
      body: JSON.stringify({
        lat: center.lat, lng: center.lng, radius: DEFAULT_SEARCH_RADIUS_METERS,
        // Discovery works in sections, so a resolved type is widened back to its own section.
        category: intent.category ?? (resolvedType ? TYPE_TO_SECTION[resolvedType] : null),
      }),
      headers: { "content-type": "application/json" },
    });
    const findRes = await findLeadsPost(findReq);
    const findData = await findRes.json().catch(() => null) as { apiDown?: boolean } | null;
    if (findData?.apiDown) result.apiDown = true;

    const placeTypes = resolvedType ? [resolvedType] : (CATEGORY_SECTIONS[intent.category!] ?? []);
    const latDelta = DEFAULT_SEARCH_RADIUS_METERS / 111320;
    const lngDelta = DEFAULT_SEARCH_RADIUS_METERS / (111320 * Math.cos((center.lat * Math.PI) / 180));

    const rows = await sql`
      SELECT l.id, l.business_name, l.category, l.has_website, l.is_competitor, l.rating, l.review_count,
             l.address, l.area_slug, l.website_checked_at,
             (u.id IS NOT NULL) AS is_unlocked
      FROM leads l
      LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
      WHERE l.category = ANY(${placeTypes})
        AND l.lat BETWEEN ${center.lat - latDelta} AND ${center.lat + latDelta}
        AND l.lng BETWEEN ${center.lng - lngDelta} AND ${center.lng + lngDelta}
        AND l.is_competitor = false
        ${result.noWebsiteOnly ? sql`AND l.has_website = false` : sql``}
        ${intent.minReviews !== null ? sql`AND l.review_count >= ${intent.minReviews}` : sql``}
        ${intent.minRating !== null ? sql`AND l.rating >= ${intent.minRating}` : sql``}
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
        rating: r.rating as number | null,
        review_count: r.review_count as number | null,
        area: r.area_slug ? areaLabel(r.area_slug as string) : null,
        verified_at: r.website_checked_at ? new Date(r.website_checked_at as string).toISOString() : null,
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

    // The model's own `reply` was generated before the search ran (it doesn't know the count
    // yet), which is how a turn could end up showing only a stale "I'm searching for X…" line
    // with nothing after it when zero results came back — replaced here with a deterministic,
    // result-aware summary instead of relying on the model to narrate a search it hasn't seen
    // the outcome of.
    const placeLabel = intent.areaText ?? "this area";
    const categoryLabel = (formatCategory(resolvedType ?? intent.category) ?? "businesses").toLowerCase();
    const filters = [
      result.noWebsiteOnly ? "without a website" : null,
      intent.minReviews !== null ? `with ${intent.minReviews}+ reviews` : null,
      intent.minRating !== null ? `rated ${intent.minRating}+` : null,
    ].filter(Boolean).join(", ");

    if (result.leads.length > 0) {
      result.reply = `Found ${result.leads.length} ${categoryLabel} near ${placeLabel}${filters ? ` ${filters}` : ""}.`;
    } else {
      // "No matching businesses found — try a different area" reads as "we looked and there are
      // none", which was flatly untrue for Gujarat: we hold one lead in the entire state. Whether
      // we cover the ground at all is a different answer from whether this category is there, and
      // the user can only act on the difference if we tell them which one it is.
      const [near] = await sql`
        SELECT count(*)::int AS n FROM leads
        WHERE lat BETWEEN ${center.lat - latDelta} AND ${center.lat + latDelta}
          AND lng BETWEEN ${center.lng - lngDelta} AND ${center.lng + lngDelta}
      `;
      const coveredHere = Number(near?.n ?? 0);

      if (coveredHere === 0) {
        const covered = await sql`
          SELECT city_slug, count(*)::int AS n FROM leads
          WHERE city_slug IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 3
        `;
        const list = covered
          .map((c) => `${areaLabel(c.city_slug as string)} (${Number(c.n).toLocaleString("en-IN")})`)
          .join(", ");
        result.reply = list
          ? `We haven't mapped ${placeLabel} yet — so this is no businesses on file, not none in existence. Right now we cover ${list}.`
          : `We haven't mapped ${placeLabel} yet.`;
        result.nextActions = ["Search Gurgaon instead", "Tell us which city to map next"];
      } else {
        result.reply =
          `No ${categoryLabel}${filters ? ` ${filters}` : ""} near ${placeLabel}, though we have ` +
          `${coveredHere.toLocaleString("en-IN")} businesses mapped there. Try widening the filters or another trade.`;
        result.nextActions = filters ? ["Drop the filters", "Try a nearby area"] : ["Try a nearby area"];
      }
    }
  }

  const [assistantMessage] = await sql`
    INSERT INTO chat_messages (chat_id, role, content, intent)
    VALUES (${chatId}, 'assistant', ${result.reply}, ${sql.json(result)})
    RETURNING id, role, content, intent, created_at
  `;
  await sql`UPDATE chats SET updated_at = now() WHERE id = ${chatId}`;

  return NextResponse.json({ message: assistantMessage });
}
