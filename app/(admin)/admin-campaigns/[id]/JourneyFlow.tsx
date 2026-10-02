import type { ReactNode } from "react";

/**
 * The campaign funnel as a live flow of nodes, cold lead through to registered.
 *
 * The step FlowDiagram answers "what does this sequence send". This answers the different and
 * harder question "where is everybody right now" — how many people sit in each state, and which
 * way they left. Those are not the same picture: a sequence can look perfectly designed while the
 * entire list is parked in one node.
 *
 * Counts come from campaign_recipients.state, which the event reducer maintains, so what shows
 * here is what the rule engine will actually act on next tick, not a separately computed
 * approximation that can drift away from it.
 */

export type JourneyCounts = {
  total: number;
  unverified: number;
  verified: number;
  invalid: number;
  new: number;
  active: number;
  warm: number;
  hot: number;
  converted: number;
  stalled: number;
  suppressed: number;
  dueNow: number;
  validationSuppressed: number;
  hardBounce: number;
  complaint: number;
  unsubscribed: number;
};

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  const p = (n / total) * 100;
  return p > 0 && p < 0.1 ? "<0.1%" : `${p.toFixed(p < 10 ? 1 : 0)}%`;
}

function Node({
  label, n, total, tone, sub, live,
}: {
  label: string; n: number; total: number;
  tone: "neutral" | "good" | "warm" | "hot" | "bad" | "mut";
  sub?: string; live?: boolean;
}) {
  return (
    <div className={`jf-node jf-${tone}`}>
      {live && n > 0 && <span className="jf-pulse" aria-hidden />}
      <div className="jf-label">{label}</div>
      <div className="jf-n">{n.toLocaleString("en-IN")}</div>
      <div className="jf-sub">{sub ?? pct(n, total)}</div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="jf-arrow">
      {label && <span>{label}</span>}
      <svg viewBox="0 0 40 12" width="34" height="12" aria-hidden>
        <path d="M0 6h30m0 0l-6-5m6 5l-6 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

function Branch({ children }: { children: ReactNode }) {
  return <div className="jf-branch">{children}</div>;
}

export function JourneyFlow({ c }: { c: JourneyCounts }) {
  const t = c.total;
  return (
    <div className="jf-wrap">
      <div className="jf-row">
        <Node label="Imported" n={t} total={t} tone="neutral" sub="poora pool" />
        <Arrow label="validate" />
        <Node label="Unverified" n={c.unverified} total={t} tone="mut" live />
        <Arrow label="delivered" />
        <Node label="Verified" n={c.verified} total={t} tone="good" live />
        <Arrow label="opened" />
        <Node label="Warm" n={c.warm} total={t} tone="warm" sub={`${pct(c.warm, t)} · khola, click nahi`} live />
        <Arrow label="clicked" />
        <Node label="Hot" n={c.hot} total={t} tone="hot" sub={`${pct(c.hot, t)} · click kiya`} live />
        <Arrow label="signup" />
        <Node label="Registered" n={c.converted} total={t} tone="good" sub={`${pct(c.converted, t)} · terminal`} />
      </div>

      {/* The exits. Kept visually below the main line rather than inline, because they are where
          the list is lost and that number deserves to be readable on its own. */}
      <div className="jf-exits">
        <Branch>
          <div className="jf-exit-title">Nikal gaye</div>
          <div className="jf-row jf-row-tight">
            <Node label="Invalid" n={c.invalid} total={t} tone="bad" sub={`${c.validationSuppressed.toLocaleString("en-IN")} AV · ${c.hardBounce.toLocaleString("en-IN")} hard`} />
            <Node label="Complaint" n={c.complaint} total={t} tone="bad" />
            <Node label="Unsubscribed" n={c.unsubscribed} total={t} tone="bad" />
            <Node label="Stalled" n={c.stalled} total={t} tone="mut" sub={`${pct(c.stalled, t)} · cooldown`} />
          </div>
        </Branch>
        <Branch>
          <div className="jf-exit-title">Abhi queue mein</div>
          <div className="jf-row jf-row-tight">
            <Node label="Naye (touch 0)" n={c.new} total={t} tone="neutral" live />
            <Node label="Chal rahe" n={c.active} total={t} tone="neutral" live />
            <Node label="Aaj due" n={c.dueNow} total={t} tone="good" sub="agla tick inhe uthayega" live />
          </div>
        </Branch>
      </div>

      <p className="jf-note">
        <strong>Invalid</strong> mein AV-suppressed aur asli hard bounce alag ginay gaye hain — SES dono ko
        <code> Bounce/Permanent</code> bhejta hai, farq sirf <code>bounceSubType</code> se pata chalta hai.
        AV-suppressed kabhi kisi mail server tak pahuncha hi nahi, isliye wo list ki kharabi nahi hai.
      </p>
    </div>
  );
}
