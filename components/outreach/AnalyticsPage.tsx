"use client";

/** Analytics: all campaigns with their results; open one for per-touch numbers and what's queued next. */

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CalendarClock, ArrowUpRight } from "lucide-react";
import { STATUS_LABEL, CH_ICON } from "./CampaignsPage";

type C = { id: string; name: string; status: string; listName: string | null; touches: number;
  stats: { recipients: number; queued: number; sent: number; opened: number; replied: number; bounced: number; skipped: number; nextDue: string | null } };
type T = { touch: number; channel: string; day: number; subject: string | null; sent: number; queued: number; opened: number; replied: number; bounced: number; skipped: number; nextDue: string | null };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

export function AnalyticsPage() {
  const [data, setData] = useState<{ campaigns: C[]; perTouch: Record<string, T[]> } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { fetch("/api/v2/outreach/analytics").then((r) => r.json()).then(setData).catch(() => setData({ campaigns: [], perTouch: {} })); }, []);
  const cs = data?.campaigns ?? [];
  const sum = (k: keyof C["stats"]) => cs.reduce((n, c) => n + Number(c.stats[k] ?? 0), 0);
  const active = cs.filter((c) => ["running", "scheduled"].includes(c.status)).length;

  return (
    <div className="ox-page wide">
      <header className="ox-head"><div><h1>Analytics</h1><p>How every campaign is doing — and what goes out next.</p></div></header>
      <div className="ox-kpis">
        <div><span>Active campaigns</span><b>{active}</b><em>{cs.filter((c) => c.status === "paused").length} paused</em></div>
        <div><span>Messages sent</span><b>{sum("sent")}</b><em>{sum("queued")} queued</em></div>
        <div><span>Open rate</span><b>{pct(sum("opened"), sum("sent"))}</b><em>{sum("opened")} opened</em></div>
        <div><span>Reply rate</span><b>{pct(sum("replied"), sum("sent"))}</b><em>{sum("replied")} replies</em></div>
        <div><span>Bounced</span><b>{pct(sum("bounced"), sum("sent"))}</b><em>{sum("bounced")} bounced</em></div>
      </div>
      <div className="v2-tablebox v2-lms-table">
        <table className="v2-ltable">
          <thead><tr><th /><th>Campaign</th><th>Status</th><th className="num">Leads</th><th className="num">Sent</th><th className="num">Opened</th><th className="num">Replied</th><th className="num">Bounced</th><th>Next message</th></tr></thead>
          <tbody>
            {cs.map((c) => (
              <Fragment key={c.id}>
                <tr className="v2-lrow" onClick={() => setOpen(open === c.id ? null : c.id)}>
                  <td className="cb">{open === c.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                  <td><b>{c.name}</b><div className="v2-muted2">{c.listName ?? "—"}</div></td>
                  <td><span className={`ox-cstatus s-${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                  <td className="num">{c.stats.recipients || "—"}</td><td className="num">{c.stats.sent}</td>
                  <td className="num">{c.stats.opened} <span className="v2-muted2">{pct(c.stats.opened, c.stats.sent)}</span></td>
                  <td className="num">{c.stats.replied} <span className="v2-muted2">{pct(c.stats.replied, c.stats.sent)}</span></td>
                  <td className="num">{c.stats.bounced}</td>
                  <td className="v2-muted2">{c.stats.nextDue ? <span className="ox-next"><CalendarClock size={13} /> {when(c.stats.nextDue)} · {c.stats.queued} queued</span> : c.status === "paused" ? "Paused" : "—"}</td>
                </tr>
                {open === c.id && (
                  <tr className="ox-detail"><td colSpan={9}>
                    <table className="ox-touches">
                      <thead><tr><th>Touch</th><th>Day</th><th>Message</th><th className="num">Sent</th><th className="num">Queued</th><th className="num">Opened</th><th className="num">Replied</th><th className="num">Skipped</th><th>Next</th></tr></thead>
                      <tbody>
                        {(data?.perTouch[c.id] ?? []).map((t) => { const I = CH_ICON[t.channel]; return (
                          <tr key={t.touch}><td><span className="ox-chs"><I size={14} /> {t.touch}</span></td><td>Day {t.day}</td><td className="v2-muted2">{t.subject ?? t.channel}</td>
                            <td className="num">{t.sent}</td><td className="num">{t.queued}</td><td className="num">{t.opened}</td><td className="num">{t.replied}</td><td className="num">{t.skipped}</td><td className="v2-muted2">{when(t.nextDue)}</td></tr>
                        ); })}
                      </tbody>
                    </table>
                    <Link href={`/campaigns/${c.id}`} className="ox-help">Open campaign <ArrowUpRight size={12} /></Link>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {data && !cs.length && <tr><td colSpan={9} className="v2-empty">No campaigns yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
