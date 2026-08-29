/**
 * Which subset of a page's leads is shown, and for how long.
 *
 * Each page holds far more qualifying leads than it displays, so the displayed set rotates on a
 * fixed 15-day cycle. This costs nothing — no API call, no new data — and it means a repeat visitor
 * sees different businesses and no single crawl enumerates the whole set.
 *
 * The selection is deterministic within a cycle. Every visitor and every crawler sees the same page
 * for the same 15 days; a list that reshuffled per request would read as search results rather than
 * a document, which is exactly the thing the URL structure is designed to avoid looking like.
 *
 * Rotation is presentation, not new information. It never touches the "figures last changed" date.
 */

const EPOCH_START = Date.UTC(2026, 0, 1);
const CYCLE_DAYS = 15;

/** Leads always shown, in true score order — rotating the strongest out would misrepresent the
 *  ranking rather than refresh it. */
export const FIXED_HEAD = 6;
export const CARDS_PER_PAGE = 30;

export function epochFor(date: Date = new Date()): number {
  return Math.floor((date.getTime() - EPOCH_START) / (CYCLE_DAYS * 86_400_000));
}

/** FNV-1a. Small, dependency-free, and stable across processes — which matters, because the whole
 *  point is that two servers rendering the same page in the same cycle agree. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function seedFor(pageKey: string, epoch: number): number {
  return hashString(`${pageKey}:${epoch}`);
}

/**
 * The strongest few, then a stable sample of the rest.
 *
 * @param items already sorted best-first
 */
export function selectForEpoch<T extends { id: string }>(
  items: T[],
  pageKey: string,
  epoch: number,
  count = CARDS_PER_PAGE
): T[] {
  if (items.length <= count) return items;

  const head = items.slice(0, FIXED_HEAD);
  const tail = items.slice(FIXED_HEAD);
  const seed = seedFor(pageKey, epoch);

  const sampled = [...tail]
    .map((item) => ({ item, rank: hashString(`${item.id}:${seed}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count - head.length)
    .map((x) => x.item);

  // Restored to score order so the page still reads as a ranking, not a shuffle.
  const chosen = new Set(sampled.map((s) => s.id));
  return [...head, ...tail.filter((t) => chosen.has(t.id))];
}
