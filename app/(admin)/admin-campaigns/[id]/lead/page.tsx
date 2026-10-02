import Link from "next/link";
import { sql } from "@/lib/db";
import { Section, Table, Pill, fmtDT, fmtN } from "../../../admin/ui";
import { classifyBounce } from "@/lib/outreach/events";

/**
 * One person's full journey: every touch we sent and every event SES reported back.
 *
 * The funnel on the campaign page answers "where is everybody". This answers the question that
 * actually comes up when something looks wrong — "what happened to THIS person" — which no
 * aggregate can, because the interesting cases are always the individual ones: the address that
 * bounced on touch 3 after opening twice, the lead that clicked and then went quiet.
 *
 * Joined on ses_message_id, which is the only identifier shared between what we sent
 * (email_sends) and what SES told us (email_events).
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
        <div className="adm-head"><h1>Lead journey</h1><Link href={`/admin-campaigns/${id}`}>← campaign</Link></div>
        <Section title="Kis lead ko dekhna hai?" note="Neeche sabse recent activity wale leads hain. Kisi par click karo.">
          <form method="get" style={{ marginBottom: 12 }}>
            <input type="email" name="email" placeholder="email@example.com" required
              style={{ padding: "6px 10px", minWidth: 280, borderRadius: 8, border: "1px solid var(--g-line)" }} />
            <button type="submit" style={{ marginLeft: 8, padding: "6px 14px" }}>Dekho</button>
          </form>
          <Table
            head={["Email", "State", "Verification", { label: "Touches", num: true }, { label: "Opened", num: true }, { label: "Clicked", num: true }, "Last event"]}
            rows={recent.map((r) => [
              <Link key="e" href={`/admin-campaigns/${id}/lead?email=${encodeURIComponent(r.email)}`}>{r.email}</Link>,
              r.state, r.verification_status,
              fmtN(r.touch_count), fmtN(r.opened_distinct), fmtN(r.clicked_distinct),
              fmtDT(r.last_event_at),
            ])}
            empty="is campaign mein abhi koi recipient nahi hai"
          />
        </Section>
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
        <div className="adm-head"><h1>Lead journey</h1><Link href={`/admin-campaigns/${id}/lead`}>← search</Link></div>
        <Section title="Nahi mila"><p>{email} is campaign mein nahi hai.</p></Section>
      </>
    );
  }

  return (
    <>
      <div className="adm-head">
        <h1>{lead.email}</h1>
        <Link href={`/admin-campaigns/${id}`}>← campaign</Link>
      </div>

      <div className="adm-cards">
        <div className="adm-card"><div className="k">State</div><div className="v"><Pill tone={lead.state === "converted" ? "ok" : lead.state === "suppressed" ? "bad" : lead.state === "hot" ? "ok" : "info"}>{lead.state}</Pill></div></div>
        <div className="adm-card"><div className="k">Verification</div><div className="v" style={{ fontSize: 14 }}>{lead.verification_status}</div>{lead.bounce_kind && <div className="d">{lead.bounce_kind}</div>}</div>
        <div className="adm-card"><div className="k">Touches</div><div className="v">{fmtN(lead.touch_count)}</div><div className="d">{fmtN(lead.delivered_count)} delivered</div></div>
        <div className="adm-card"><div className="k">Engagement</div><div className="v" style={{ fontSize: 14 }}>{fmtN(lead.opened_distinct)} open · {fmtN(lead.clicked_distinct)} click</div><div className="d">distinct messages, events nahi</div></div>
      </div>

      <Section title="Agla kya hoga" note="Rule engine isi par faisla karega.">
        <Table
          head={["Field", "Value"]}
          rows={[
            ["Bhej sakte hain?", lead.do_not_send ? <Pill key="d" tone="bad">nahi — {lead.do_not_send_reason}</Pill> : <Pill key="d" tone="ok">haan</Pill>],
            ["Agla touch due", fmtDT(lead.next_due_at)],
            ["Aakhri asli response", fmtDT(lead.last_meaningful_response)],
            ["Stalled", lead.stalled_at ? `${fmtDT(lead.stalled_at)} — ${lead.stalled_reason}` : "—"],
            ["Dobara eligible", fmtDT(lead.recycle_eligible_at)],
            ["Transient bounces", fmtN(lead.transient_bounces)],
          ]}
          empty="—"
        />
      </Section>

      <Section title="Timeline" note="Jo humne bheja aur SES ne jo wapas bataya — dono ek hi dhaare mein.">
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
    </>
  );
}
