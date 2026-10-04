import type { ReactNode } from "react";

/**
 * The campaign funnel: how many people sit at each stage, cold lead through to registered.
 *
 * The step FlowDiagram answers "what does this sequence send". This answers the harder question
 * "where is everybody right now" — a sequence can look perfectly designed while the entire list
 * is parked in one stage.
 *
 * Built as stacked rows with proportional bars rather than a row of boxes that scrolls sideways.
 * Three reasons, all of which the first version got wrong:
 *   - A panel that scrolls inside itself hides data. The stages past the fold simply did not
 *     exist for anyone who did not think to drag, and the stages that matter most on a bad day
 *     (the exits) were the ones off-screen.
 *   - Counts are only meaningful against the total. A bar makes "65 of 100" readable without
 *     arithmetic; a box containing "65" does not.
 *   - Hierarchy here comes from type size and whitespace, not from drawing a border around every
 *     number, which is what made the first version read as a toolbar rather than a report.
 *
 * Counts come from campaign_recipients.state, the same column the rule engine reads, so what is
 * on screen is what the next tick will act on rather than a parallel calculation that can drift.
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

function pctOf(n: number, total: number): number {
  return total === 0 ? 0 : (n / total) * 100;
}

function pctLabel(n: number, total: number): string {
  const p = pctOf(n, total);
  if (p === 0) return "0%";
  if (p < 0.1) return "<0.1%";
  return `${p.toFixed(p < 10 ? 1 : 0)}%`;
}

/** One funnel stage. `indent` marks a stage as a subset of the one above it, so the shape of the
 *  drop-off is visible without a second chart. */
function Stage({
  label, sub, n, total, tone, indent = false,
}: {
  label: string; sub?: string; n: number; total: number;
  tone: "secondary" | "primary" | "green" | "yellow" | "orange" | "red";
  indent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 jf-stage flex-wrap flex-sm-nowrap">
      <div className="jf-stage-label flex items-center gap-2" style={indent ? { paddingLeft: "0.75rem" } : undefined}>
        {indent && <span className="jf-tick text-[var(--ink-muted)]" aria-hidden>└</span>}
        <div className="truncate">
          <div className={indent ? "" : "fw-bold"}>{label}</div>
          {sub && <div className="text-[var(--ink-muted)]" style={{ fontSize: 11.5 }}>{sub}</div>}
        </div>
      </div>
      <div className="flex-fill">
        <div className="progress progress-sm">
          <div className={`progress-bar bg-${tone}`} style={{ width: `${pctOf(n, total)}%` }} role="progressbar"
               aria-valuenow={n} aria-valuemin={0} aria-valuemax={total} aria-label={label} />
        </div>
      </div>
      <div className="text-right flex-shrink-0" style={{ minWidth: 96 }}>
        <span className="font-semibold jf-num">{n.toLocaleString("en-IN")}</span>
        <span className="text-[var(--ink-muted)] ml-2" style={{ fontSize: 12 }}>{pctLabel(n, total)}</span>
      </div>
    </div>
  );
}

/** A terminal outcome. Flat tiles, no bars: these are not stages people pass through, and giving
 *  them bars would imply a funnel position they do not have. */
function Exit({ label, n, sub, tone }: { label: string; n: number; sub?: ReactNode; tone: string }) {
  return (
    <div className="flex-1 min-w-[260px] min-w-[170px]">
      <div className="text-[var(--ink-muted)] uppercase" style={{ fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div className={`h2 mb-0 mt-1 jf-num text-${tone}`}>{n.toLocaleString("en-IN")}</div>
      {sub && <div className="text-[var(--ink-muted)]" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  );
}

export function JourneyFlow({ c }: { c: JourneyCounts }) {
  const t = c.total;
  const inPlay = c.new + c.active + c.warm + c.hot;

  return (
    <div className="jf">
      <Stage label="Imported" sub="poora pool" n={t} total={t} tone="secondary" />
      <Stage label="Verified" sub="kam se kam ek baar deliver hua" n={c.verified} total={t} tone="primary" indent />
      <Stage label="Warm" sub="khola, click nahi" n={c.warm} total={t} tone="yellow" indent />
      <Stage label="Hot" sub="click kiya" n={c.hot} total={t} tone="orange" indent />
      <Stage label="Registered" sub="signup — terminal" n={c.converted} total={t} tone="green" indent />

      <hr className="my-3" />

      <div className="flex flex-wrap gap-3 g-3">
        <Exit label="Invalid" n={c.invalid} tone="danger"
              sub={<>{c.hardBounce.toLocaleString("en-IN")} hard · {c.validationSuppressed.toLocaleString("en-IN")} AV</>} />
        <Exit label="Complaint" n={c.complaint} tone="danger" sub="sabse mehnga" />
        <Exit label="Unsubscribed" n={c.unsubscribed} tone="danger" />
        <Exit label="Stalled" n={c.stalled} tone="secondary" sub="cooldown mein" />
      </div>

      <hr className="my-3" />

      <div className="flex flex-wrap gap-3 g-3">
        <Exit label="Abhi chal rahe" n={inPlay} tone="body" sub={`${c.new.toLocaleString("en-IN")} naye, abhi tak nahi bheja`} />
        <Exit label="Aaj due" n={c.dueNow} tone="primary" sub="agla tick inhe uthayega" />
      </div>

      <p className="text-[var(--ink-muted)] mt-3 m-0" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
        <strong>Invalid</strong> mein AV-suppressed aur asli hard bounce alag ginay gaye hain. SES dono ko{" "}
        <code>Bounce/Permanent</code> bhejta hai aur farq sirf <code>bounceSubType</code> se pata chalta hai —
        AV-suppressed kabhi kisi mail server tak pahuncha hi nahi, isliye wo list ki kharabi nahi hai.
      </p>
    </div>
  );
}
