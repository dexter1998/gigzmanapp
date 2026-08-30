/**
 * Semicircular score gauge. The gradient runs Mantis's own low->high read (muted red/amber for a
 * weak lead, green for a hot one) so it matches the has_website pin colours used across the map.
 *
 * The arc carries no labels of its own. The 0 and 100% endpoint captions were noise — the scale is
 * obvious from a gauge — and crowding the number inside the arc made it hard to read at the sizes
 * this is actually used at. The score sits below the arc, with air between them.
 *
 * Not a client component: it has no state and no handlers, so it renders in the initial HTML on the
 * public lead pages and costs those routes nothing in JavaScript.
 */
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
  // Scales with the gauge so the number reads at 40px in a table row and at 104px on the map panel.
  const fontSize = Math.max(11, Math.round(size * 0.24));

  return (
    <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 200 100" width={size} height={size * 0.5} role="img" aria-label={`Lead score ${clamped}%`}>
        <defs>
          <linearGradient id={gaugeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d9564a" />
            <stop offset="55%" stopColor="var(--g-amber-core, #fdba3f)" />
            <stop offset="100%" stopColor="var(--g-green, #7cb342)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke="var(--g-gray-100, #eceeec)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* This arc only ever sweeps from 180° down to somewhere in [0°,180°] — by construction
            that's never more than a half-circle, so the large-arc-flag is always 0. */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={`url(#${gaugeId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          marginTop: Math.max(4, Math.round(size * 0.09)),
          fontSize,
          fontWeight: 800,
          lineHeight: 1,
          color: "var(--g-ink, #1a1f2b)",
        }}
      >
        {clamped}%
      </div>
    </div>
  );
}
