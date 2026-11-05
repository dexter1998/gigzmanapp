import { COMPANY } from "@/lib/company";

/**
 * The visual system every Mantis email is built from. Direction: a lead dossier — an ink header
 * band with the mark, a hero that states the one thing this mail is about (often as a number), a
 * visual that shows it (a progress bar, lead cards, a funnel, a countdown), one lime button, and a
 * quiet footer. Modelled on what lands well in a real inbox (Bark's lead cards, Apollo's tiles,
 * Semrush's tinted checklist, OpenHunts' list cards), in Mantis's own colours.
 *
 * Email-safe on purpose: tables for structure, inline styles only, no web fonts (Gmail ignores
 * them), no background images, and every visual drawn in HTML so it still reads with images off —
 * which is how Gmail shows mail in Spam and for senders it doesn't know yet.
 */

export const INK = "#111315", INK2 = "#1d2023", MUTED = "#5d6265", SOFT = "#9aa0a3", LINE = "#e3e5de";
export const PAGE = "#eeeee8", PAPER = "#ffffff", TINT = "#f4f7ea", LIME = "#b7e51d", LIME_DK = "#5f7a0c", RED = "#c2410c";
// Mantis's own faces (app/layout.tsx): Plus Jakarta Sans for text, Fraunces for headings, Poppins
// for the wordmark. Apple Mail and iOS load them from the <link> in shell(); Gmail ignores web fonts
// and falls back along each stack. MONO is kept as a name for the small uppercase labels, which are
// set in Jakarta, not a monospace face.
export const SANS = "'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
export const HEAD = "Fraunces,Georgia,'Times New Roman',serif";
export const MARK = "Poppins,'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
export const MONO = SANS;
export const FONT = SANS;
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Poppins:wght@600&display=swap";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ASSET = "https://mantisai.in/email/v1";

/* ------------------------------------------------------------------ type */

export function eyebrow(text: string, onDark = false) {
  return `<div style="margin:0 0 14px"><span style="display:inline-block;padding:5px 10px;border:1px solid ${onDark ? LIME : INK};border-radius:999px;font:700 11px/1 ${MONO};letter-spacing:1.2px;text-transform:uppercase;color:${onDark ? LIME : INK}">${esc(text)}</span></div>`;
}

export function h1(text: string, onDark = false) {
  return `<div style="margin:0 0 12px;font:600 29px/1.2 ${HEAD};letter-spacing:-0.3px;color:${onDark ? "#ffffff" : INK}">${text}</div>`;
}

export function h2(text: string) {
  return `<div style="margin:0 0 16px;font:600 21px/1.3 ${HEAD};color:${INK}">${text}</div>`;
}

export function label(text: string) {
  return `<div style="margin:0 0 10px;font:700 11px/1.2 ${MONO};letter-spacing:1.2px;text-transform:uppercase;color:${MUTED}">${esc(text)}</div>`;
}

export function p(text: string, opts: { muted?: boolean; size?: number; onDark?: boolean } = {}) {
  const color = opts.onDark ? "#c9cdc4" : opts.muted ? MUTED : INK;
  return `<p style="margin:0 0 14px;font:${opts.size ?? 15.5}px/1.6 ${SANS};color:${color}">${text}</p>`;
}

export function small(text: string, onDark = false) {
  return `<div style="font:12.5px/1.5 ${SANS};color:${onDark ? SOFT : MUTED}">${text}</div>`;
}

/* ------------------------------------------------------------------ actions */

type BtnKind = "lime" | "ink" | "ghost" | "ghostDark";

export function button(label: string, url: string, kind: BtnKind | boolean = "lime", wide = false) {
  const k: BtnKind = kind === true ? "lime" : kind === false ? "ghost" : kind;
  const style = {
    lime: `background:${LIME};color:${INK};border:2px solid ${LIME}`,
    ink: `background:${INK};color:#ffffff;border:2px solid ${INK}`,
    ghost: `background:transparent;color:${INK};border:2px solid ${INK}`,
    ghostDark: `background:transparent;color:#ffffff;border:2px solid #4a4f53`,
  }[k];
  return `<a href="${esc(url)}" style="display:inline-block;margin:0 8px 8px 0;padding:14px 22px;border-radius:8px;${style};${wide ? "min-width:170px;text-align:center;" : ""}font:800 15px/1 ${SANS};text-decoration:none;mso-padding-alt:0">${esc(label)}&nbsp;&nbsp;→</a>`;
}

export function textLink(label: string, url: string) {
  return `<a href="${esc(url)}" style="font:700 14px/1.4 ${SANS};color:${LIME_DK};text-decoration:none">${esc(label)} →</a>`;
}

/* ------------------------------------------------------------------ structure */

/** Ink band: the mark, the wordmark, and what kind of mail this is, top right. */
export function header(kind: string) {
  return `<tr><td style="background:${INK};padding:16px 24px;border-radius:14px 14px 0 0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      <td valign="middle"><img src="${ASSET}/05-mark.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:50%"><span style="display:inline-block;vertical-align:middle;margin-left:9px;font:600 22px/1 ${MARK};letter-spacing:-0.4px;color:#ffffff">mantis</span></td>
      <td valign="middle" align="right" style="font:700 10.5px/1 ${MONO};letter-spacing:1.4px;text-transform:uppercase;color:${LIME}">${esc(kind)}</td>
    </tr></table>
  </td></tr>`;
}

/** The top panel of a mail. "ink" continues the header band; "paper" is white. */
export function hero(inner: string, tone: "ink" | "paper" | "lime" = "ink") {
  const bg = tone === "ink" ? INK : tone === "lime" ? LIME : PAPER;
  return `<tr><td style="background:${bg};padding:${tone === "ink" ? "14px 28px 30px" : "30px 28px 26px"}">${inner}</td></tr>`;
}

/** A white section; `tint` gives it the soft green panel look. */
export function section(inner: string, opts: { tint?: boolean; last?: boolean; pad?: string } = {}) {
  return `<tr><td style="background:${opts.tint ? TINT : PAPER};padding:${opts.pad ?? "26px 28px"};${opts.last ? "border-radius:0 0 14px 14px;" : ""}border-top:1px solid ${LINE}">${inner}</td></tr>`;
}

export function panel(inner: string, opts: { dark?: boolean; border?: boolean } = {}) {
  const style = opts.dark
    ? `background:${INK2};color:#fff`
    : `background:${TINT};${opts.border ? `border:1px solid #dfe8c4;` : ""}`;
  return `<div style="margin:4px 0 16px;padding:18px 18px 8px;border-radius:12px;${style}">${inner}</div>`;
}

export const gap = `<tr><td style="height:14px;line-height:14px;font-size:0">&nbsp;</td></tr>`;

export const securityBar = `<tr><td style="background:${INK};padding:7px 12px;text-align:center;font:italic 700 12px/1.3 ${SANS};color:#ffffff">For security purposes, please do not forward this email</td></tr>`;

/** Two columns side by side on desktop, stacked on a phone, with no media query. */
export function columns(left: string, right: string, leftWidth = 300, rightWidth = 230) {
  const col = (w: number, html: string) =>
    `<div style="display:inline-block;vertical-align:top;width:100%;max-width:${w}px;margin:0 0 10px">${html}</div>`;
  return `<div style="font-size:0">${col(leftWidth, left)}<div style="display:inline-block;width:14px"></div>${col(rightWidth, right)}</div>`;
}

/* ------------------------------------------------------------------ data visuals */

export function chip(label: string, tone: "lime" | "ink" | "line" = "lime") {
  const style = tone === "ink" ? `background:${INK};color:${LIME}` : tone === "line" ? `background:#fff;border:1px solid ${LINE};color:${INK}` : `background:#e8f3c3;color:${INK}`;
  return `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 11px;border-radius:999px;${style};font:600 12.5px/1 ${SANS}">${esc(label)}</span>`;
}

/**
 * Equal boxes in one row: every cell gets the same width and, because the background sits on the
 * table cell itself, the same height. Inline-block tiles with min/max widths wrapped into ragged
 * rows of different sizes, which is what made the earlier layouts look misaligned.
 */
export function grid(cells: Array<{ html: string; bg?: string; border?: string }>, gapPx = 10) {
  const w = `${(100 / cells.length).toFixed(2)}%`;
  const tds = cells.map((c, i) =>
    `${i ? `<td width="${gapPx}" style="font-size:0">&nbsp;</td>` : ""}<td width="${w}" valign="top" style="padding:16px 14px;background:${c.bg ?? "#f6f6f2"};border-radius:12px;${c.border ? `border:1px solid ${c.border};` : ""}">${c.html}</td>`);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;table-layout:fixed"><tr>${tds.join("")}</tr></table>`;
}

/** Big numbers in equal tiles. */
export function stats(items: Array<{ value: string; label: string; note?: string; hi?: boolean }>, onDark = false) {
  return grid(items.map((s) => {
    const fg = s.hi ? INK : onDark ? "#ffffff" : INK;
    const sub = s.hi ? INK : onDark ? SOFT : MUTED;
    return {
      bg: s.hi ? LIME : onDark ? INK2 : "#f6f6f2",
      html: `<div style="font:800 28px/1 ${SANS};letter-spacing:-0.8px;color:${fg}">${esc(s.value)}</div>
        <div style="margin-top:8px;font:700 10.5px/1.3 ${SANS};letter-spacing:0.8px;text-transform:uppercase;color:${sub}">${esc(s.label)}</div>
        ${s.note ? `<div style="margin-top:4px;font:12px/1.35 ${SANS};color:${sub}">${esc(s.note)}</div>` : ""}`,
    };
  }));
}

export function progress(pct: number, onDark = false) {
  const w = Math.max(2, Math.min(100, Math.round(pct)));
  const fill = pct >= 100 ? RED : LIME;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 8px"><tr>
    <td width="${w}%" style="height:14px;background:${fill};border-radius:7px 0 0 7px;font-size:0;line-height:0">&nbsp;</td>
    ${w < 100 ? `<td style="height:14px;background:${onDark ? "#34383c" : "#e4e6df"};border-radius:0 7px 7px 0;font-size:0;line-height:0">&nbsp;</td>` : ""}
  </tr></table>`;
}

/** Horizontal bars, longest first, for funnels (found → unlocked → contacted → replies). */
export function bars(items: Array<{ label: string; value: number }>) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px">${items
    .map((i, n) => {
      const w = Math.max(3, Math.round((i.value / max) * 100));
      return `<tr><td width="96" style="padding:5px 10px 5px 0;font:700 10.5px/1.2 ${MONO};letter-spacing:0.6px;text-transform:uppercase;color:${MUTED}">${esc(i.label)}</td>
        <td style="padding:5px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td width="${w}%" style="height:22px;background:${n === items.length - 1 ? LIME : INK};border-radius:5px;font-size:0">&nbsp;</td><td style="padding-left:8px;font:800 14px/1 ${SANS};color:${INK};white-space:nowrap">${i.value.toLocaleString("en-IN")}</td><td width="${100 - w}%"></td>
        </tr></table></td></tr>`;
    })
    .join("")}</table>`;
}

/** One lead as a card (Bark's digest rows): name + where, a fact line, chips, cost, a link. */
export function leadCard(l: { name: string; meta: string; why: string; chips?: string[]; cost?: string; url: string; cta?: string }) {
  return `<div style="margin:0 0 12px;padding:16px 18px;border:1px solid ${LINE};border-left:4px solid ${LIME};border-radius:10px;background:#fff">
    <div style="font:800 16px/1.3 ${SANS};color:${INK}">${esc(l.name)}</div>
    <div style="margin:3px 0 8px;font:13.5px/1.4 ${SANS};color:${MUTED}">${esc(l.meta)}</div>
    ${l.chips?.length ? `<div>${l.chips.map((c) => chip(c, "line")).join("")}</div>` : ""}
    <div style="margin:2px 0 10px;font:14.5px/1.5 ${SANS};color:${INK}">${esc(l.why)}</div>
    ${l.cost ? `<div style="margin:0 0 10px;font:13.5px/1.4 ${SANS};color:${INK}">Cost: <b>${esc(l.cost)}</b></div>` : ""}
    ${textLink(l.cta ?? "View lead", l.url)}
  </div>`;
}

/** Numbered steps down a rail. */
export function steps(items: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px">${items
    .map(([t, d], i) => `<tr>
      <td width="40" valign="top" style="padding:0 0 14px"><div style="width:30px;height:30px;border-radius:50%;background:${i === 0 ? LIME : INK};color:${i === 0 ? INK : "#fff"};text-align:center;font:800 14px/30px ${SANS}">${i + 1}</div></td>
      <td valign="top" style="padding:3px 0 14px"><div style="font:800 15px/1.35 ${SANS};color:${INK}">${t}</div><div style="margin-top:2px;font:14px/1.5 ${SANS};color:${MUTED}">${d}</div></td>
    </tr>`)
    .join("")}</table>`;
}

/** Semrush-style checklist: tick circles on a tinted panel (wrap it in panel()). */
export function checklist(items: string[], onDark = false) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 10px">${items
    .map((t) => `<tr><td valign="top" style="padding:4px 10px 6px 0"><div style="width:20px;height:20px;border-radius:50%;background:${LIME};color:${INK};text-align:center;font:800 12px/20px ${SANS}">✓</div></td><td style="padding:4px 0 6px;font:15px/1.45 ${SANS};color:${onDark ? "#e8eae4" : INK}">${t}</td></tr>`)
    .join("")}</table>`;
}

/** Icon + text rows, the way Bark lists credits, phone and email down the left of its card. */
export function iconRows(rows: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows
    .map(([icon, html]) => `<tr><td width="30" valign="top" style="padding:5px 0;font:17px/1.4 ${SANS}">${icon}</td><td style="padding:5px 0;font:15.5px/1.45 ${SANS};color:${INK}">${html}</td></tr>`)
    .join("")}</table>`;
}

/** Bold question, muted answer: Bark's "Project Details" block. */
export function qa(items: Array<[string, string]>) {
  return items
    .map(([q, a]) => `<div style="font:800 15px/1.4 ${SANS};color:${INK}">${esc(q)}</div><div style="font:15px/1.5 ${SANS};color:${MUTED};margin:2px 0 13px">${esc(a)}</div>`)
    .join("");
}

export function quote(text: string, note?: string) {
  return `<div style="margin:6px 0 14px;padding:14px 16px;border-left:4px solid ${LIME};background:${TINT};border-radius:0 10px 10px 0">
    <div style="font:italic 15px/1.55 Georgia,'Times New Roman',serif;color:${INK}">“${text}”</div>
    ${note ? `<div style="margin-top:8px;font:12px/1.45 ${SANS};color:${MUTED}">${note}</div>` : ""}
  </div>`;
}

/** A note signed by the founder, with his photo: for mails that ask for a reply. */
export function founderNote(html: string) {
  return `${html}<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 2px"><tr>
    <td valign="middle"><img src="${ASSET}/founder.jpg" width="46" height="46" alt="Tarun" style="display:block;border:0;border-radius:50%"></td>
    <td valign="middle" style="padding-left:12px"><div style="font:800 15px/1.2 ${SANS};color:${INK}">Tarun Kumar</div><div style="margin-top:3px;font:13px/1.2 ${SANS};color:${MUTED}">Founder, Mantis · replies come to me</div></td>
  </tr></table>`;
}

/** 0–10 as a row of tappable boxes; each opens a reply with the score in the subject. */
export function scale(mailto: (n: number) => string) {
  return `<div style="font-size:0;margin:4px 0 8px">${Array.from({ length: 11 }, (_, n) =>
    `<a href="${esc(mailto(n))}" style="display:inline-block;width:38px;margin:0 5px 6px 0;padding:11px 0;border-radius:8px;background:${n >= 9 ? LIME : n >= 7 ? "#e8f3c3" : "#f1f1ec"};text-align:center;font:800 15px/1 ${SANS};color:${INK};text-decoration:none">${n}</a>`).join("")}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font:11px/1 ${MONO};color:${MUTED}">NOT LIKELY</td><td align="right" style="font:11px/1 ${MONO};color:${MUTED}">VERY LIKELY</td></tr></table>`;
}

/* ------------------------------------------------------------------ the message */

/**
 * @param rows   every row after the header, already wrapped (hero(), section(), securityBar…).
 * @param why    one sentence: why this person gets this mail.
 * @param unsubscribe false only for mail that isn't optional (plan expiry, account notices).
 */
export function shell(opts: {
  title: string; preheader: string; kind: string; rows: string; why: string; from: string;
  unsubscribe?: boolean; preferencesUrl?: string;
}) {
  const prefs = opts.preferencesUrl ?? `${COMPANY.site}/preferences`;
  const optOut = opts.unsubscribe === false ? "" :
    `<a href="${esc(prefs)}" style="color:${MUTED};text-decoration:underline">Manage preferences</a> &nbsp;·&nbsp; <a href="{{unsubscribe_url}}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a>`;
  // Padding after the preheader so the inbox preview stops there instead of running on into
  // "Mantis. Hi Tarun," from the body.
  const pad = "&#847;&zwnj;&nbsp;".repeat(90);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(opts.title)}</title><link href="${FONTS_CSS}" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(opts.preheader)}${pad}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE}"><tr><td align="center" style="padding:22px 10px 10px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:separate">
  ${opts.unsubscribe === false ? "" : `<tr><td align="right" style="padding:0 4px 10px;font:12px/16px ${SANS};color:${MUTED}">Not useful? <a href="{{unsubscribe_url}}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a></td></tr>`}
  ${header(opts.kind)}
  ${opts.rows}
  <tr><td style="padding:22px 12px 8px;text-align:center;font:12px/1.7 ${SANS};color:${MUTED}">
    <div style="margin-bottom:6px"><a href="${COMPANY.site}" style="color:${INK};font-weight:700;text-decoration:none">mantisai.in</a> &nbsp;·&nbsp; <a href="${COMPANY.site}/chat" style="color:${INK};text-decoration:none">Find leads</a> &nbsp;·&nbsp; <a href="mailto:${COMPANY.email}" style="color:${INK};text-decoration:none">Help</a></div>
    ${opts.why} Add ${esc(opts.from)} to your contacts so these reach your inbox.<br>${optOut}
    <div style="margin-top:10px;color:${SOFT}">${esc(COMPANY.legalName)} · ${esc(`${COMPANY.address.locality}, ${COMPANY.address.city}, ${COMPANY.address.region} ${COMPANY.address.postalCode}`)}</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Plain-text alternative: what text-only clients show and what filters read intent from. */
export function textBody(lines: Array<string | null | undefined | false>, opts: { unsubscribe?: boolean } = {}) {
  const out = lines.filter((l): l is string => typeof l === "string");
  if (opts.unsubscribe !== false) out.push("", `Manage preferences: ${COMPANY.site}/preferences`, `Unsubscribe: {{unsubscribe_url}}`);
  out.push(`${COMPANY.legalName}, ${COMPANY.address.city}`);
  return out.join("\n");
}

/** A free-standing white card (after a gap), rounded on all corners. */
export function card(inner: string, opts: { accent?: boolean; flatBottom?: boolean } = {}) {
  return `<tr><td style="background:${PAPER};padding:26px 28px 20px;border-radius:${opts.flatBottom ? "14px 14px 0 0" : "14px"};${opts.accent ? `border-top:5px solid ${LIME};` : ""}">${inner}</td></tr>`;
}
