/**
 * "Mantis V2 is live" founder note to every real Mantis user, from tarun@mantisai.in.
 *
 *   npx tsx --env-file=.env.local scripts/send-v2-launch-email.ts                      # dry run (default)
 *   npx tsx --env-file=.env.local scripts/send-v2-launch-email.ts --csv /path/out.csv  # dry run, CSV where you want it
 *   npx tsx --env-file=.env.local scripts/send-v2-launch-email.ts --test you@x.com [--name Tarun]
 *   npx tsx --env-file=.env.local scripts/send-v2-launch-email.ts --send [--limit N]
 *
 * Needs the SSM tunnel first: scripts/prod-tunnel.sh (and AWS_PROFILE=dhando-dev for the secret).
 *
 * Who gets it: user_profiles rows, minus
 *   - invalid addresses and domains with no MX record,
 *   - internal / test / founder accounts (INTERNAL_* below),
 *   - throwaway mailboxes (lib/disposable-email: bundled list + the signup heuristic),
 *   - email+password signups that never confirmed their code (address never proven — same rule as
 *     lib/lifecycle-email.ts),
 *   - accounts with a pending/approved deletion request,
 *   - anyone unsubscribed from any stream EXCEPT cold-outreach-only opt-outs (agency_invite / prospect_cold),
 *   - any address with a Permanent bounce or a Complaint in email_events,
 *   - anything on the SES account-level suppression list. Mailing a suppressed address is counted
 *     by SES as a Bounce, indistinguishable from a real one, so this is checked live per address.
 *
 * Idempotent: sendBulkEmail claims (recipient, campaign_id, step_key) in email_sends before it
 * sends, so a rerun skips everyone already mailed. Stops on bounce/complaint signals (see
 * STOP_*). Sends through the mantis-transactional configuration set — set explicitly because
 * SES_CONFIGURATION_SET only exists in the App Runner env, not on a laptop, and a send without a
 * set produces no bounce/complaint events at all.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveMx } from "node:dns/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useProdDb } from "../lib/db-prod";
import { isDisposableEmail } from "../lib/disposable-email";
import {
  V2_LAUNCH_HTML, V2_LAUNCH_TEXT, V2_LAUNCH_SUBJECT, V2_LAUNCH_SENDER, V2_LAUNCH_REPLY_TO,
} from "../lib/email/v2-launch";

const run = promisify(execFile);

const CAMPAIGN_ID = "v2_launch_2026_10";
const STEP_KEY = "v2_launch";
const TEMPLATE = "v2_launch_founder_note";
/** Product announcements. Honours opt-outs from this stream and from 'all'. */
const STREAM = "product_updates";
const CONFIG_SET = "mantis-transactional";
const REGION = "ap-south-1";

/** SES allows 25/s on this account; a founder note has no reason to go anywhere near that. */
const SEND_INTERVAL_MS = 250;
const CHECK_EVERY = 25;
/** This run's own hard bounces / complaints, from email_events (SNS-fed, lags a minute or two). */
const STOP_CAMPAIGN_BOUNCE_RATE = 0.03;
const STOP_CAMPAIGN_MIN_BOUNCES = 3;
const STOP_CAMPAIGN_COMPLAINTS = 2;
/** Account-wide reputation (CloudWatch). Well short of AWS's 10% / 0.5% review lines — sign-in
 *  codes share this account. */
const STOP_ACCOUNT_BOUNCE_RATE = 0.05;
const STOP_ACCOUNT_COMPLAINT_RATE = 0.001;

/** Founder, team and test accounts — never customers. */
const INTERNAL_EMAILS = new Set([
  "test@mantisai.in", "tarun@mantisai.in", "tarun@gigzman.com",
  "blogy.reverblunt@gmail.com", "kumartarun276@gmail.com", // Tarun's own accounts
  "eyabag51409@aiaur.com",                                  // Tarun's temp-mail test signup
  "test-chat@example.com", "test-not-real-xyz@example.com",
  "mailtestne20@gmail.com",       // "Test Mail"
  "fanossstest@gmail.com",        // "Fanosss test"
  "dummyuseinterbiz@gmail.com",   // "dummyuse.interbiz"
  "temp12052000@gmail.com",       // "temporary account"
  "owner@dummyinbox.com",
]);
const INTERNAL_DOMAINS = new Set([
  "mantisai.in", "gigzman.com", "blogy.in", "blogyapp.com", "reverblunt.com",
  "example.com", "example.org", "example.net", "test.com",
]);
const TEST_LOCAL_PART =
  /^(test|qa|demo|dummy|fake|sample|deltest)([._+-]|\d|$)|\+test|mantis-throwaway|deltest/i;

/**
 * Throwaway domains seen on real Mantis signups that lib/disposable-domains.ts doesn't list
 * (temp-mail.io-style rotating domains), confirmed by the random "word+digits" local parts on them.
 */
const EXTRA_DISPOSABLE_DOMAINS = new Set([
  "dreameg.com", "iconcubic.com", "proguidex.com", "moravita.com", "aiaur.com", "tempumail.cv",
]);
const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com",
  "qq.com", "proton.me", "protonmail.com", "zoho.com", "rediffmail.com", "aol.com",
]);
/** A temp-mail generator's address shape ("yocene3084", "gisog39661") on a non-freemail domain.
 *  Real business addresses on their own domain essentially never look like this. */
function looksGeneratedTempMail(local: string, domain: string): boolean {
  return !FREEMAIL.has(domain) && /^[a-z]{4,8}\d{3,5}$/.test(local);
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

// ---------------------------------------------------------------------------------------------
// First names

/** Words that mark an account name as a business, a handle or junk rather than a person. */
const NOT_A_PERSON = new RegExp(
  "\\b(" + [
    "digital", "digi", "tech", "techno", "technology", "technologies", "media", "solution", "solutions",
    "infosolutions", "infotech", "studio", "studios", "agency", "design", "designs", "services",
    "service", "lab", "labs", "marketing", "web", "webz", "seo", "pvt", "ltd", "llp", "inc", "llc",
    "business", "group", "team", "admin", "test", "dummy", "developer", "dev", "support", "sales",
    "official", "training", "medicine", "online", "gamer", "warriors", "tales", "brnd", "development",
    "pulse", "avenue", "asia", "rock", "man", "bro", "world", "learning", "pharma", "growth", "hub",
    "info", "hr", "contact", "enterprises", "consultancy", "unknown", "uknown", "hola", "soporte",
    "temporary", "account", "webtek", "school", "kids", "directory", "global", "internet", "systems", "mail",
  ].join("|") + ")\\b",
  "i"
);
/** Single-token brand/handle names seen in production that no word list catches. */
const HANDLES = new Set([
  "nextinseo", "halper", "nextschool", "socilet", "designhub", "codetocraft", "contactleadboba",
  "entwicklera", "orbitpixelstudio", "webcoss", "ubingaga", "avrgrowth", "tmcybertech",
  "tekosep", "akankshaswiss", "nexylink", "selfstart", "gynex", "jagurix", "skystorm", "lequas",
  "amoweb", "yourneeds", "infidigit", "imantran", "upright", "trendzcore", "jhajha",
  "betostudios", "dieslovo", "butt", "trippie", "aristo",
]);
const TITLES = new Set(["mr", "mrs", "ms", "dr", "er", "sri", "shri", "smt"]);

function cap(w: string): string {
  return w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase();
}

/** First name if the account name reads like a person's, else "there". */
export function firstNameOf(name: string | null): string {
  const raw = (name ?? "").replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "there";
  if (NOT_A_PERSON.test(raw)) return "there";
  // Scripts we can't reliably split into a first name (Arabic reads right-to-left, CJK has no
  // spaces between given and family name) get the neutral greeting rather than a wrong one.
  if (/[؀-ۿ一-鿿぀-ヿ가-힯]/.test(raw)) return "there";
  const tokens = raw.split(" ").map((t) => t.replace(/[^\p{L}'-]/gu, "")).filter(Boolean);
  const pick = tokens.find((t) => t.length > 2 && !TITLES.has(t.toLowerCase()))
    ?? tokens.find((t) => t.length > 1 && !TITLES.has(t.toLowerCase()));
  if (!pick) return "there";
  if (HANDLES.has(pick.toLowerCase())) return "there";
  // Vietnamese names put the family name first; the first token would be "Nguyễn" for half of them.
  if (/[\u1EA0-\u1EF9\u01A0\u01A1\u01AF\u01B0\u0110\u0111]/.test(raw)) return "there";
  if (pick.length > 15) return "there";
  return cap(pick);
}

// ---------------------------------------------------------------------------------------------

type Profile = {
  email: string; name: string | null; created_at: Date; email_verified: boolean;
  has_password: boolean; is_synthetic_email: boolean;
};
type Kept = { email: string; name: string; first_name: string; signup_date: string; reason_kept: string };
type Excluded = { email: string; name: string; reason: string };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function csv(rows: Record<string, string>[], cols: string[]): string {
  const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c] ?? "")).join(","))].join("\n") + "\n";
}

/** "suppressed:BOUNCE" / "ok" / "error:<msg>" for one address, from the SES account list. */
async function sesSuppression(email: string): Promise<string> {
  try {
    const { stdout } = await run("aws", [
      "sesv2", "get-suppressed-destination", "--email-address", email, "--region", REGION,
      "--query", "SuppressedDestination.Reason", "--output", "text",
    ], { env: process.env });
    return `suppressed:${stdout.trim()}`;
  } catch (err) {
    const msg = String((err as { stderr?: string }).stderr ?? err);
    if (/NotFoundException/.test(msg)) return "ok";
    return `error:${msg.trim().slice(0, 120)}`;
  }
}

async function mapLimit<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function hasMx(domain: string): Promise<boolean> {
  try { return (await resolveMx(domain)).length > 0; } catch { return false; }
}

async function main() {
  const doSend = process.argv.includes("--send");
  const testTo = arg("--test");
  const limit = Number(arg("--limit") ?? Infinity);
  const outCsv = arg("--csv") ?? join(tmpdir(), "v2-launch-recipients.csv");
  if (doSend && testTo) throw new Error("--send and --test are exclusive");

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");

  const fill = (s: string, first: string) => s.replaceAll("{{first_name}}", first);

  // ---- one test send ---------------------------------------------------------------------
  if (testTo) {
    const to = testTo.trim().toLowerCase();
    const sup = await sesSuppression(to);
    if (sup !== "ok") throw new Error(`refusing test send to ${to}: SES ${sup}`);
    const first = arg("--name") ?? "Tarun";
    const res = await sendBulkEmail({
      to, subject: fill(V2_LAUNCH_SUBJECT, first),
      html: fill(V2_LAUNCH_HTML, first), text: fill(V2_LAUNCH_TEXT, first),
      // Its own campaign id so a test can never mark a real recipient as already sent.
      campaignId: `${CAMPAIGN_ID}_test`, stepKey: `test-${Date.now()}`,
      template: TEMPLATE, stream: STREAM, sender: V2_LAUNCH_SENDER, replyTo: V2_LAUNCH_REPLY_TO,
      configSet: CONFIG_SET,
    });
    const [row] = await sql`SELECT ses_message_id FROM email_sends
      WHERE recipient = ${to} AND campaign_id = ${`${CAMPAIGN_ID}_test`} ORDER BY sent_at DESC LIMIT 1`;
    console.log(`test → ${to}: ${res.sent ? "sent" : `not sent (${res.reason})`}  ses_message_id=${row?.ses_message_id ?? "-"}`);
    await sql.end();
    return;
  }

  // ---- build the list ----------------------------------------------------------------------
  const profiles = (await sql`
    SELECT email, name, created_at, email_verified, (password_hash IS NOT NULL) AS has_password,
           is_synthetic_email
      FROM user_profiles ORDER BY created_at`) as unknown as Profile[];
  const allEmails = profiles.map((p) => p.email);
  const lowerEmails = [...new Set(allEmails.map((e) => e.trim().toLowerCase()))];
  const both = [...new Set([...allEmails, ...lowerEmails])];

  const deletions = new Set(((await sql`
    SELECT DISTINCT lower(user_email) AS e FROM account_deletion_requests
     WHERE status IN ('pending', 'approved')`) as unknown as { e: string }[]).map((r) => r.e));
  const unsubs = new Map<string, string>();
  for (const r of (await sql`SELECT lower(email) AS e, stream FROM email_unsubscribes
      WHERE lower(email) = ANY(${lowerEmails})`) as unknown as { e: string; stream: string }[]) {
    unsubs.set(r.e, [unsubs.get(r.e), r.stream].filter(Boolean).join("+"));
  }
  console.log("reading email_events for these addresses (no recipient index — ~1-2 min)…");
  const events = (await sql`
    SELECT lower(recipient) AS e, event_type, raw->'bounce'->>'bounceType' AS bt
      FROM email_events
     WHERE event_type IN ('Bounce', 'Complaint', 'Delivery') AND recipient = ANY(${both})`) as unknown as
    { e: string; event_type: string; bt: string | null }[];
  const hardBounced = new Set(events.filter((x) => x.event_type === "Bounce" && x.bt === "Permanent").map((x) => x.e));
  const complained = new Set(events.filter((x) => x.event_type === "Complaint").map((x) => x.e));
  const delivered = new Set(events.filter((x) => x.event_type === "Delivery").map((x) => x.e));
  const alreadySent = new Set(((await sql`
    SELECT DISTINCT lower(recipient) AS e FROM email_sends
     WHERE campaign_id = ${CAMPAIGN_ID} AND step_key = ${STEP_KEY}`) as unknown as { e: string }[]).map((r) => r.e));

  const kept: (Kept & { _p: Profile })[] = [];
  const excluded: Excluded[] = [];
  const seen = new Set<string>();
  const drop = (p: Profile, reason: string) => excluded.push({ email: p.email, name: p.name ?? "", reason });

  for (const p of profiles) {
    const e = p.email.trim().toLowerCase();
    const domain = e.split("@")[1] ?? "";
    const local = e.split("@")[0] ?? "";
    if (seen.has(e)) { drop(p, "duplicate"); continue; }
    seen.add(e);
    if (!EMAIL_RE.test(e)) { drop(p, "invalid email"); continue; }
    if (INTERNAL_EMAILS.has(e) || INTERNAL_DOMAINS.has(domain) || TEST_LOCAL_PART.test(local)) { drop(p, "internal/test account"); continue; }
    if (isDisposableEmail(e) || EXTRA_DISPOSABLE_DOMAINS.has(domain) || looksGeneratedTempMail(local, domain)) { drop(p, "disposable/temp-mail"); continue; }
    if (p.is_synthetic_email) { drop(p, "synthetic (phone-only) email"); continue; }
    if (p.has_password && !p.email_verified) { drop(p, "email signup never verified"); continue; }
    if (deletions.has(e)) { drop(p, "deletion requested"); continue; }
    // Founder decision 2026-10-23: an opt-out from COLD outreach only (agency_invite, prospect_cold)
    // does not cover this product update to their own account; any other opt-out still excludes.
    const COLD_ONLY = new Set(["agency_invite", "prospect_cold"]);
    if (unsubs.has(e) && !(unsubs.get(e) as string).split("+").every((st) => COLD_ONLY.has(st))) { drop(p, `unsubscribed (${unsubs.get(e)})`); continue; }
    if (complained.has(e)) { drop(p, "complaint on record"); continue; }
    if (hardBounced.has(e)) { drop(p, "hard bounce on record"); continue; }
    kept.push({
      email: e, name: p.name ?? "", first_name: firstNameOf(p.name),
      signup_date: p.created_at.toISOString().slice(0, 10),
      reason_kept: [
        p.has_password ? "verified email signup" : "Google sign-in",
        delivered.has(e) ? "prior delivery on record" : "no prior mail",
      ].join("; "),
      _p: p,
    });
  }

  // Network checks on the survivors only.
  const domains = [...new Set(kept.map((k) => k.email.split("@")[1]))];
  const mx = new Map(await mapLimit(domains, 8, async (d) => [d, await hasMx(d)] as const));
  console.log(`checking ${kept.length} addresses against the SES suppression list…`);
  const sup = await mapLimit(kept, 8, (k) => sesSuppression(k.email));
  const final: Kept[] = [];
  kept.forEach((k, i) => {
    const { _p, ...row } = k;
    if (!mx.get(k.email.split("@")[1])) return void drop(_p, "domain has no MX");
    if (sup[i].startsWith("suppressed")) return void drop(_p, `SES suppressed (${sup[i].split(":")[1]})`);
    if (sup[i].startsWith("error")) return void drop(_p, `SES suppression check failed`);
    final.push(row);
  });

  writeFileSync(outCsv, csv(final, ["email", "name", "first_name", "signup_date", "reason_kept"]));
  const exclCsv = outCsv.replace(/\.csv$/, "") + "-excluded.csv";
  writeFileSync(exclCsv, csv(excluded, ["email", "name", "reason"]));

  const byReason = new Map<string, number>();
  for (const x of excluded) {
    const key = x.reason.startsWith("unsubscribed") ? "unsubscribed (any stream)" : x.reason;
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  const pending = final.filter((r) => !alreadySent.has(r.email));
  console.log(`\nuser_profiles: ${profiles.length}`);
  console.log(`kept:          ${final.length}  (already sent this campaign: ${final.length - pending.length})`);
  console.log(`excluded:      ${excluded.length}`);
  for (const [r, n] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${r}`);
  console.log(`greeting "there": ${final.filter((r) => r.first_name === "there").length}`);
  console.log(`\ncsv:      ${outCsv}\nexcluded: ${exclCsv}`);

  if (!doSend) { console.log("\nDRY RUN — nothing sent. Pass --send to send."); await sql.end(); return; }

  // ---- send ------------------------------------------------------------------------------
  const { CloudWatchClient, GetMetricStatisticsCommand } = await import("@aws-sdk/client-cloudwatch");
  const cw = new CloudWatchClient({ region: REGION });
  const reputation = async (metric: string) => {
    const r = await cw.send(new GetMetricStatisticsCommand({
      Namespace: "AWS/SES", MetricName: metric, StartTime: new Date(Date.now() - 2 * 3600_000),
      EndTime: new Date(), Period: 3600, Statistics: ["Maximum"],
    }));
    const p = (r.Datapoints ?? []).sort((a, b) => +(a.Timestamp ?? 0) - +(b.Timestamp ?? 0));
    return p.length ? (p[p.length - 1].Maximum ?? null) : null;
  };
  const campaignHealth = async () => {
    const [r] = await sql`
      SELECT count(*) FILTER (WHERE e.event_type = 'Bounce' AND e.raw->'bounce'->>'bounceType' = 'Permanent')::int AS hard,
             count(*) FILTER (WHERE e.event_type = 'Complaint')::int AS complaints
        FROM email_sends s JOIN email_events e ON e.ses_message_id = s.ses_message_id
       WHERE s.campaign_id = ${CAMPAIGN_ID}`;
    return r as { hard: number; complaints: number };
  };
  const preBounce = await reputation("Reputation.BounceRate");
  if (preBounce !== null && preBounce >= STOP_ACCOUNT_BOUNCE_RATE) {
    throw new Error(`account bounce rate already ${(preBounce * 100).toFixed(2)}% — not starting`);
  }

  let sent = 0, skipped = 0, failed = 0;
  const queue = pending.slice(0, limit);
  console.log(`\nsending ${queue.length} from ${V2_LAUNCH_SENDER} (reply-to ${V2_LAUNCH_REPLY_TO}), config set ${CONFIG_SET}`);
  for (const [i, r] of queue.entries()) {
    try {
      const res = await sendBulkEmail({
        to: r.email, subject: fill(V2_LAUNCH_SUBJECT, r.first_name),
        html: fill(V2_LAUNCH_HTML, r.first_name), text: fill(V2_LAUNCH_TEXT, r.first_name),
        campaignId: CAMPAIGN_ID, stepKey: STEP_KEY, template: TEMPLATE, stream: STREAM,
        sender: V2_LAUNCH_SENDER, replyTo: V2_LAUNCH_REPLY_TO, configSet: CONFIG_SET,
      });
      if (res.sent) sent++; else { skipped++; console.log(`  skip ${r.email}: ${res.reason}`); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended/i.test(msg)) { console.error("STOPPING: SES sending paused"); break; }
      failed++;
      console.error(`  fail ${r.email}: ${msg.slice(0, 140)}`);
      if (failed >= 5 && sent === 0) { console.error("STOPPING: 5 failures and nothing sent"); break; }
    }
    if ((i + 1) % CHECK_EVERY === 0) {
      const h = await campaignHealth();
      const b = await reputation("Reputation.BounceRate");
      const c = await reputation("Reputation.ComplaintRate");
      console.log(`  ${i + 1}/${queue.length}  sent ${sent} skip ${skipped} fail ${failed}  campaign hard-bounces ${h.hard} complaints ${h.complaints}  account bounce ${b == null ? "?" : (b * 100).toFixed(2) + "%"}`);
      if (h.hard >= STOP_CAMPAIGN_MIN_BOUNCES && h.hard / Math.max(sent, 1) >= STOP_CAMPAIGN_BOUNCE_RATE) { console.error("STOPPING: campaign bounce rate"); break; }
      if (h.complaints >= STOP_CAMPAIGN_COMPLAINTS) { console.error("STOPPING: complaints"); break; }
      if (b !== null && b >= STOP_ACCOUNT_BOUNCE_RATE) { console.error("STOPPING: account bounce rate"); break; }
      if (c !== null && c >= STOP_ACCOUNT_COMPLAINT_RATE) { console.error("STOPPING: account complaint rate"); break; }
    }
    await new Promise((res) => setTimeout(res, SEND_INTERVAL_MS));
  }
  console.log(`\ndone: sent ${sent}, skipped ${skipped}, failed ${failed}. Rerun is safe — already-sent rows are skipped.`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
