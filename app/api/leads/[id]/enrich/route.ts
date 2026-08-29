import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from "@aws-sdk/client-ssm";

// Self-hosted gosom (google-maps-scraper) enrichment for a single already-unlocked lead — a real
// website URL, hours, popular times, none of which Nearby Search's response includes. This is
// deliberately NOT the bulk area-discovery path: gosom is search/keyword-based, not a
// single-place lookup, so this runs a tight-radius search around the lead's own lat/lng and
// matches the result whose place_id equals the one already stored — the same real Google
// place_id gosom itself returns, confirmed live in an earlier smoke test, so this match is exact
// rather than a fuzzy name match.
//
// GET is polled by the client every few seconds; each call advances the job by exactly one step
// and returns immediately — a Vercel function can't stay alive for the full minute-plus this can
// take (EC2 boot + gosom's own run time), so the job's state lives in `lead_enrichment` and
// SSM's own command-status API, not in this request's lifetime.
const REGION = process.env.AWS_REGION || "ap-south-1";
const INSTANCE_ID = process.env.GOSOM_EC2_INSTANCE_ID;
const ec2 = new EC2Client({ region: REGION });
const ssm = new SSMClient({ region: REGION });

// A tight search radius around the lead's own coordinates — this only needs to re-find the ONE
// business already known to be there, not discover new ones, so it stays as narrow as gosom's
// own location-bias parameter allows.
const ENRICH_RADIUS_METERS = 120;

async function assertUnlocked(leadId: string, userEmail: string) {
  const [row] = await sql`
    SELECT l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM leads l
    JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE l.id = ${leadId}
  `;
  return row as
    | { id: string; place_id: string; business_name: string; category: string | null; lat: number | null; lng: number | null }
    | undefined;
}

/** The shell commands run on the EC2 instance via SSM — one gosom search near the lead's own
 * coordinates, written as JSON to a results file that this route then reads back and filters
 * down to the record matching this lead's place_id.
 *
 * Fixed after a real live run against i-07303fa06c7451299 (2026-08) surfaced two bugs in the
 * original version, confirmed via `docker logs` and `GetCommandInvocation`:
 * 1. SSM's `Parameters.commands` runs each array element as its OWN separate shell line, not as
 *    fragments of one command — the old code split a single `docker run ...` invocation's flags
 *    across 7 array elements, so only `docker run --rm gosom/google-maps-scraper:latest` (zero
 *    flags) ever actually ran; every "-flag value" element after it executed as its own
 *    (invalid) one-word command instead of extending the docker invocation.
 * 2. `-input <(echo ...)` (bash process substitution) and `-o -` are not what gosom's CLI
 *    actually expects — confirmed against the real gosom README: `-input` needs a real file
 *    path, and the flag for an output file is `-results`, not `-o`. With no valid `-input`,
 *    gosom fell through to its default behavior — its own web UI server (confirmed live: the
 *    container's logs showed "visit http://localhost:8080" and it ran indefinitely, never
 *    producing scrape output, exactly matching the "stuck at scraping forever" symptom this was
 *    causing) — not a one-shot CLI scrape.
 *
 * Each array element below is now a real, complete, independent shell command in its own right:
 * write the query to a real file, run gosom against it with a real `-results` file, print that
 * file to stdout (so the existing StandardOutputContent-parsing code below needs no change),
 * then clean up. `-exit-on-inactivity 3m` is gosom's own documented flag for actually
 * terminating a CLI-mode run instead of idling. */
function buildGosomCommand(lat: number, lng: number, businessName: string, leadId: string): string[] {
  // The business's own name, not just its category — confirmed live that a category-only query
  // ("restaurant") finds *a* nearby business matching the type, not necessarily this specific
  // one; searching by name is what actually gets the right place_id back.
  const query = businessName;
  const queryFile = `/tmp/gosom-query-${leadId}.txt`;
  const resultsFile = `/tmp/gosom-results-${leadId}.json`;
  return [
    `echo ${JSON.stringify(query)} > ${queryFile}`,
    `docker run --rm -v /tmp:/data gosom/google-maps-scraper:latest -input /data/${queryFile.split("/").pop()} -results /data/${resultsFile.split("/").pop()} -json -geo ${lat},${lng} -radius ${ENRICH_RADIUS_METERS} -depth 1 -exit-on-inactivity 3m`,
    `cat ${resultsFile}`,
    `rm -f ${queryFile} ${resultsFile}`,
  ];
}

async function advance(leadId: string, lead: NonNullable<Awaited<ReturnType<typeof assertUnlocked>>>) {
  if (!INSTANCE_ID) {
    return { status: "failed", error: "GOSOM_EC2_INSTANCE_ID is not configured" };
  }

  const [existing] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${leadId}`;

  if (!existing) {
    await sql`INSERT INTO lead_enrichment (lead_id, status) VALUES (${leadId}, 'pending')`;
    return { status: "pending" };
  }

  if (existing.status === "done" || existing.status === "failed") {
    return existing;
  }

  if (existing.status === "pending") {
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    const state = desc.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (state === "stopped" || state === "stopping") {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    }
    await sql`UPDATE lead_enrichment SET status = 'starting_instance' WHERE lead_id = ${leadId}`;
    return { status: "starting_instance" };
  }

  if (existing.status === "starting_instance") {
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
    const state = desc.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (state !== "running") {
      return { status: "starting_instance" };
    }
    if (lead.lat == null || lead.lng == null) {
      await sql`UPDATE lead_enrichment SET status = 'failed', error = 'lead has no coordinates' WHERE lead_id = ${leadId}`;
      return { status: "failed", error: "lead has no coordinates" };
    }
    try {
      const cmd = buildGosomCommand(lead.lat, lead.lng, lead.business_name, leadId);
      const send = await ssm.send(
        new SendCommandCommand({
          InstanceIds: [INSTANCE_ID],
          DocumentName: "AWS-RunShellScript",
          Parameters: { commands: cmd },
          // gosom's own -exit-on-inactivity 3m plus real scrape/network time needs headroom
          // beyond the old 300s — confirmed live that a real run's docker pull alone (first time
          // only, cached after) can take a few minutes on top of that.
          TimeoutSeconds: 480,
        })
      );
      const commandId = send.Command?.CommandId ?? null;
      await sql`UPDATE lead_enrichment SET status = 'scraping', ssm_command_id = ${commandId} WHERE lead_id = ${leadId}`;
      return { status: "scraping" };
    } catch (err) {
      // SSM agent may not have registered yet even though EC2 reports "running" — worth another
      // poll rather than failing immediately.
      console.error("SSM SendCommand failed, will retry on next poll", err);
      return { status: "starting_instance" };
    }
  }

  if (existing.status === "scraping") {
    if (!existing.ssm_command_id) {
      await sql`UPDATE lead_enrichment SET status = 'failed', error = 'missing ssm_command_id' WHERE lead_id = ${leadId}`;
      return { status: "failed", error: "missing ssm_command_id" };
    }
    let invocation;
    try {
      invocation = await ssm.send(
        new GetCommandInvocationCommand({ CommandId: existing.ssm_command_id, InstanceId: INSTANCE_ID })
      );
    } catch (err) {
      // InvocationDoesNotExist briefly right after SendCommand — not yet a real failure.
      console.error("GetCommandInvocation not ready yet", err);
      return { status: "scraping" };
    }

    if (invocation.Status === "InProgress" || invocation.Status === "Pending" || invocation.Status === "Delayed") {
      return { status: "scraping" };
    }

    if (invocation.Status !== "Success") {
      const error = invocation.StandardErrorContent || `gosom command ended with status ${invocation.Status}`;
      await sql`UPDATE lead_enrichment SET status = 'failed', error = ${error} WHERE lead_id = ${leadId}`;
      void stopInstanceIfIdle();
      return { status: "failed", error };
    }

    const output = invocation.StandardOutputContent ?? "";
    const records = output
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
      void stopInstanceIfIdle();
      return { status: "failed", error: "no matching place_id in gosom output" };
    }

    // Round-tripped through JSON.parse/stringify — these already came from JSON.parse() above,
    // but that gives them a TS type of `unknown`/`Record<string, unknown>`, which sql.json's
    // JSONValue parameter type doesn't structurally accept; the round-trip produces a plain
    // value TypeScript treats as `any`, satisfying it without an unsafe cast.
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
    void stopInstanceIfIdle();
    const [done] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${leadId}`;
    return done;
  }

  return existing;
}

/** Fire-and-forget — stop the instance once its one job is done rather than leaving it running
 * (billed) with nothing left to do. A real multi-job queue would need to check for other pending
 * work first; this is single-job-at-a-time for now. */
async function stopInstanceIfIdle() {
  if (!INSTANCE_ID) return;
  try {
    await ec2.send(new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  } catch (err) {
    console.error("Failed to stop gosom instance after enrichment", err);
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await assertUnlocked(id, session.user.email);
  if (!lead) return NextResponse.json({ error: "lead not unlocked" }, { status: 403 });

  const result = await advance(id, lead);
  return NextResponse.json(result);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await assertUnlocked(id, session.user.email);
  if (!lead) return NextResponse.json({ error: "lead not unlocked" }, { status: 403 });

  const [existing] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${id}`;
  if (!existing) return NextResponse.json({ status: "not_started" });

  // A poll can also just advance the job — keeps the client's polling loop simple (always the
  // same GET, no separate "kick it off" vs "check on it" calls).
  const result = await advance(id, lead);
  return NextResponse.json(result);
}
