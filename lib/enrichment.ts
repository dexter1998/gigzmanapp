import { sql } from "@/lib/db";
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from "@aws-sdk/client-ssm";

// Self-hosted gosom (google-maps-scraper) enrichment for a single already-unlocked lead — a real
// website URL, hours, popular times, none of which Nearby Search's response includes. This is
// deliberately NOT the bulk area-discovery path: gosom is search/keyword-based, not a single-place
// lookup, so this runs a tight-radius search around the lead's own lat/lng and matches the result
// whose place_id equals the one already stored.
//
// The engine lives here rather than in the route because two callers drive it: the lead's own
// endpoint (when someone is watching) and the cron tick (when nobody is). Each call advances a job
// by exactly one step and returns immediately — a serverless function can't stay alive for the
// minute-plus a run takes, so the job's state lives in `lead_enrichment` and SSM's command-status
// API, never in one request's lifetime.
// NOT process.env.AWS_REGION. Vercel sets that itself, to the region of the Lambda the function
// happens to run in, so the "|| ap-south-1" fallback never applied in production and every EC2/SSM
// call went to the wrong region: "InvalidInstanceID.NotFound: the instance ID does not exist" for
// an instance that was running the whole time. That is why every enrichment job sat at pending.
// Same reason SES_REGION and BEDROCK_REGION exist as their own variables in this codebase.
const REGION = process.env.SCRAPER_REGION || "ap-south-1";
const INSTANCE_ID = process.env.GOSOM_EC2_INSTANCE_ID;
const ec2 = new EC2Client({ region: REGION });
const ssm = new SSMClient({ region: REGION });

/** Tight radius around the lead's own coordinates — this only has to re-find the ONE business
 *  already known to be there, not discover new ones. */
const ENRICH_RADIUS_METERS = 120;

export type EnrichmentStatus =
  | "not_started" | "pending" | "starting_instance" | "scraping" | "done" | "failed";

export type LeadForEnrichment = {
  id: string;
  place_id: string;
  business_name: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
};

/** The lead, only if this user has actually unlocked it — enrichment never runs on a lead someone
 *  hasn't paid to reveal. */
export async function assertUnlocked(leadId: string, userEmail: string) {
  const [row] = await sql`
    SELECT l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM leads l
    JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE l.id = ${leadId}
  `;
  return row as LeadForEnrichment | undefined;
}

/** The shell commands run on the EC2 instance via SSM — one gosom search near the lead's own
 * coordinates, written as JSON to a results file this then reads back and filters down to the
 * record matching this lead's place_id.
 *
 * Each array element is a real, complete, independent shell command: SSM runs each element as its
 * OWN shell line, not as fragments of one command, which is what broke an earlier version that
 * split a single `docker run` invocation's flags across several elements.
 * `-exit-on-inactivity 3m` is gosom's own flag for terminating a CLI run instead of idling into
 * its web UI mode. */
function buildGosomCommand(lat: number, lng: number, businessName: string, leadId: string): string[] {
  const queryFile = `/tmp/gosom-query-${leadId}.txt`;
  const resultsFile = `/tmp/gosom-results-${leadId}.json`;
  return [
    `echo ${JSON.stringify(businessName)} > ${queryFile}`,
    `docker run --rm -v /tmp:/data gosom/google-maps-scraper:latest -input /data/${queryFile.split("/").pop()} -results /data/${resultsFile.split("/").pop()} -json -geo ${lat},${lng} -radius ${ENRICH_RADIUS_METERS} -depth 1 -exit-on-inactivity 3m`,
    `cat ${resultsFile}`,
    `rm -f ${queryFile} ${resultsFile}`,
  ];
}

/**
 * Moves one enrichment job forward by a single step and returns its new state.
 *
 * The instance is deliberately NOT stopped when a job finishes. It used to be, to avoid paying for
 * an idle machine, but that put a full cold boot (a minute or more) in front of every single
 * enrichment and made the feature feel broken. Leaving it running trades a small fixed monthly cost
 * for every job starting immediately. Revisit the instance SIZE, not this decision, when volume
 * grows — a busier queue wants a bigger box, not a colder one.
 */
export async function advance(leadId: string, lead: LeadForEnrichment) {
  if (!INSTANCE_ID) {
    return { status: "failed" as const, error: "GOSOM_EC2_INSTANCE_ID is not configured" };
  }

  const [existing] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${leadId}`;

  if (!existing) {
    await sql`INSERT INTO lead_enrichment (lead_id, status) VALUES (${leadId}, 'pending')`;
    return { status: "pending" as const };
  }

  if (existing.status === "done" || existing.status === "failed") return existing;

  if (existing.status === "pending") {
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    const state = desc.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (state === "stopped" || state === "stopping") {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    }
    await sql`UPDATE lead_enrichment SET status = 'starting_instance' WHERE lead_id = ${leadId}`;
    return { status: "starting_instance" as const };
  }

  if (existing.status === "starting_instance") {
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    const state = desc.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (state !== "running") return { status: "starting_instance" as const };

    if (lead.lat == null || lead.lng == null) {
      await sql`UPDATE lead_enrichment SET status = 'failed', error = 'lead has no coordinates' WHERE lead_id = ${leadId}`;
      return { status: "failed" as const, error: "lead has no coordinates" };
    }

    // One scrape at a time. There is a single small instance behind this, and dispatching every
    // queued job the moment it was ready put four concurrent Docker containers on one burstable
    // vCPU, which is slower than running them in turn and can starve them all. Waiting here is what
    // makes this an actual queue rather than a fan-out; this job keeps its place and goes next.
    const [busy] = await sql`
      SELECT lead_id FROM lead_enrichment
      WHERE status = 'scraping' AND lead_id <> ${leadId}
      LIMIT 1
    `;
    if (busy) return { status: "starting_instance" as const };

    try {
      const sent = await ssm.send(
        new SendCommandCommand({
          InstanceIds: [INSTANCE_ID],
          DocumentName: "AWS-RunShellScript",
          Parameters: { commands: buildGosomCommand(lead.lat, lead.lng, lead.business_name, leadId) },
          TimeoutSeconds: 600,
        })
      );
      const commandId = sent.Command?.CommandId ?? null;
      await sql`UPDATE lead_enrichment SET status = 'scraping', ssm_command_id = ${commandId} WHERE lead_id = ${leadId}`;
      return { status: "scraping" as const };
    } catch (err) {
      // The SSM agent may not have registered yet even though EC2 reports "running" — worth
      // another attempt on the next tick rather than failing the job.
      console.error("SSM SendCommand failed, will retry on next tick", err);
      return { status: "starting_instance" as const };
    }
  }

  if (existing.status === "scraping") {
    if (!existing.ssm_command_id) {
      await sql`UPDATE lead_enrichment SET status = 'failed', error = 'missing ssm_command_id' WHERE lead_id = ${leadId}`;
      return { status: "failed" as const, error: "missing ssm_command_id" };
    }
    let invocation;
    try {
      invocation = await ssm.send(
        new GetCommandInvocationCommand({ CommandId: existing.ssm_command_id, InstanceId: INSTANCE_ID })
      );
    } catch (err) {
      // InvocationDoesNotExist briefly right after SendCommand — not yet a real failure.
      console.error("GetCommandInvocation not ready yet", err);
      return { status: "scraping" as const };
    }

    if (invocation.Status === "InProgress" || invocation.Status === "Pending" || invocation.Status === "Delayed") {
      return { status: "scraping" as const };
    }

    if (invocation.Status !== "Success") {
      const error = invocation.StandardErrorContent || `gosom command ended with status ${invocation.Status}`;
      await sql`UPDATE lead_enrichment SET status = 'failed', error = ${error} WHERE lead_id = ${leadId}`;
      return { status: "failed" as const, error };
    }

    const records = (invocation.StandardOutputContent ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((r): r is Record<string, unknown> => r !== null);

    const match = records.find((r) => r.place_id === lead.place_id) ?? records[0];
    if (!match) {
      await sql`UPDATE lead_enrichment SET status = 'failed', error = 'no matching place_id in gosom output' WHERE lead_id = ${leadId}`;
      return { status: "failed" as const, error: "no matching place_id in gosom output" };
    }

    // Round-tripped through JSON so TypeScript sees a plain value sql.json accepts.
    const jsonSafe = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));
    await sql`
      UPDATE lead_enrichment SET
        status = 'done',
        website_url = ${(match.website as string) ?? null},
        open_hours = ${sql.json(jsonSafe(match.open_hours))},
        popular_times = ${sql.json(jsonSafe(match.popular_times))},
        raw = ${sql.json(jsonSafe(match))},
        enriched_at = now()
      WHERE lead_id = ${leadId}
    `;
    const [done] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${leadId}`;
    return done;
  }

  return existing;
}

/**
 * Advances every job that hasn't finished, oldest first. This is what makes the queue a real
 * background queue: a job keeps moving whether or not the person who started it still has the page
 * open, or is even logged in. Driven by the cron tick.
 *
 * Bounded per tick so one call can't run long: jobs left over are simply picked up next tick.
 */
export async function advanceAllInFlight(limit = 25) {
  const rows = (await sql`
    SELECT e.lead_id, l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM lead_enrichment e
    JOIN leads l ON l.id = e.lead_id
    WHERE e.status IN ('pending', 'starting_instance', 'scraping')
    ORDER BY e.requested_at ASC
    LIMIT ${limit}
  `) as Array<LeadForEnrichment & { lead_id: string }>;
  return runTicks(rows);
}

/**
 * The same tick, restricted to jobs on leads this user has unlocked.
 *
 * This is what actually keeps the queue moving day to day: Vercel's Hobby plan only permits a
 * DAILY cron, which is useless for a queue, so the leads page calls this on its refresh interval
 * instead. It advances every job the user has queued, not just whichever lead is on screen, so
 * closing a row or moving around the page doesn't stall anything. Deliberately not wired into
 * /api/leads itself — that endpoint is on the map's hot path and must not wait on AWS.
 */
export async function advanceInFlightForUser(userEmail: string, limit = 5) {
  const rows = (await sql`
    SELECT e.lead_id, l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM lead_enrichment e
    JOIN leads l ON l.id = e.lead_id
    JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE e.status IN ('pending', 'starting_instance', 'scraping')
    ORDER BY e.requested_at ASC
    LIMIT ${limit}
  `) as Array<LeadForEnrichment & { lead_id: string }>;
  return runTicks(rows);
}

async function runTicks(rows: Array<LeadForEnrichment & { lead_id: string }>) {
  const results: Array<{ leadId: string; status: string; error?: string }> = [];
  for (const row of rows) {
    try {
      const r = await advance(row.lead_id, row);
      results.push({ leadId: row.lead_id, status: (r as { status: string }).status });
    } catch (err) {
      // One stuck job must not stop the rest of the queue from advancing this tick. The reason is
      // reported back as well as logged: a job that throws every tick looks identical to one that
      // is simply slow, and without the reason there is nothing to act on.
      console.error("enrichment tick failed for lead", row.lead_id, err);
      results.push({
        leadId: row.lead_id,
        status: "error",
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }
  }
  return results;
}
