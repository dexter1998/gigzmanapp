import type { ComponentType } from "react";
import {
  GiftIcon, SparklesIcon, ZapIcon, MegaphoneIcon, AlertTriangleIcon, PartnerIcon,
  LightbulbIcon, TrophyIcon, TagIcon,
} from "@/components/icons";

/**
 * The dashboard's popup system: one renderer, many popups.
 *
 * Four concepts are kept deliberately apart, because conflating them is what turns "show a modal"
 * into a new component every campaign:
 *
 *   CATEGORY  — why the popup exists (Free Credits, Alert, Tip...). Owns the badge icon and accent.
 *   CONTENT   — what this particular popup says. Plain data: media, header, subheader, CTA, PS.
 *   TEMPLATE  — how those fields are arranged on screen. Swappable per popup, never per campaign.
 *   RULES     — when a given user should see it. Dates, routes, once-vs-every-visit.
 *
 * A new campaign is therefore a new POPUPS entry, not a new component. A new *shape* of popup (a
 * two-column layout, a no-media variant) is a new template that every existing content object can
 * be pointed at without being rewritten, because the content model does not know about layout.
 */

export const POPUP_CATEGORIES = [
  "free-credits", "welcome", "new-feature", "announcement",
  "alert", "invitation", "tip", "milestone", "promotion",
] as const;
export type PopupCategory = (typeof POPUP_CATEGORIES)[number];

export type CategoryStyle = {
  /** Default chip text. A popup may override it (`badgeLabel`) without leaving the category. */
  label: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
  /** Chip background and chip text/icon colour. Both come from the shared tokens in globals.css —
   *  a category tints the popup, it never introduces a colour the rest of the app doesn't have. */
  tint: string;
  ink: string;
};

export const CATEGORY_STYLES: Record<PopupCategory, CategoryStyle> = {
  "free-credits": { label: "Free Credits", Icon: GiftIcon,           tint: "var(--g-green-mint)",  ink: "var(--g-green-text)" },
  welcome:        { label: "Welcome",      Icon: SparklesIcon,       tint: "var(--g-green-mint)",  ink: "var(--g-green-text)" },
  "new-feature":  { label: "New Feature",  Icon: ZapIcon,            tint: "var(--g-blue-tint)",   ink: "var(--g-blue-text)" },
  announcement:   { label: "Announcement", Icon: MegaphoneIcon,      tint: "var(--g-blue-tint)",   ink: "var(--g-blue-text)" },
  alert:          { label: "Alert",        Icon: AlertTriangleIcon,  tint: "var(--g-red-tint)",    ink: "var(--g-red-text)" },
  invitation:     { label: "Invitation",   Icon: PartnerIcon,        tint: "var(--g-blue-tint)",   ink: "var(--g-blue-text)" },
  tip:            { label: "Tip",          Icon: LightbulbIcon,      tint: "var(--g-amber-tint-2)", ink: "var(--g-amber)" },
  milestone:      { label: "Milestone",    Icon: TrophyIcon,         tint: "var(--g-amber-tint)",  ink: "var(--g-amber)" },
  promotion:      { label: "Promotion",    Icon: TagIcon,            tint: "var(--g-amber-tint)",  ink: "var(--g-amber)" },
};

/** Layout only. Adding one here never touches PopupContent — that separation is the whole point. */
export type PopupTemplate = "meme-hero";

export type PopupMedia = {
  /** Served as-is: no crop, no overlay, no re-encode. Put the file in public/popups/. */
  src: string;
  alt: string;
  /** Intrinsic size, when known — reserves the box so the modal doesn't jump as the GIF decodes. */
  width?: number;
  height?: number;
};

/**
 * A pool, not a picture. One entry pins a popup to a single asset; several make it pick at random
 * each time it opens, and give the viewer a shuffle control to draw again.
 *
 * Randomness lives here rather than in the template because it is a property of the CONTENT ("this
 * campaign has a set of memes"), not of the layout — a future template gets the behaviour free.
 */
export type PopupMediaPool = PopupMedia[];

export type PopupCta = {
  label: string;
  /** Internal route or external URL. Omit for a popup whose CTA only dismisses. */
  href?: string;
  /** Opens in a new tab and marks the link rel="noreferrer" — for anything off mantisai.in. */
  external?: boolean;
};

/**
 * How often one person sees a popup.
 *
 *   once    — dismissed is dismissed, forever (default). Announcements, credit grants.
 *   session — once per browser tab session.
 *   daily   — once per calendar day, across tabs and reloads. Where the greetings live now: a
 *             "session" greeting reappears every time someone opens a new tab, which on a dashboard
 *             people keep several of reads as the app nagging rather than greeting.
 *   always  — every mount. Really only useful while building one.
 */
export type PopupFrequency = "once" | "session" | "daily" | "always";

export type PopupRules = {
  frequency?: PopupFrequency;
  /** ISO dates. Outside the window the popup is simply not eligible — no code change to retire it. */
  startsAt?: string;
  endsAt?: string;
  /** Route prefixes it may appear on. Omitted = anywhere inside the app shell. */
  paths?: string[];
  /**
   * Audience tag this account must carry. Tags are computed on the SERVER (app/(app)/layout.tsx)
   * from facts the browser cannot know or fake — how old the account is, whether a credit grant
   * actually landed in the ledger — and handed to PopupHost.
   *
   * This is the difference between "first login" and "welcome back": they are two ordinary popups
   * separated by a tag, not a branch inside one. And it is what keeps the credits popup honest —
   * it appears only for accounts that really were granted the credits, on every device they sign
   * in from, rather than for anyone whose localStorage happens to be empty.
   */
  requires?: AudienceTag;
};

/**
 * Server-computed facts about the signed-in account.
 *
 *   new-account       — created within NEW_ACCOUNT_WINDOW_HOURS. Gets the first-login greeting.
 *   returning-account — everyone else. Gets "welcome back".
 *   granted-free-500  — has the 2026-09-26 backfill row in credit_ledger, i.e. the 500 credits
 *                       genuinely landed. Never inferred from a date: the grant script is the only
 *                       thing that can create that row, so the popup cannot claim a gift that
 *                       didn't happen.
 *   granted-plan      — plan_source = 'granted', i.e. an admin actually comped this account's plan
 *                       (see lib/credits/grants.ts). Same principle as above: read from the row the
 *                       grant wrote, never guessed, so the popup cannot congratulate someone on a
 *                       plan nobody gave them.
 */
export type AudienceTag = "new-account" | "returning-account" | "granted-free-500" | "granted-plan";

/** An account younger than this is greeted as new. A day is generous on purpose — a signup that
 *  bounces off and comes back the same evening should still get the welcome, not "welcome back". */
export const NEW_ACCOUNT_WINDOW_HOURS = 24;

/** The ledger `ref` the backfill writes, one row per account. Shared by the grant SQL and the
 *  layout's eligibility query so the two can never drift apart. */
export const FREE_500_GRANT_REF_PREFIX = "free-credits-500-2026-09-26:";
export const FREE_500_GRANT_REASON = "promo_grant";

export type PopupContent = {
  /** Stable forever: dismissal is stored against this. Changing it re-shows the popup to everyone. */
  id: string;
  category: PopupCategory;
  template?: PopupTemplate;
  badgeLabel?: string;
  /** One asset, or several to pick from at random (with a shuffle control). */
  media?: PopupMediaPool;
  /** Rendered in brand green, immediately before `header` — the "500 credits," half of the line. */
  headerAccent?: string;
  header: string;
  /** One or two lines. Longer than that and the GIF stops being the thing people look at. */
  subheader: string;
  cta: PopupCta;
  ps?: string;
  rules?: PopupRules;
};

/**
 * Live popups, highest priority first.
 *
 * PopupHost shows one at a time and moves to the next as each is closed, so an account with more
 * than one waiting (a returning user who also got the credit grant) gets them in this order —
 * greeting first, then the surprise — rather than two modals stacked on top of each other.
 *
 * This array is the seam. It is a module constant today; moving it behind a `popups` table (the way
 * badges went) means replacing this export with a query and leaving every component untouched.
 */
/** The welcome memes. Both greetings draw from the same pool — the difference between them is the
 *  words, not the picture, so splitting the assets would only halve the variety for each.
 *
 *  Animated WebP rather than GIF: same frames, a fraction of the bytes (the Chandler clip went
 *  871 KB -> 90 KB). Every browser the dashboard supports plays them; the renderer neither knows
 *  nor cares which container it was handed. */
const WELCOME_MEMES: PopupMediaPool = [
  { src: "/popups/welcome/chandler-dance.webp", alt: "Chandler from Friends dancing through a doorway with his arms out" },
  { src: "/popups/welcome/chandler-hands-up.webp", alt: "Chandler from Friends throwing both hands up in celebration in the kitchen" },
  { src: "/popups/welcome/group-at-window.webp", alt: "The Friends cast crowded at a window, waving and cheering" },
  { src: "/popups/welcome/ross-cheers.webp", alt: "Ross from Friends raising a cocktail glass and grinning" },
  { src: "/popups/welcome/ross-joey-entrance.webp", alt: "Ross and Joey from Friends wheeling the big ceramic dog through the apartment door" },
  { src: "/popups/welcome/group-faces.webp", alt: "The six Friends squeezed together into one close-up shot" },
  { src: "/popups/welcome/joey-chandler-couch.webp", alt: "Joey and Chandler sitting on the couch, unimpressed" },
];

/** The 500-credits popup's own pool — the joke there is disbelief, not welcome, so it keeps its
 *  own assets rather than sharing the greeting pool. */
const SHOCK_MEMES: PopupMediaPool = [
  { src: "/popups/shock/joey-shocked.webp", alt: "Joey from Friends with his jaw dropped in shock" },
  { src: "/popups/shock/phoebe-screaming.webp", alt: "Phoebe from Friends screaming in shock with her arms out" },
];

export const POPUPS: PopupContent[] = [
  {
    id: "plan-granted",
    // The gift icon and green tint are right; the default chip text ("Free Credits") is not — this
    // is a plan, and the credits are a consequence of it rather than the news.
    category: "free-credits",
    badgeLabel: "Plan Activated",
    media: [{ src: "/popups/gift/phoebe-present.webp", alt: "Phoebe from Friends presenting a huge wrapped gift, delighted" }],
    headerAccent: "{plan},",
    header: "on the house.",
    subheader: "Mantis has activated your {plan} plan — free, nothing to pay. Your credits are already in the account.",
    cta: { label: "Start finding leads", href: "/home" },
    ps: "🎁 Granted by the Mantis team. No card, no renewal, no catch.",
    // Gated on plan_source, not on a date — the grant row is the only thing that can produce this
    // tag, so the popup cannot congratulate anyone on a plan nobody gave them.
    rules: { frequency: "once", requires: "granted-plan" },
  },
  {
    id: "free-credits-500-2026-09",
    category: "free-credits",
    media: SHOCK_MEMES,
    headerAccent: "500 credits,",
    header: "on us.",
    subheader: "Someone at Mantis HQ pressed the wrong button. You now have 500 free credits. They're yours.",
    cta: { label: "Use 500 Credits", href: "/home" },
    ps: "😎 Don't waste them. Or do. We're not your manager.",
    // Gated on the grant actually existing, not on a date — see AudienceTag.
    rules: { frequency: "once", requires: "granted-free-500" },
  },
  {
    id: "welcome-first-login",
    category: "welcome",
    badgeLabel: "Welcome to Mantis",
    media: WELCOME_MEMES,
    headerAccent: "Welcome",
    header: "to Mantis!",
    subheader: "You're now part of a community that helps businesses get discovered and grow. Let's do big things together.",
    cta: { label: "Let's Get Started", href: "/home" },
    ps: "🎉 Great things start here. You're in the right place. 🚀",
    rules: { frequency: "daily", requires: "new-account" },
  },
  {
    id: "welcome-back",
    category: "welcome",
    badgeLabel: "Welcome Back",
    media: WELCOME_MEMES,
    headerAccent: "Welcome",
    header: "back!",
    subheader: "Good to see you again! Your leads, campaigns and insights are all here, ready to go.",
    cta: { label: "Open Dashboard", href: "/home" },
    ps: "😎 Missed you. Let's find some amazing leads today.",
    // A brand-new account gets the first-login welcome instead, never both, and this greeting
    // returns once per session rather than on every navigation.
    rules: { frequency: "daily", requires: "returning-account" },
  },
];

/** True when this popup is allowed to appear for this route at this moment. Dismissal is separate —
 *  it lives in the browser and is checked by PopupHost, because it is per-person, not per-popup. */
export function isEligible(popup: PopupContent, pathname: string, now: Date, audience: AudienceTag[]): boolean {
  const r = popup.rules;
  if (!r) return true;
  if (r.requires && !audience.includes(r.requires)) return false;
  if (r.startsAt && now < new Date(r.startsAt)) return false;
  if (r.endsAt && now > new Date(r.endsAt)) return false;
  if (r.paths?.length && !r.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return true;
}
