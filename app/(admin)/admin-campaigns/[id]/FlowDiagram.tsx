type Step = { stepKey: string; stepType: string; sendOffsetMinutes: number; subject: string };

function fmtGap(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

const TYPE_LABEL: Record<string, string> = { single_lead: "Single lead", multi_lead: "Multi lead" };

/** Pure visual — the actual send order/timing lives in campaign_steps, this just renders it as a
 * left-to-right flow so "what does this sequence actually do" is readable at a glance instead of
 * reconstructed from a table of offsets. */
export function FlowDiagram({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;
  const ordered = [...steps].sort((a, b) => a.sendOffsetMinutes - b.sendOffsetMinutes);

  return (
    <div className="flow-diagram">
      {ordered.map((step, i) => (
        <div key={step.stepKey} style={{ display: "contents" }}>
          {i > 0 && (
            <div className="flow-arrow">
              <span>{fmtGap(step.sendOffsetMinutes - ordered[i - 1].sendOffsetMinutes)}</span>
              <svg viewBox="0 0 40 12" width="40" height="12"><path d="M0 6h32m0 0l-6-5m6 5l-6 5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>
          )}
          <div className={`flow-step flow-step-${step.stepType}`}>
            <div className="flow-step-type">{TYPE_LABEL[step.stepType] ?? step.stepType}</div>
            <div className="flow-step-key">{step.stepKey}</div>
            <div className="flow-step-subject">{step.subject}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
