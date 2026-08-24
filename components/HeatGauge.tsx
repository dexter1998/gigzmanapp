"use client";

/** Semicircular score gauge — same shape language as the reference (arc + centered score +
 * 0/100% endpoint labels), but the gradient runs gigzman's own low->high read (muted red/amber
 * for a weak lead, green for a hot one) instead of an arbitrary pink-to-blue, so it reads
 * consistently with the has_website pin colors already used everywhere else in the app. */
export function HeatGauge({ score, size = 120 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const cx = 100;
  const cy = 96;
  const r = 82;
  const strokeWidth = 16;

  const angleFor = (pct: number) => 180 - (pct / 100) * 180;
  const pointAt = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };

  const start = pointAt(180);
  const end = pointAt(angleFor(clamped));
  const trackEnd = pointAt(0);

  const gaugeId = `heat-gauge-${Math.round(clamped)}`;

  return (
    <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 200 120" width={size} height={size * 0.6} role="img" aria-label={`Lead score ${clamped}%`}>
        <defs>
          <linearGradient id={gaugeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d9564a" />
            <stop offset="55%" stopColor="var(--g-amber-core, #fdba3f)" />
            <stop offset="100%" stopColor="var(--g-green, #22a35a)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke="var(--g-gray-100, #eceeec)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${clamped > 50 ? 1 : 0} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={`url(#${gaugeId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <text x={cx} y={cy - 22} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--g-gray-500, #8a93a6)">
          Score
        </text>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight={800} fill="var(--g-ink, #1a1f2b)">
          {clamped}%
        </text>
        <text x={start.x} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--g-gray-500, #8a93a6)">
          0
        </text>
        <text x={trackEnd.x} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--g-gray-500, #8a93a6)">
          100%
        </text>
      </svg>
    </div>
  );
}
