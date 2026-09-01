/** Inline SVGs for the article blocks. Kept here rather than in the shared icon set: these are
 *  editorial illustrations chosen per block by name, not product UI icons. */
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const BLOCK_ICONS: Record<string, React.ReactNode> = {
  search: <svg {...S}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  signal: <svg {...S}><path d="M3 17l5-6 4 4 6-9" /><path d="M18 6h3v3" /></svg>,
  data: <svg {...S}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>,
  verified: <svg {...S}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  phone: <svg {...S}><path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>,
  score: <svg {...S}><path d="M12 20V10" /><path d="M6 20v-5" /><path d="M18 20V5" /></svg>,
  enrich: <svg {...S}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /><path d="M17 8h5" /><path d="M19.5 5.5v5" /></svg>,
  send: <svg {...S}><path d="M21 3L10.5 13.5" /><path d="M21 3l-6.5 18-4-8-8-4z" /></svg>,
  map: <svg {...S}><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  clock: <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  calendar: <svg {...S}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  arrow: <svg {...S}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>,
};

export function Icon({ name }: { name: string }) {
  return <>{BLOCK_ICONS[name] ?? BLOCK_ICONS.search}</>;
}
