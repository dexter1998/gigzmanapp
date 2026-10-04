import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, CardRow, StatCard, Section, Table, Pill, fmtDT, fmtN } from "../../../admin/ui";
import { IconRoute, IconMailOpened, IconClick, IconShieldCheck } from "@tabler/icons-react";
import { classifyBounce } from "@/lib/outreach/events";

/**
 * One person's full journey: every touch we sent and every event SES reported back.
 *
 * The funnel on the campaign page answers "where is everybody". This answers the question that
 * actually comes up when something looks wrong — "what happened to THIS person" — which no
 * aggregate can, because the interesting cases are always individual: the address that bounced on
 * touch 3 after opening twice, the lead that clicked once and then went quiet.
 *
 * Joined on ses_message_id, the only identifier shared between what we sent (email_sends) and
 * what SES told us (email_events).
 */

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ email?: string }> };

function bounceDetail(raw: unknown): string | null {
  const r = raw as { bounce?: { bounceType?: string; bounceSubType?: string } } | null;
  if (!r?.bounce) return null;
  const kind = classifyBounce(r.bounce.bounceType ?? null, r.bounce.bounceSubType ?? null);
  // Spelled out because the distinction is the whole point: SES reports an Auto Validation
  // refusal as Bounce/Permanent, identically to a dead mailbox, and only the subtype separates
  // "SES declined to send this" from "a mail server rejected it".
  const explain: Record<string, string> = {
    validation_suppressed: "SES Auto Validation ne bhejne se pehle roka — kisi mail server tak pahuncha hi nahi",
    hard_mta: "asli hard bounce — mail server ne mana kiya",
    on_suppression_list: "humari apni SES suppression list par tha",
    content_rejected: "content reject hua — message ka masla hai, address ka nahi",
    mailbox_full: "mailbox bhara hua",
    transient: "temporary failure",
  };
  return `${r.bounce.bounceType}/${r.bounce.bounceSubType} — ${explain[kind] ?? kind}`;
}

export default async function LeadJourneyPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { email } = await searchParams;

  if (!email) {
    const recent = await sql`
      SELECT email, state, verification_status, touch_count, opened_distinct, clicked_distinct, last_event_at
      FROM campaign_recipients WHERE campaign_id = ${id}
      ORDER BY last_event_at DESC NULLS LAST LIMIT 40
    `;
    return (
      <>
        <PageHeader
          pretitle="Campaign"
          title="Lead journey"
          sub="Kisi ek lead ka poora safar — jo bheja aur jo SES ne wapas bataya."
          actions={<Link href={`/admin-campaigns/${id}`} className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline">← Campaign</Link>}
        />
        <div className="">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mb-3 flex flex-wrap gap-3">
              <Section title="Kis lead ko dekhna hai?" note="Neeche sabse recent activity wale leads hain.">
                <form method="get" className="flex flex-wrap items-end gap-2">
                  <div className="">
                    <input type="email" name="email" className="w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-2 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]" placeholder="email@example.com" required style={{ minWidth: 280 }} />
                  </div>
                  <div className=""><button type="submit" className="inline-flex items-center rounded-full border-0 bg-[var(--accent)] px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-ink)]">Dekho</button></div>
                </form>
              </Section>
              <Table
                title="Recent activity"
                head={["Email", "State", "Verification", { label: "Touches", num: true }, { label: "Opened", num: true }, { label: "Clicked", num: true }, "Last event"]}
                rows={recent.map((r) => [
                  <Link key="e" href={`/admin-campaigns/${id}/lead?email=${encodeURIComponent(r.email)}`} className="font-semibold text-[var(--ink)] no-underline">{r.email}</Link>,
                  <Pill key="s" tone={r.state === "converted" ? "ok" : r.state === "suppressed" ? "bad" : r.state === "hot" ? "ok" : r.state === "warm" ? "warn" : "info"}>{r.state}</Pill>,
                  <span key="v" className="text-[var(--ink-muted)]">{r.verification_status}</span>,
                  fmtN(r.touch_count), fmtN(r.opened_distinct), fmtN(r.clicked_distinct),
                  fmtDT(r.last_event_at),
                ])}
                empty="is campaign mein abhi koi recipient nahi hai"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  const [[lead], timeline] = await Promise.all([
    sql`
      SELECT email, state, verification_status, touch_count, delivered_count, opened_distinct,
             clicked_distinct, bounce_kind, transient_bounces, do_not_send, do_not_send_reason,
             next_due_at, stalled_at, stalled_reason, recycle_eligible_at, last_meaningful_response
      FROM campaign_recipients WHERE campaign_id = ${id} AND email = ${email}
    `,
    // Sends and their events in one ordered stream. A send with no events after it is itself the
    // finding — that is a message SES accepted and then never reported on.
    sql`
      SELECT es.sent_at AS at, 'Sent' AS kind, es.step_key AS detail, es.touch_no, es.config_set, NULL::jsonb AS raw
      FROM email_sends es WHERE es.campaign_id = ${id} AND es.recipient = ${email}
      UNION ALL
      SELECT ee.occurred_at, ee.event_type, coalesce(ee.link, ''), es.touch_no, es.config_set, ee.raw
      FROM email_events ee
      JOIN email_sends es ON es.ses_message_id = ee.ses_message_id
      WHERE es.campaign_id = ${id} AND es.recipient = ${email}
      ORDER BY at ASC NULLS LAST
    `,
  ]);

  if (!lead) {
    return (
      <>
        <PageHeader pretitle="Campaign" title="Lead journey" actions={<Link href={`/admin-campaigns/${id}/lead`} className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline">← Search</Link>} />
        <div className=""><div className="mx-auto w-full max-w-[1400px]"><div className="mb-3 flex flex-wrap gap-3">
          <Section title="Nahi mila"><p className="m-0 text-[12px] text-[var(--ink-muted)]">{email} is campaign mein nahi hai.</p></Section>
        </div></div></div>
      </>
    );
  }

  const stateTone = lead.state === "converted" ? "ok" : lead.state === "suppressed" ? "bad"
    : lead.state === "hot" ? "ok" : lead.state === "warm" ? "warn" : "info";

  return (
    <>
      <PageHeader
        pretitle="Lead journey"
        title={lead.email}
        sub={<>{lead.verification_status}{lead.bounce_kind ? ` · ${lead.bounce_kind}` : ""}</>}
        actions={
          <>
            <Link href={`/admin-campaigns/${id}/lead`} className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline">← Search</Link>
            <Pill tone={stateTone}>{lead.state}</Pill>
          </>
        }
      />
      <div className="">
        <div className="mx-auto w-full max-w-[1400px]">
          <CardRow>
            <StatCard label="Touches" value={fmtN(lead.touch_count)} detail={`${fmtN(lead.delivered_count)} delivered`} icon={<IconRoute size={20} />} />
            <StatCard label="Opened" value={fmtN(lead.opened_distinct)} detail="distinct messages, events nahi" icon={<IconMailOpened size={20} />} />
            <StatCard
              label="Clicked"
              value={fmtN(lead.clicked_distinct)}
              detail={lead.clicked_distinct > 0 ? "asli intent signal" : "abhi tak nahi"}
              tone={lead.clicked_distinct > 0 ? "up" : undefined}
              icon={<IconClick size={20} />}
            />
            <StatCard
              label="Bhej sakte hain?"
              value={lead.do_not_send ? "Nahi" : "Haan"}
              detail={lead.do_not_send ? lead.do_not_send_reason : `agla touch ${fmtDT(lead.next_due_at)}`}
              tone={lead.do_not_send ? "bad" : "up"}
              icon={<IconShieldCheck size={20} />}
            />
          </CardRow>

          <div className="mb-3 flex flex-wrap gap-3">
            <Section title="Agla kya hoga" note="Rule engine isi par faisla karega." col="col-12 col-xl-4">
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[140px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Agla touch due</div><div className="mt-0.5 text-[13px] text-[var(--ink)]">{fmtDT(lead.next_due_at)}</div></div>
                <div className="min-w-[140px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Aakhri asli response</div><div className="mt-0.5 text-[13px] text-[var(--ink)]">{fmtDT(lead.last_meaningful_response)}</div></div>
                <div className="min-w-[140px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Stalled</div><div className="mt-0.5 text-[13px] text-[var(--ink)]">{lead.stalled_at ? `${fmtDT(lead.stalled_at)} — ${lead.stalled_reason}` : "—"}</div></div>
                <div className="min-w-[140px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Dobara eligible</div><div className="mt-0.5 text-[13px] text-[var(--ink)]">{fmtDT(lead.recycle_eligible_at)}</div></div>
                <div className="min-w-[140px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Transient bounces</div><div className="tnum mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{fmtN(lead.transient_bounces)}</div></div>
              </div>
            </Section>

            <Section title="Timeline" note="Jo humne bheja aur SES ne jo wapas bataya — ek hi dhaare mein." col="col-12 col-xl-8">
              <ul className="jt-list">
                {timeline.map((t, i) => (
                  <li className="jt-item" key={i}>
                    <span className="jt-when">{fmtDT(t.at)}</span>
                    <span className={`jt-what jt-${t.kind}`}>
                      {t.kind}{t.touch_no ? ` · touch ${t.touch_no}` : ""}
                    </span>
                    <span className="jt-detail">
                      {t.kind === "Bounce" ? bounceDetail(t.raw) ?? t.detail : t.detail}
                      {t.kind === "Sent" && t.config_set ? ` · ${t.config_set}` : ""}
                    </span>
                  </li>
                ))}
                {timeline.length === 0 && <li className="jt-item"><span className="jt-detail">koi event nahi</span></li>}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}
