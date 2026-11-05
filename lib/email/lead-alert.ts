import { COMPANY } from "@/lib/company";
import { textBody } from "@/lib/email/ui";
import { formatInr, type LeadInsight } from "@/lib/email/lead-insight";

/**
 * The lead-alert email, built on Bark's own measurements (docs/email-lifecycle-plan.md, "Bark: the
 * closest analog"; reference screenshots of Bark mails in the inbox research): a 600px column on a
 * grey page, the logo centred above the first card, ~40px card padding, an even rhythm down the
 * credits/phone/email rows, 56px-tall buttons, 20px between cards, and the dark do-not-forward bar
 * closing the first and last card. Fonts and colours are Mantis's own: Fraunces for headings, Plus
 * Jakarta Sans for text, Poppins for the wordmark, the dashboard's green for actions. Gmail ignores
 * web fonts, so each stack falls back to the nearest system face.
 *
 * Bark's two inventions are copied on purpose: the subject IS the lead, and the emoji in front of
 * it is a status code people learn to read in a notification (🔔 new). Where Bark quotes the buyer,
 * Mantis has no buyer speaking, so the quote is our estimate of what the lead could be worth to this
 * seller, labelled as an estimate right under it. The project questions are written for the
 * recipient's service (lib/email/lead-insight.ts).
 */

export type LeadAlert = {
  leadName: string;            // already masked
  category: string;
  area: string;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean | null;
  phoneMasked: string | null;
  emailMasked: string | null;
  searchTitle: string;         // the run this lead matched, in the user's words
  unlockedBy: number;          // other Mantis users who already unlocked it
  creditCost: number;
  creditsLeft: number;
  insight: LeadInsight;
  mapUrl: string | null;
  unlockUrl: string;
  detailsUrl: string;
  pricingUrl: string;
  preferencesUrl: string;
  from: string;
};

const PAGE = "#f2f2ef", PAPER = "#ffffff", INK = "#1f1b16", MUTED = "#5f5b55";
const GREEN = "#3f6420", MINT = "#f4f8e9";
const BODY = "'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const HEAD = "Fraunces,Georgia,'Times New Roman',serif";
const MARK = "Poppins,'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const FONTS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600;700&family=Poppins:wght@600&display=swap";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function leadAlertSubject(a: LeadAlert): string {
  const what = a.hasWebsite === false ? "has no website" : "matches your search";
  return `🔔 ${a.leadName}, a ${a.category} in ${a.area.split(",")[0]}, ${what}`;
}

// "for your services" reads like a template hole, so a generic service drops the clause.
const worth = (a: LeadAlert) => /^your services$/i.test(a.insight.service)
  ? `This lead might be worth ${formatInr(a.insight.minInr)}–${formatInr(a.insight.maxInr)} to you.`
  : `This lead might pay you ${formatInr(a.insight.minInr)}–${formatInr(a.insight.maxInr)} for ${a.insight.service}.`;

const ESTIMATE_NOTE = "Estimated by Mantis from the business's category, size and Google reviews. Not a quote from the business.";

function chip(icon: string, text: string) {
  return `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border-radius:999px;background:${MINT};font:600 13px/1 ${BODY};color:${INK}"><span style="color:${GREEN}">${icon}</span>&nbsp; ${esc(text)}</span>`;
}

function row(icon: string, html: string) {
  return `<tr><td width="40" valign="top" style="padding:0 0 18px;font:20px/22px ${BODY}">${icon}</td><td valign="top" style="padding:0 0 18px;font:16px/22px ${BODY};color:${INK}">${html}</td></tr>`;
}

function button(label: string, url: string, primary: boolean, width: number) {
  const style = primary
    ? `background:${GREEN};color:#ffffff;border:1px solid ${GREEN}`
    : `background:#ffffff;color:${GREEN};border:1px solid ${GREEN}`;
  return `<a href="${esc(url)}" style="display:inline-block;width:100%;max-width:${width}px;box-sizing:border-box;margin:0 14px 12px 0;padding:18px 10px;border-radius:6px;${style};text-align:center;font:600 16px/20px ${BODY};text-decoration:none">${esc(label)}</a>`;
}

const SECURITY = `<tr><td style="background:${INK};padding:4px 12px;text-align:center;font:italic 700 11.5px/16px ${BODY};color:#ffffff">For security purposes, please do not forward this email</td></tr>`;
const GAP = `<tr><td style="height:20px;line-height:20px;font-size:0">&nbsp;</td></tr>`;

function card(inner: string, pad: string) {
  return `<tr><td style="background:${PAPER};padding:${pad}">${inner}</td></tr>`;
}

export function leadAlertHtml(a: LeadAlert): string {
  const chips = [
    a.hasWebsite === false ? chip("✓", "No website") : "",
    a.phoneMasked ? chip("✓", "Phone listed") : "",
    a.rating != null ? chip("★", `${a.rating.toFixed(1)} · ${a.reviewCount ?? 0} reviews`) : "",
  ].join("");

  // Bark's "2/5 professionals have responded" is a real cap; Mantis has none, so no "/5" here.
  const takers = a.unlockedBy > 0
    ? `${a.unlockedBy} Mantis ${a.unlockedBy === 1 ? "user has" : "users have"} unlocked this lead`
    : "No Mantis user has unlocked this lead yet";

  const left = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${row("🪙", `<b>${a.creditCost} credits</b> to unlock`)}
      ${a.phoneMasked ? row("📞", esc(a.phoneMasked)) : ""}
      ${a.emailMasked ? row("✉️", esc(a.emailMasked)) : ""}
      ${row("💬", `<span style="font-style:italic">“${esc(a.insight.why)} ${esc(worth(a))}”</span>
        <div style="margin-top:8px;font:12px/17px ${BODY};color:${MUTED}">${esc(ESTIMATE_NOTE)}</div>`)}
    </table>`;
  const right = (a.mapUrl
    ? `<img src="${esc(a.mapUrl)}" width="236" alt="Map of ${esc(a.area)}" style="display:block;width:100%;max-width:236px;height:auto;border:0">`
    : "") + `<div style="margin-top:10px;font:12px/16px ${BODY};color:${MUTED}">${esc(takers)}</div>`;

  const canAfford = a.creditsLeft >= a.creditCost;
  const details = [...a.insight.details, ["Which of your searches did it match?", a.searchTitle] as [string, string]];

  const firstCard = card(`
    <div style="margin:0 0 8px;font:600 22px/28px ${HEAD};color:${INK}">🔔 ${esc(a.leadName)} is a new ${esc(a.category)} lead</div>
    <div style="margin:0 0 18px;font:17px/24px ${BODY};color:${INK}">📍 ${esc(a.area)}</div>
    <div style="margin:0 0 14px">${chips}</div>
    <div style="font-size:0">
      <div style="display:inline-block;vertical-align:top;width:100%;max-width:262px;margin:0 20px 16px 0">${left}</div>
      <div style="display:inline-block;vertical-align:top;width:100%;max-width:236px;margin:0 0 16px">${right}</div>
    </div>
    <div style="font-size:0;padding-top:4px">${button(`Unlock ${a.leadName}`, a.unlockUrl, true, 276)}${button("View details", a.detailsUrl, false, 216)}</div>`, "38px 40px 22px");

  const detailsCard = card(`
    <div style="margin:0 0 22px;font:600 22px/28px ${HEAD};color:${INK}">Project details</div>
    ${details.map(([q, ans]) => `<div style="font:700 15px/23px ${BODY};color:${INK}">${esc(q)}</div><div style="margin:0 0 12px;font:15px/23px ${BODY};color:${MUTED}">${esc(ans)}</div>`).join("")}
    <div style="font-size:0;padding-top:10px">${button(`Unlock ${a.leadName}`, a.unlockUrl, true, 200)}</div>`, "34px 40px 26px");

  const creditsCard = card(`
    <div style="margin:0 0 18px;font:600 22px/28px ${HEAD};color:${INK}">${canAfford ? `Unlock ${esc(a.leadName)} now` : `Unlock ${esc(a.leadName)} with a credit pack`}</div>
    <p style="margin:0 0 22px;font:15px/23px ${BODY};color:${MUTED}">${canAfford
      ? `You have ${a.creditsLeft.toLocaleString("en-IN")} credits, enough to unlock ${Math.floor(a.creditsLeft / a.creditCost)} leads like this one. Unlocking shows the full name, phone number and every email we found.`
      : `You'll need ${a.creditCost} credits to unlock this lead, and you have ${a.creditsLeft}. Packs start at ₹1,999 for 2,000 credits, and the credits never expire.`}</p>
    <div style="font-size:0">${button(canAfford ? `Unlock ${a.leadName}` : "See credit packs", canAfford ? a.unlockUrl : a.pricingUrl, true, 200)}</div>`, "34px 40px 26px");

  // The preview stops at the preheader instead of running on into the body text.
  const pad = "&#847;&zwnj;&nbsp;".repeat(90);
  const preheader = `${worth(a)} ${a.creditCost} credits to unlock.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(leadAlertSubject(a))}</title><link href="${FONTS}" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(preheader)}${pad}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE}"><tr><td align="center" style="padding:14px 10px 0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
  <tr><td align="right" style="padding:0 4px 10px;font:12px/16px ${BODY};color:${MUTED}">Lead alerts for “${esc(a.searchTitle)}” · <a href="{{unsubscribe_url}}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a></td></tr>
  <tr><td align="center" style="padding:14px 0 26px"><img src="https://mantisai.in/email/v1/05-mark.png" width="34" height="34" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:50%"><span style="display:inline-block;vertical-align:middle;margin-left:10px;font:600 30px/1 ${MARK};letter-spacing:-0.5px;color:${INK}">mantis</span></td></tr>
  ${firstCard}
  ${SECURITY}
  ${GAP}
  ${detailsCard}
  ${GAP}
  ${creditsCard}
  ${SECURITY}
  <tr><td style="padding:26px 20px 34px;text-align:center;font:12px/19px ${BODY};color:${MUTED}">
    Add ${esc(a.from)} to your contacts so new leads land in your inbox.<br>
    You receive these because you searched for “${esc(a.searchTitle)}” on Mantis. Don't want them? <a href="${esc(a.preferencesUrl)}" style="color:${GREEN}">Manage preferences</a> · <a href="{{unsubscribe_url}}" style="color:${GREEN}">Unsubscribe</a><br><br>
    ${esc(COMPANY.legalName)} | ${esc(`${COMPANY.address.locality}, ${COMPANY.address.city}, ${COMPANY.address.region} ${COMPANY.address.postalCode}`)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function leadAlertText(a: LeadAlert): string {
  return textBody([
    `${a.leadName} is a new ${a.category} lead`,
    a.area,
    ``,
    `${a.creditCost} credits to unlock`,
    a.phoneMasked && `Phone: ${a.phoneMasked}`,
    a.emailMasked && `Email: ${a.emailMasked}`,
    ``,
    `"${a.insight.why} ${worth(a)}"`,
    `(${ESTIMATE_NOTE})`,
    ``,
    `Unlock: ${a.unlockUrl}`,
    ``,
    `PROJECT DETAILS`,
    ...a.insight.details.map(([q, v]) => `${q}\n${v}`),
    `Which of your searches did it match?\n${a.searchTitle}`,
    ``,
    `You have ${a.creditsLeft} credits. Credit packs: ${a.pricingUrl}`,
    `For security purposes, please do not forward this email.`,
  ]);
}
