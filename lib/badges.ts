/**
 * Review-platform badges for the footer: Product Hunt, G2, Capterra.
 *
 * Each of these hands out an embed only once a listing actually exists — Product Hunt after the
 * post is live, G2 and Capterra after the vendor profile is claimed. So the entries sit here with
 * `live: false` and no embed until that happens, and the footer renders nothing for them. A badge
 * is a claim that a platform has us on file; putting one up before that is true would be inventing
 * social proof, which is the one thing this project does not do.
 *
 * When a listing goes live, paste what the platform gives you into `embed` and flip `live`:
 * an image badge (Product Hunt) keeps `kind: "image"`, a script embed (G2, Capterra) uses
 * `kind: "script"` with their `src`.
 */
export type Badge =
  | { platform: string; live: false; profileUrl?: string }
  | { platform: string; live: true; kind: "image"; href: string; img: string; alt: string; width: number; height: number }
  | { platform: string; live: true; kind: "script"; src: string; containerId: string; href: string; alt: string };

export const BADGES: Badge[] = [
  { platform: "Product Hunt", live: false },
  { platform: "G2", live: false },
  { platform: "Capterra", live: false },
];

export const liveBadges = () => BADGES.filter((b): b is Extract<Badge, { live: true }> => b.live);
