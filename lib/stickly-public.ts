/**
 * The one Stickly constant the browser is allowed to see.
 *
 * lib/stickly.ts is "server-only" because it holds both secrets, so a client component cannot
 * import anything from it — not even a URL. This file exists to keep that boundary enforced by
 * the module graph rather than by memory.
 */
export const STICKLY_CDN_URL = "https://cdn.stickly.live/w.js";
