"use client";

import { useState } from "react";

const INPUT =
  "w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-2 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]";
const LABEL = "mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]";

/** Starter is 2,000 credits; the rest are the operator's call, so only Starter prefills. */
const DEFAULT_CREDITS: Record<string, number> = { free: 0, starter: 2000, pro: 4000, business: 10000 };

/**
 * The form is a client component for one reason: the confirm-email check has to be visible before
 * submitting, not a silent no-op afterwards. A server action that quietly does nothing when the
 * two fields disagree is indistinguishable from one that failed.
 */
export function GrantForm({
  action, plans, reasons, durations,
}: {
  action: (fd: FormData) => Promise<void>;
  plans: string[];
  reasons: string[];
  durations: readonly { days: number; label: string }[];
}) {
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plan, setPlan] = useState("starter");
  const [credits, setCredits] = useState(String(DEFAULT_CREDITS.starter));
  const [duration, setDuration] = useState(0);

  const match = email.trim().length > 0 && email.trim().toLowerCase() === confirm.trim().toLowerCase();

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <label className={LABEL} htmlFor="g-email">Account email</label>
          <input id="g-email" name="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 className={INPUT} placeholder="name@company.com" autoComplete="off" required />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className={LABEL} htmlFor="g-confirm">Type it again to confirm</label>
          <input id="g-confirm" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                 className={INPUT} placeholder="name@company.com" autoComplete="off" required />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[140px] flex-1">
          <label className={LABEL} htmlFor="g-plan">Plan</label>
          <select id="g-plan" name="plan" value={plan} className={INPUT}
                  onChange={(e) => { setPlan(e.target.value); setCredits(String(DEFAULT_CREDITS[e.target.value] ?? 0)); }}>
            {plans.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className={LABEL} htmlFor="g-credits">Credits to add</label>
          <input id="g-credits" name="credits" type="number" min={0} max={1000000} value={credits}
                 onChange={(e) => setCredits(e.target.value)} className={INPUT} />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className={LABEL} htmlFor="g-duration">Runs for</label>
          <select id="g-duration" name="durationDays" className={INPUT} defaultValue="0"
                  onChange={(e) => setDuration(Number(e.target.value))}>
            {durations.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className={LABEL} htmlFor="g-reason">Reason</label>
          <select id="g-reason" name="reason" className={INPUT} defaultValue="partnership">
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="g-note">Note (optional)</label>
        <input id="g-note" name="note" className={INPUT} placeholder="e.g. Partnership — 100% comped, badge live on their site" />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!match}
          className="rounded-full border-0 px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Grant plan
        </button>
        <span className="text-[11px] text-[var(--ink-faint)]">
          {email.trim().length === 0
            ? "This writes to a real account."
            : match
              ? `Will set ${plan}, add ${Number(credits || 0).toLocaleString("en-IN")} credits${duration > 0 ? `, ending in ${duration} days` : ", with no end date"}.`
              : "Both email fields must match."}
        </span>
      </div>
    </form>
  );
}
