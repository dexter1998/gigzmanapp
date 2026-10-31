/**
 * "Mantis V2 is live" — a founder note to existing users asking them to try the new features and
 * send feedback. Sent once per user by scripts/send-v2-launch-email.ts.
 *
 * Placeholders: {{first_name}} (filled by the script; "there" when the account name doesn't look
 * like a person's) and {{unsubscribe_url}} (filled per recipient by sendBulkEmail — never by a
 * caller, the link is signed per address).
 *
 * Design: ink / white / warm-grey, green only on the one primary button and the logo, per
 * docs/ui-rules.md. Table layout, inline styles, 600px, pinned to light so Gmail/Outlook dark mode
 * can't half-invert it (same approach as lifecycle-templates.ts). No CID — every image is hosted
 * on mantisai.in and already deployed.
 */

export const V2_LAUNCH_SUBJECT = "Hey {{first_name}}, I'm Tarun, founder at Mantis Ai";
export const V2_LAUNCH_SENDER = "Tarun from Mantis Ai <tarun@mantisai.in>";
export const V2_LAUNCH_REPLY_TO = "Tarun <tarun@mantisai.in>";

const SITE = "https://mantisai.in";
const CTA_URL = `${SITE}/chat`;
const LINKEDIN_URL = "https://www.linkedin.com/in/tarunmottlia/";
const HEADSHOT_URL = `${SITE}/widget/founder.jpg`; // 160x160, shown at 80px = 2x for retina
const LOGO_URL = `${SITE}/email/v1/logo-sm.png`; // 260x57, shown at 120x26
const FEEDBACK_MAILTO =
  "mailto:tarun@mantisai.in?subject=" + encodeURIComponent("Mantis V2 feedback");

/** The nine things V2 shipped, in the order someone meets them in the product. */
export const V2_FEATURES: { title: string; body: string; tag?: string }[] = [
  { title: "AI chat lead finder", body: "Describe who you sell to in plain words. Mantis reads every website in depth, not just the listing." },
  { title: "Lead columns picked for your offer", body: "Owner, branches, services, hiring and more, chosen around what you actually sell." },
  { title: "Verified contact tiers", body: "Person, role and generic emails kept apart, and mobile marked separately from landline." },
  { title: "One-click mail, call and WhatsApp", body: "Reach any lead straight from its row." },
  { title: "AI campaign planner", body: "Writes multi-step sequences for your offer and runs them for you." },
  { title: "AI voice calls in Hindi and English", body: "Calls leads and books meetings.", tag: "Free test call to yourself" },
  { title: "Inbox with AI summaries", body: "Every reply summarised, so you know who to answer first." },
  { title: "Saved business profiles", body: "Tell Mantis what you sell once; every search uses it." },
  { title: "Pay-as-you-go top-ups", body: "Add any amount, credits never expire.", tag: "From ₹50" },
];

const FONT = "'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Fraunces,Georgia,'Times New Roman',serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

// Palette — ink, warm greys, one green.
const INK = "#16181a";
const MUTED = "#5f6466";
const FAINT = "#8a8f90";
const RULE = "#e6e6e0";
const SUNK = "#f4f4ef";
const PAGE = "#f7f7f3";
const ACCENT = "#3f6420";
const LINKEDIN = "#0a66c2";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/₹/g, "&#8377;");
}

function featureRow(f: (typeof V2_FEATURES)[number], i: number, last: boolean): string {
  const n = String(i + 1).padStart(2, "0");
  const tag = f.tag
    ? `&nbsp;<span class="dm-sunk" style="display:inline-block;background:${SUNK};border:1px solid ${RULE};border-radius:4px;padding:1px 6px;font-family:${FONT};font-size:11px;line-height:16px;font-weight:500;color:${INK};white-space:nowrap;vertical-align:1px;">${esc(f.tag)}</span>`
    : "";
  const border = last ? "" : `border-bottom:1px solid ${RULE};`;
  return `
<tr>
 <td width="44" valign="top" style="width:44px;padding:14px 0;${border}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
   <td class="dm-sunk" width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background:${SUNK};border:1px solid ${RULE};border-radius:6px;font-family:${MONO};font-size:11px;line-height:28px;font-weight:600;color:${INK};">${n}</td>
  </tr></table>
 </td>
 <td valign="top" style="padding:14px 0;${border}font-family:${FONT};">
  <div class="dm-ink" style="font-size:14px;line-height:20px;font-weight:600;color:${INK};">${esc(f.title)}${tag}</div>
  <div class="dm-muted" style="font-size:13px;line-height:19px;font-weight:400;color:${MUTED};padding-top:2px;">${esc(f.body)}</div>
 </td>
</tr>`;
}

export const V2_LAUNCH_HTML = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>Mantis V2 is live</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:only light;supported-color-schemes:only light;}
  html,body{margin:0!important;padding:0!important;width:100%!important;background:${PAGE};}
  table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
  a{text-decoration:none;}
  @media only screen and (max-width:620px){
    .c{width:100%!important;}
    .p{padding-left:20px!important;padding-right:20px!important;}
    .h1{font-size:26px!important;line-height:32px!important;}
    .stack{display:block!important;width:100%!important;}
    .btn-table{width:100%!important;}
    .btn-gap{display:block!important;height:12px!important;width:100%!important;}
    .btn{display:block!important;width:100%!important;}
    .btn a{display:block!important;text-align:center!important;}
  }
  /* Pin the light palette: clients that honour prefers-color-scheme get the same colours back
     instead of a partial inversion that turns ink text grey-on-grey. */
  @media (prefers-color-scheme: dark){
    html,body,.dm-page{background:${PAGE}!important;}
    .dm-card{background:#ffffff!important;}
    .dm-sunk{background:${SUNK}!important;}
    .dm-ink{color:${INK}!important;}
    .dm-muted{color:${MUTED}!important;}
    .dm-faint{color:${FAINT}!important;}
    .dm-accent{background:${ACCENT}!important;color:#ffffff!important;}
  }
  [data-ogsc] .dm-ink{color:${INK}!important;}
  [data-ogsc] .dm-muted{color:${MUTED}!important;}
</style>
</head>
<body class="dm-page" style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE};opacity:0;">V2 is live. You've used Mantis before, so I'd love 10 minutes of your honest feedback on what's new.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-page" style="background:${PAGE};"><tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="c" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

 <!-- logo row -->
 <tr><td style="padding:0 4px 16px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
   <td valign="middle"><a href="${SITE}"><img src="${LOGO_URL}" width="120" height="26" alt="Mantis Ai" style="display:block;width:120px;height:26px;"></a></td>
   <td valign="middle" align="right" class="dm-muted" style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:500;color:${MUTED};">A note from the founder</td>
  </tr></table>
 </td></tr>

 <!-- card -->
 <tr><td class="dm-card" style="background:#ffffff;border:1px solid ${RULE};border-radius:12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

   <!-- founder strip -->
   <tr><td class="p" style="padding:32px 40px 0 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
     <td width="80" valign="middle" style="width:80px;"><a href="${LINKEDIN_URL}"><img src="${HEADSHOT_URL}" width="80" height="80" alt="Tarun, founder of Mantis Ai" style="display:block;width:80px;height:80px;border-radius:999px;border:1px solid ${RULE};"></a></td>
     <td width="16" style="width:16px;font-size:0;line-height:0;">&nbsp;</td>
     <td valign="middle" style="font-family:${FONT};">
      <div class="dm-ink" style="font-size:15px;line-height:20px;font-weight:600;color:${INK};">Tarun Kumar</div>
      <div class="dm-muted" style="font-size:13px;line-height:18px;color:${MUTED};padding-top:2px;">Founder, Mantis Ai</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
       <td width="16" height="16" align="center" valign="middle" bgcolor="${LINKEDIN}" style="width:16px;height:16px;background:${LINKEDIN};border-radius:3px;font-family:Arial,sans-serif;font-size:10px;line-height:16px;font-weight:700;color:#ffffff;">in</td>
       <td style="padding-left:6px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:500;"><a href="${LINKEDIN_URL}" class="dm-ink" style="color:${INK};text-decoration:underline;">Connect on LinkedIn</a></td>
      </tr></table>
     </td>
    </tr></table>
   </td></tr>

   <!-- headline + intro -->
   <tr><td class="p" style="padding:28px 40px 0 40px;">
    <span class="dm-sunk dm-ink" style="display:inline-block;background:${SUNK};border:1px solid ${RULE};border-radius:4px;padding:2px 8px;font-family:${FONT};font-size:11px;line-height:16px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${INK};">Mantis V2 is live</span>
    <h1 class="h1 dm-ink" style="margin:14px 0 0 0;font-family:${SERIF};font-size:30px;line-height:36px;font-weight:500;letter-spacing:-0.01em;color:${INK};">Hey {{first_name}}, could you give V2 a spin?</h1>
    <p class="dm-ink" style="margin:16px 0 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">I'm Tarun, founder of Mantis Ai. We've just launched V2 of Mantis, and I'd really value your help.</p>
    <p class="dm-ink" style="margin:12px 0 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">You've already tried the product, so you know where it started. Could you spend ten minutes on the new features below and tell me what works, what breaks and what's missing?</p>
   </td></tr>

   <!-- features -->
   <tr><td class="p" style="padding:24px 40px 0 40px;">
    <div class="dm-muted" style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};padding-bottom:4px;border-bottom:1px solid ${RULE};">What's new in V2</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${V2_FEATURES.map((f, i) => featureRow(f, i, i === V2_FEATURES.length - 1)).join("")}
    </table>
   </td></tr>

   <!-- CTAs -->
   <tr><td class="p" style="padding:24px 40px 0 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn-table"><tr>
     <td class="btn">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${CTA_URL}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="14%" stroke="f" fillcolor="${ACCENT}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Try Mantis V2</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="${CTA_URL}" class="dm-accent" style="display:inline-block;background:${ACCENT};border-radius:6px;padding:12px 24px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;">Try Mantis V2 &rarr;</a><!--<![endif]-->
     </td>
     <td class="btn-gap" width="12" style="width:12px;font-size:0;line-height:0;">&nbsp;</td>
     <td class="btn">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${FEEDBACK_MAILTO}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" strokecolor="#c9cac3" fillcolor="#ffffff"><center style="color:${INK};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Reply with feedback</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="${FEEDBACK_MAILTO}" class="dm-ink" style="display:inline-block;background:#ffffff;border:1px solid #c9cac3;border-radius:6px;padding:11px 23px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:500;color:${INK};text-decoration:none;">Reply with feedback</a><!--<![endif]-->
     </td>
    </tr></table>
   </td></tr>

   <!-- reply note + sign-off -->
   <tr><td class="p" style="padding:24px 40px 32px 40px;">
    <p class="dm-ink" style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">You can mail me directly at <a href="mailto:tarun@mantisai.in" class="dm-ink" style="color:${INK};text-decoration:underline;">tarun@mantisai.in</a> or just hit reply. It comes straight to me, and I read every one.</p>
    <p class="dm-ink" style="margin:16px 0 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">Thank you for being early,<br><span style="font-weight:600;">Tarun</span></p>
   </td></tr>

  </table>
 </td></tr>

 <!-- footer -->
 <tr><td style="padding:20px 8px 0 8px;font-family:${FONT};font-size:12px;line-height:18px;color:${FAINT};" class="dm-faint" align="center">
  You're receiving this because you have a Mantis Ai account.<br>
  <a href="{{unsubscribe_url}}" class="dm-muted" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a> &middot; <a href="${SITE}" class="dm-muted" style="color:${MUTED};text-decoration:underline;">mantisai.in</a><br>
  Reverblunt Private Limited &middot; Gurugram, India
 </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;

export const V2_LAUNCH_TEXT = [
  "Hey {{first_name}},",
  "",
  "I'm Tarun, founder of Mantis Ai. We've just launched V2 of Mantis, and I'd really value your help.",
  "",
  "You've already tried the product, so you know where it started. Could you spend ten minutes on the new features below and tell me what works, what breaks and what's missing?",
  "",
  "WHAT'S NEW IN V2",
  "",
  ...V2_FEATURES.map((f, i) => `${i + 1}. ${f.title}${f.tag ? ` (${f.tag})` : ""} - ${f.body}`),
  "",
  `Try Mantis V2: ${CTA_URL}`,
  "",
  "You can mail me directly at tarun@mantisai.in or just reply to this email. It comes straight to me, and I read every one.",
  "",
  "Thank you for being early,",
  "Tarun Kumar",
  "Founder, Mantis Ai",
  `LinkedIn: ${LINKEDIN_URL}`,
  "",
  "--",
  "You're receiving this because you have a Mantis Ai account.",
  "Unsubscribe: {{unsubscribe_url}}",
  "Reverblunt Private Limited, Gurugram, India",
].join("\n");
