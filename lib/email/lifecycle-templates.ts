// GENERATED from mantis-email-templates/build/*.html — do not hand-edit.
// Rebuild there (buildNN.py -> darkmode.py) and regenerate rather than patching these copies.
//
// Images are absolute https URLs served from this app's own /email/v1, not CID attachments, and
// every colour is pinned so a client forcing dark mode can't repaint the design.
//
// Counts and lead details are placeholders, never baked in: the design mock said "15 businesses",
// and mailing that number to someone whose area has four would be a claim we can't stand behind.

/** 02-15-urgent-leads
 *  Placeholders: {{lead_count}}, {{lead_count_more}}, {{preferences_url}}, {{unlock_all_url}}, {{unlock_lead_url}}, {{unsubscribe_url}} */
export const LEADS_FOUND_HTML = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><!--dm-pinned-->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>{{lead_count}} fresh website opportunities &middot; Mantis Ai</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root{color-scheme:only light;supported-color-schemes:only light;}
  html,body{margin:0!important;padding:0!important;width:100%!important;background:#f7f7f3;}
  table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
  a{text-decoration:none;}
  @media only screen and (max-width:620px){
    .c{width:100%!important;}
    .p{padding-left:18px!important;padding-right:18px!important;}
    .stack{display:block!important;width:100%!important;max-width:100%!important;}
    .h1{font-size:32px!important;line-height:1.12!important;}
    .hide-sm{display:none!important;}
  }
</style>

<style>
  @media (prefers-color-scheme: dark) {
  html,body{background:#f7f7f3!important;}
  .dmb-111315{background-color:#111315!important}
  .dmb-f5f8ec{background-color:#f5f8ec!important}
  .dmb-f7f7f3{background-color:#f7f7f3!important}
  .dmb-f8faf2{background-color:#f8faf2!important}
  .dmb-fafbf6{background-color:#fafbf6!important}
  .dmb-ffffff{background-color:#ffffff!important}
  .dmc-111315{color:#111315!important}
  .dmc-4f5657{color:#4f5657!important}
  .dmc-54780a{color:#54780a!important}
  .dmc-565b5d{color:#565b5d!important}
  .dmc-5d8304{color:#5d8304!important}
  .dmc-5e8508{color:#5e8508!important}
  .dmc-64880d{color:#64880d!important}
  .dmc-696e70{color:#696e70!important}
  .dmc-6d7374{color:#6d7374!important}
  .dmc-777c7d{color:#777c7d!important}
  .dmc-8cbe06{color:#8cbe06!important}
  .dmc-b7e51d{color:#b7e51d!important}
  .dmc-eb402a{color:#eb402a!important}
  .dmc-f7f7f3{color:#f7f7f3!important}
  .dmc-ffffff{color:#ffffff!important}
  .dmk-8ebd17{border-color:#8ebd17!important}
  .dmk-dbe7b9{border-color:#dbe7b9!important}
  .dmk-dfe5cd{border-color:#dfe5cd!important}
  .dmk-e1e3dc{border-color:#e1e3dc!important}
  .dmk-e5e6e1{border-color:#e5e6e1!important}
  .dmk-e7e8e2{border-color:#e7e8e2!important}
  .dmk-e8eadf{border-color:#e8eadf!important}
  }
  [data-ogsc] .dmb-111315,[data-ogsb] .dmb-111315{background-color:#111315!important}
  [data-ogsc] .dmb-f5f8ec,[data-ogsb] .dmb-f5f8ec{background-color:#f5f8ec!important}
  [data-ogsc] .dmb-f7f7f3,[data-ogsb] .dmb-f7f7f3{background-color:#f7f7f3!important}
  [data-ogsc] .dmb-f8faf2,[data-ogsb] .dmb-f8faf2{background-color:#f8faf2!important}
  [data-ogsc] .dmb-fafbf6,[data-ogsb] .dmb-fafbf6{background-color:#fafbf6!important}
  [data-ogsc] .dmb-ffffff,[data-ogsb] .dmb-ffffff{background-color:#ffffff!important}
  [data-ogsc] .dmc-111315,[data-ogsb] .dmc-111315{color:#111315!important}
  [data-ogsc] .dmc-4f5657,[data-ogsb] .dmc-4f5657{color:#4f5657!important}
  [data-ogsc] .dmc-54780a,[data-ogsb] .dmc-54780a{color:#54780a!important}
  [data-ogsc] .dmc-565b5d,[data-ogsb] .dmc-565b5d{color:#565b5d!important}
  [data-ogsc] .dmc-5d8304,[data-ogsb] .dmc-5d8304{color:#5d8304!important}
  [data-ogsc] .dmc-5e8508,[data-ogsb] .dmc-5e8508{color:#5e8508!important}
  [data-ogsc] .dmc-64880d,[data-ogsb] .dmc-64880d{color:#64880d!important}
  [data-ogsc] .dmc-696e70,[data-ogsb] .dmc-696e70{color:#696e70!important}
  [data-ogsc] .dmc-6d7374,[data-ogsb] .dmc-6d7374{color:#6d7374!important}
  [data-ogsc] .dmc-777c7d,[data-ogsb] .dmc-777c7d{color:#777c7d!important}
  [data-ogsc] .dmc-8cbe06,[data-ogsb] .dmc-8cbe06{color:#8cbe06!important}
  [data-ogsc] .dmc-b7e51d,[data-ogsb] .dmc-b7e51d{color:#b7e51d!important}
  [data-ogsc] .dmc-eb402a,[data-ogsb] .dmc-eb402a{color:#eb402a!important}
  [data-ogsc] .dmc-f7f7f3,[data-ogsb] .dmc-f7f7f3{color:#f7f7f3!important}
  [data-ogsc] .dmc-ffffff,[data-ogsb] .dmc-ffffff{color:#ffffff!important}
  [data-ogsc] .dmk-8ebd17,[data-ogsb] .dmk-8ebd17{border-color:#8ebd17!important}
  [data-ogsc] .dmk-dbe7b9,[data-ogsb] .dmk-dbe7b9{border-color:#dbe7b9!important}
  [data-ogsc] .dmk-dfe5cd,[data-ogsb] .dmk-dfe5cd{border-color:#dfe5cd!important}
  [data-ogsc] .dmk-e1e3dc,[data-ogsb] .dmk-e1e3dc{border-color:#e1e3dc!important}
  [data-ogsc] .dmk-e5e6e1,[data-ogsb] .dmk-e5e6e1{border-color:#e5e6e1!important}
  [data-ogsc] .dmk-e7e8e2,[data-ogsb] .dmk-e7e8e2{border-color:#e7e8e2!important}
  [data-ogsc] .dmk-e8eadf,[data-ogsb] .dmk-e8eadf{border-color:#e8eadf!important}
  [data-ogsb] body,[data-ogsc] body{background:#f7f7f3!important;}
</style>
</head>
<body class="dmb-f7f7f3" style="margin:0;padding:0;background:#f7f7f3;">
<div class="dmc-f7f7f3" style="display:none;font-size:1px;color:#f7f7f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Mantis found {{lead_count}} businesses that urgently need website development.</div>
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table class="dmb-f7f7f3" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7f3" style="background:#f7f7f3;">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="c dmb-ffffff dmk-e7e8e2" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e7e8e2;border-radius:22px;overflow:hidden;">
<tr><td class="p" style="padding:36px 30px 26px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
   <img src="https://mantisai.in/email/v1/logo.png" width="180" height="39" alt="Mantis" style="display:block;border:0;width:180px;height:39px;max-width:100%;margin:0 auto;"></td></tr></table>
 <div style="line-height:18px;font-size:18px;height:18px;">&nbsp;</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="dmc-64880d dmb-f5f8ec dmk-dbe7b9" style="background:#f5f8ec;border:1px solid #dbe7b9;border-radius:999px;padding:9px 19px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#64880d;white-space:nowrap;">&#9679; &nbsp;Website Opportunity</td></tr></table>
 <div style="line-height:16px;font-size:16px;height:16px;">&nbsp;</div>
 <div class="h1 dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:40px;line-height:1.1;letter-spacing:-1.1px;font-weight:800;color:#111315;margin:0 0 12px;text-align:center;">{{lead_count}} fresh opportunities</div>
 <div class="dmc-565b5d" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#565b5d;font-weight:400;margin:0 0 24px;text-align:center;">We found {{lead_count}} businesses that urgently need website development.<br>Reach them while the opportunity is hot.</div>
 <!-- LEADS:BEGIN (server loop) -->
 <table class="dmb-ffffff dmk-e1e3dc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e1e3dc;border-radius:15px;margin:0 0 12px;"><tr><td style="padding:14px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="56" valign="top" style="width:56px;"><img src="https://mantisai.in/email/v1/02-cat-cafe.jpg" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;"></td>
<td width="10" style="width:10px;">&nbsp;</td>
<td valign="top" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-111315" style="font-size:17px;font-weight:750;color:#111315;line-height:1.25;">Brewz Caf&eacute;</div>
  <div class="dmc-696e70" style="font-size:12px;color:#696e70;padding:4px 0 7px;">Sector 56, Gurugram</div>
  <div style="line-height:1.9;"><span class="dmc-4f5657 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#4f5657;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">No Website</span><span class="dmc-5e8508 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#5e8508;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">&#8599; High Intent</span></div>
</td>
<td width="66" align="center" valign="top" style="width:66px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-eb402a" style="font-size:12px;color:#eb402a;font-weight:750;line-height:1.3;">Heat 94</div>
  <div class="dmc-111315" style="font-size:16px;color:#111315;font-weight:700;padding-top:3px;">4.7 <span class="dmc-8cbe06" style="color:#8cbe06;">&#9733;</span></div>
</td>
<td width="80" align="right" valign="top" style="width:80px;"><a class="dmc-5d8304 dmk-8ebd17" href="{{unlock_lead_url}}" style="display:inline-block;border:1px solid #8ebd17;color:#5d8304;border-radius:9px;padding:9px 13px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">Unlock</a></td>
</tr></table></td></tr></table><table class="dmb-ffffff dmk-e1e3dc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e1e3dc;border-radius:15px;margin:0 0 12px;"><tr><td style="padding:14px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="56" valign="top" style="width:56px;"><img src="https://mantisai.in/email/v1/02-cat-dental.jpg" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;"></td>
<td width="10" style="width:10px;">&nbsp;</td>
<td valign="top" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-111315" style="font-size:17px;font-weight:750;color:#111315;line-height:1.25;">Urban Dental Care</div>
  <div class="dmc-696e70" style="font-size:12px;color:#696e70;padding:4px 0 7px;">DLF Phase 2, Gurugram</div>
  <div style="line-height:1.9;"><span class="dmc-4f5657 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#4f5657;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">No Website</span><span class="dmc-5e8508 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#5e8508;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">&#8599; High Transactional</span></div>
</td>
<td width="66" align="center" valign="top" style="width:66px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-eb402a" style="font-size:12px;color:#eb402a;font-weight:750;line-height:1.3;">Heat 91</div>
  <div class="dmc-111315" style="font-size:16px;color:#111315;font-weight:700;padding-top:3px;">4.6 <span class="dmc-8cbe06" style="color:#8cbe06;">&#9733;</span></div>
</td>
<td width="80" align="right" valign="top" style="width:80px;"><a class="dmc-5d8304 dmk-8ebd17" href="{{unlock_lead_url}}" style="display:inline-block;border:1px solid #8ebd17;color:#5d8304;border-radius:9px;padding:9px 13px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">Unlock</a></td>
</tr></table></td></tr></table><table class="dmb-ffffff dmk-e1e3dc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e1e3dc;border-radius:15px;margin:0 0 12px;"><tr><td style="padding:14px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="56" valign="top" style="width:56px;"><img src="https://mantisai.in/email/v1/02-cat-fitness.jpg" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;"></td>
<td width="10" style="width:10px;">&nbsp;</td>
<td valign="top" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-111315" style="font-size:17px;font-weight:750;color:#111315;line-height:1.25;">Elite Fitness Studio</div>
  <div class="dmc-696e70" style="font-size:12px;color:#696e70;padding:4px 0 7px;">Sector 29, Gurugram</div>
  <div style="line-height:1.9;"><span class="dmc-4f5657 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#4f5657;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">Weak Website</span><span class="dmc-5e8508 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#5e8508;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">&#8599; High Intent</span></div>
</td>
<td width="66" align="center" valign="top" style="width:66px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-eb402a" style="font-size:12px;color:#eb402a;font-weight:750;line-height:1.3;">Heat 88</div>
  <div class="dmc-111315" style="font-size:16px;color:#111315;font-weight:700;padding-top:3px;">4.8 <span class="dmc-8cbe06" style="color:#8cbe06;">&#9733;</span></div>
</td>
<td width="80" align="right" valign="top" style="width:80px;"><a class="dmc-5d8304 dmk-8ebd17" href="{{unlock_lead_url}}" style="display:inline-block;border:1px solid #8ebd17;color:#5d8304;border-radius:9px;padding:9px 13px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">Unlock</a></td>
</tr></table></td></tr></table><table class="dmb-ffffff dmk-e1e3dc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e1e3dc;border-radius:15px;margin:0 0 12px;"><tr><td style="padding:14px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="56" valign="top" style="width:56px;"><img src="https://mantisai.in/email/v1/02-cat-edu.png" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;"></td>
<td width="10" style="width:10px;">&nbsp;</td>
<td valign="top" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-111315" style="font-size:17px;font-weight:750;color:#111315;line-height:1.25;">The Learning Hub</div>
  <div class="dmc-696e70" style="font-size:12px;color:#696e70;padding:4px 0 7px;">Sector 45, Gurugram</div>
  <div style="line-height:1.9;"><span class="dmc-4f5657 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#4f5657;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">No Website</span><span class="dmc-5e8508 dmb-f8faf2 dmk-dfe5cd" style="display:inline-block;border:1px solid #dfe5cd;border-radius:7px;background:#f8faf2;color:#5e8508;padding:4px 8px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.2;white-space:nowrap;margin:0 5px 4px 0;">&#8599; High Intent</span></div>
</td>
<td width="66" align="center" valign="top" style="width:66px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
  <div class="dmc-eb402a" style="font-size:12px;color:#eb402a;font-weight:750;line-height:1.3;">Heat 86</div>
  <div class="dmc-111315" style="font-size:16px;color:#111315;font-weight:700;padding-top:3px;">4.5 <span class="dmc-8cbe06" style="color:#8cbe06;">&#9733;</span></div>
</td>
<td width="80" align="right" valign="top" style="width:80px;"><a class="dmc-5d8304 dmk-8ebd17" href="{{unlock_lead_url}}" style="display:inline-block;border:1px solid #8ebd17;color:#5d8304;border-radius:9px;padding:9px 13px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">Unlock</a></td>
</tr></table></td></tr></table>
 <!-- LEADS:END -->
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;"><tr>
  <td class="dmb-fafbf6 dmk-e8eadf" align="center" style="background:#fafbf6;border:1px solid #e8eadf;border-radius:14px;padding:14px;">
   <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
     <td valign="middle" style="width:44px;"><img src="https://mantisai.in/email/v1/02-bubble.png" width="44" height="44" alt="+11" style="display:block;border:0;width:44px;height:44px;max-width:100%;"></td>
     <td width="12" style="width:12px;">&nbsp;</td>
     <td class="dmc-54780a" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:650;color:#54780a;">+{{lead_count_more}} more urgent leads</td>
   </tr></table>
  </td></tr></table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{unlock_all_url}}" style="height:56px;v-text-anchor:middle;width:540px;" arcsize="20%" stroke="f" fillcolor="#111315"><w:anchorlock/><center class="dmc-ffffff" style="color:#ffffff;font-family:Arial,sans-serif;font-size:19px;font-weight:bold;">Unlock {{lead_count}} Leads &rarr;</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- -->
<a class="dmc-ffffff dmb-111315" href="{{unlock_all_url}}" style="background:#111315;border-radius:12px;color:#ffffff;display:block;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:19px;font-weight:700;line-height:1.2;text-align:center;padding:18px 26px;text-decoration:none;">Unlock {{lead_count}} Leads <span class="dmc-b7e51d" style="color:#b7e51d;">&rarr;</span></a>
<!--<![endif]-->
</td></tr></table>
 <div style="line-height:18px;font-size:18px;height:18px;">&nbsp;</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
   <td valign="middle" style="padding-right:8px;"><img src="https://mantisai.in/email/v1/ico-clock2.jpg" width="20" height="20" alt="" style="display:block;border:0;width:20px;height:20px;max-width:100%;"></td>
   <td class="dmc-6d7374" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#6d7374;">Fresh opportunities can change quickly.</td>
 </tr></table>
</td></tr><tr><td class="dmc-777c7d dmk-e5e6e1" style="padding:26px 30px 32px;border-top:1px solid #e5e6e1;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.8;color:#777c7d;">You&rsquo;re receiving this because you created a Mantis account.<br><a class="dmc-64880d" href="{{preferences_url}}" style="color:#64880d;text-decoration:underline;">Manage preferences</a> &nbsp;&middot;&nbsp; <a class="dmc-64880d" href="{{unsubscribe_url}}" style="color:#64880d;text-decoration:underline;">Unsubscribe</a><br>&copy; 2026 Mantis Ai</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
export const LEADS_FOUND_TEXT = "15 fresh opportunities in {{city}}\n\nWe found 15 businesses that urgently need website development.\n\n- Brewz Cafe, Sector 56 - Heat 94, 4.7*, No Website\n- Urban Dental Care, DLF Phase 2 - Heat 91, 4.6*, No Website\n- Elite Fitness Studio, Sector 29 - Heat 88, 4.8*, Weak Website\n- The Learning Hub, Sector 45 - Heat 86, 4.5*, No Website\n+11 more urgent leads\n\nUnlock: {{unlock_all_url}}\n\nUnsubscribe: {{unsubscribe_url}}";

/** 04-urgent-single-lead
 *  Placeholders: {{lead_category}}, {{lead_location}}, {{lead_name_masked}}, {{lead_rating}}, {{lead_reviews}}, {{manage_alerts_url}}, {{unlock_lead_url}}, {{unsubscribe_url}} */
export const SINGLE_LEAD_HTML = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><!--dm-pinned-->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>Urgent website opportunity &middot; Mantis Ai</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root{color-scheme:only light;supported-color-schemes:only light;}
  html,body{margin:0!important;padding:0!important;width:100%!important;background:#f7f7f3;}
  table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
  a{text-decoration:none;}
  @media only screen and (max-width:620px){
    .c{width:100%!important;}
    .p{padding-left:18px!important;padding-right:18px!important;}
    .stack{display:block!important;width:100%!important;max-width:100%!important;}
    .h1{font-size:32px!important;line-height:1.12!important;}
    .hide-sm{display:none!important;}
  }
</style>

<style>
  @media (prefers-color-scheme: dark) {
  html,body{background:#f7f7f3!important;}
  .dmb-111315{background-color:#111315!important}
  .dmb-f7f7f3{background-color:#f7f7f3!important}
  .dmb-fbfcf8{background-color:#fbfcf8!important}
  .dmb-fff7f4{background-color:#fff7f4!important}
  .dmb-ffffff{background-color:#ffffff!important}
  .dmc-111315{color:#111315!important}
  .dmc-4f5556{color:#4f5556!important}
  .dmc-565b5d{color:#565b5d!important}
  .dmc-628d06{color:#628d06!important}
  .dmc-64880d{color:#64880d!important}
  .dmc-666b6c{color:#666b6c!important}
  .dmc-697071{color:#697071!important}
  .dmc-777c7d{color:#777c7d!important}
  .dmc-df3925{color:#df3925!important}
  .dmc-f7f7f3{color:#f7f7f3!important}
  .dmc-ffffff{color:#ffffff!important}
  .dmk-95bd25{border-color:#95bd25!important}
  .dmk-e0e3dc{border-color:#e0e3dc!important}
  .dmk-e2e7d6{border-color:#e2e7d6!important}
  .dmk-e4e6df{border-color:#e4e6df!important}
  .dmk-e5e6e1{border-color:#e5e6e1!important}
  .dmk-e7e8e2{border-color:#e7e8e2!important}
  .dmk-e8eae4{border-color:#e8eae4!important}
  .dmk-f19a83{border-color:#f19a83!important}
  }
  [data-ogsc] .dmb-111315,[data-ogsb] .dmb-111315{background-color:#111315!important}
  [data-ogsc] .dmb-f7f7f3,[data-ogsb] .dmb-f7f7f3{background-color:#f7f7f3!important}
  [data-ogsc] .dmb-fbfcf8,[data-ogsb] .dmb-fbfcf8{background-color:#fbfcf8!important}
  [data-ogsc] .dmb-fff7f4,[data-ogsb] .dmb-fff7f4{background-color:#fff7f4!important}
  [data-ogsc] .dmb-ffffff,[data-ogsb] .dmb-ffffff{background-color:#ffffff!important}
  [data-ogsc] .dmc-111315,[data-ogsb] .dmc-111315{color:#111315!important}
  [data-ogsc] .dmc-4f5556,[data-ogsb] .dmc-4f5556{color:#4f5556!important}
  [data-ogsc] .dmc-565b5d,[data-ogsb] .dmc-565b5d{color:#565b5d!important}
  [data-ogsc] .dmc-628d06,[data-ogsb] .dmc-628d06{color:#628d06!important}
  [data-ogsc] .dmc-64880d,[data-ogsb] .dmc-64880d{color:#64880d!important}
  [data-ogsc] .dmc-666b6c,[data-ogsb] .dmc-666b6c{color:#666b6c!important}
  [data-ogsc] .dmc-697071,[data-ogsb] .dmc-697071{color:#697071!important}
  [data-ogsc] .dmc-777c7d,[data-ogsb] .dmc-777c7d{color:#777c7d!important}
  [data-ogsc] .dmc-df3925,[data-ogsb] .dmc-df3925{color:#df3925!important}
  [data-ogsc] .dmc-f7f7f3,[data-ogsb] .dmc-f7f7f3{color:#f7f7f3!important}
  [data-ogsc] .dmc-ffffff,[data-ogsb] .dmc-ffffff{color:#ffffff!important}
  [data-ogsc] .dmk-95bd25,[data-ogsb] .dmk-95bd25{border-color:#95bd25!important}
  [data-ogsc] .dmk-e0e3dc,[data-ogsb] .dmk-e0e3dc{border-color:#e0e3dc!important}
  [data-ogsc] .dmk-e2e7d6,[data-ogsb] .dmk-e2e7d6{border-color:#e2e7d6!important}
  [data-ogsc] .dmk-e4e6df,[data-ogsb] .dmk-e4e6df{border-color:#e4e6df!important}
  [data-ogsc] .dmk-e5e6e1,[data-ogsb] .dmk-e5e6e1{border-color:#e5e6e1!important}
  [data-ogsc] .dmk-e7e8e2,[data-ogsb] .dmk-e7e8e2{border-color:#e7e8e2!important}
  [data-ogsc] .dmk-e8eae4,[data-ogsb] .dmk-e8eae4{border-color:#e8eae4!important}
  [data-ogsc] .dmk-f19a83,[data-ogsb] .dmk-f19a83{border-color:#f19a83!important}
  [data-ogsb] body,[data-ogsc] body{background:#f7f7f3!important;}
</style>
</head>
<body class="dmb-f7f7f3" style="margin:0;padding:0;background:#f7f7f3;">
<div class="dmc-f7f7f3" style="display:none;font-size:1px;color:#f7f7f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">A high-value local website opportunity was verified today.</div>
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table class="dmb-f7f7f3" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7f3" style="background:#f7f7f3;">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="c dmb-ffffff dmk-e7e8e2" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e7e8e2;border-radius:22px;overflow:hidden;">
<tr><td class="p" style="padding:36px 30px 24px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
   <img src="https://mantisai.in/email/v1/logo.png" width="180" height="39" alt="Mantis" style="display:block;border:0;width:180px;height:39px;max-width:100%;margin:0 auto;"></td></tr></table>
 <div style="line-height:16px;font-size:16px;height:16px;">&nbsp;</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="dmc-df3925 dmb-fff7f4 dmk-f19a83" style="background:#fff7f4;border:1px solid #f19a83;border-radius:999px;padding:9px 19px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#df3925;white-space:nowrap;">&#9889; &nbsp;Urgent website opportunity</td></tr></table>
 <div style="line-height:18px;font-size:18px;height:18px;">&nbsp;</div>
 <div class="h1 dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:37px;line-height:1.1;letter-spacing:-1.1px;font-weight:800;color:#111315;margin:0 0 12px;text-align:center;">Convert this lead before<br>another agency does.</div>
 <div class="dmc-565b5d" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#565b5d;font-weight:400;margin:0 0 22px;text-align:center;">This local business shows strong commercial intent<br>and no active website.</div>

 <table class="dmk-e0e3dc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0e3dc;border-radius:18px;">
 <tr><td style="padding:22px 20px 18px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
   <td width="86" valign="top" style="width:86px;"><img src="https://mantisai.in/email/v1/04-cat.png" width="76" height="76" alt="" style="display:block;border:0;width:76px;height:76px;max-width:100%;"></td>
   <td valign="top" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;padding-top:2px;">
     <div class="dmc-111315" style="font-size:27px;font-weight:780;letter-spacing:2px;color:#111315;line-height:1.1;">{{lead_name_masked}}</div>
     <div class="dmc-666b6c" style="font-size:15px;color:#666b6c;padding-top:5px;">{{lead_category}}</div>
     <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding-top:8px;"><tr>
       <td valign="middle" style="padding-right:6px;"><img src="https://mantisai.in/email/v1/ico-pin.jpg" width="19" height="19" alt="" style="display:block;border:0;width:19px;height:19px;max-width:100%;"></td>
       <td class="dmc-4f5556" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#4f5556;">{{lead_location}}</td></tr></table>
   </td>
   <td width="96" align="center" valign="top" style="width:96px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
     <div class="dmc-111315" style="font-size:13px;color:#111315;padding-bottom:6px;">Heat Score</div>
     <img src="https://mantisai.in/email/v1/04-heat.png" width="86" height="86" alt="Heat 96" style="display:block;border:0;width:86px;height:86px;max-width:100%;margin:0 auto;">
   </td>
  </tr></table>
  <table class="dmk-e7e8e2" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-top:1px solid #e7e8e2;"><tr>
   <td class="dmc-111315" style="padding-top:15px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#111315;">
     <span class="dmc-628d06" style="color:#628d06;font-size:20px;font-weight:750;">{{lead_rating}} &#9733;</span>
     &nbsp; {{lead_reviews}} reviews &nbsp;&nbsp;
     <img src="https://mantisai.in/email/v1/04-ico-nosite.jpg" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;border:0;">
     &nbsp;No Website
   </td></tr></table>
  <table class="dmb-fbfcf8 dmk-e2e7d6" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;background:#fbfcf8;border:1px solid #e2e7d6;border-radius:13px;">
   <tr><td style="padding:4px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
     <tr><td width="50%" class="stack dmc-111315 dmk-e8eae4" valign="middle" style="width:50%;padding:11px 6px;border-bottom:1px solid #e8eae4;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111315;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:9px;"><img src="https://mantisai.in/email/v1/04-sig-1.jpg" width="24" height="24" alt="" style="display:block;border:0;width:24px;height:24px;max-width:100%;"></td><td valign="middle">High Intent</td></tr></table></td><td width="50%" class="stack dmc-111315 dmk-e8eae4" valign="middle" style="width:50%;padding:11px 6px;border-bottom:1px solid #e8eae4;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111315;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:9px;"><img src="https://mantisai.in/email/v1/04-sig-2.jpg" width="24" height="24" alt="" style="display:block;border:0;width:24px;height:24px;max-width:100%;"></td><td valign="middle">High Transactional Client</td></tr></table></td></tr>
     <tr><td width="50%" class="stack dmc-111315" valign="middle" style="width:50%;padding:11px 6px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111315;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:9px;"><img src="https://mantisai.in/email/v1/04-sig-3.jpg" width="24" height="24" alt="" style="display:block;border:0;width:24px;height:24px;max-width:100%;"></td><td valign="middle">Growing Search Demand</td></tr></table></td><td width="50%" class="stack dmc-111315" valign="middle" style="width:50%;padding:11px 6px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111315;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:9px;"><img src="https://mantisai.in/email/v1/04-sig-4.jpg" width="24" height="24" alt="" style="display:block;border:0;width:24px;height:24px;max-width:100%;"></td><td valign="middle">Decision-maker found</td></tr></table></td></tr>
    </table></td></tr></table>
 </td></tr></table>
 <div style="line-height:22px;font-size:22px;height:22px;">&nbsp;</div>

 <table class="dmk-95bd25" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #95bd25;border-radius:16px;">
 <tr><td align="center" style="padding:20px 26px 26px;">
   <img src="https://mantisai.in/email/v1/04-lock.png" width="56" height="56" alt="Locked" style="display:block;border:0;width:56px;height:56px;max-width:100%;margin:0 auto 14px;">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
     <tr><td class="dmk-e4e6df" style="padding:13px 4px;border-bottom:1px solid #e4e6df;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><img src="https://mantisai.in/email/v1/04-f-name.jpg" width="22" height="22" alt="" style="display:block;border:0;width:22px;height:22px;max-width:100%;"></td>
<td class="dmc-111315" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#111315;">Name protected</td></tr></table></td></tr>
     <tr><td class="dmk-e4e6df" style="padding:13px 4px;border-bottom:1px solid #e4e6df;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><img src="https://mantisai.in/email/v1/04-f-mail.jpg" width="22" height="22" alt="" style="display:block;border:0;width:22px;height:22px;max-width:100%;"></td>
<td class="dmc-111315" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#111315;">Email protected</td></tr></table></td></tr>
     <tr><td style="padding:13px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:14px;"><img src="https://mantisai.in/email/v1/04-f-phone.jpg" width="22" height="22" alt="" style="display:block;border:0;width:22px;height:22px;max-width:100%;"></td>
<td class="dmc-111315" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#111315;">Phone protected</td></tr></table></td></tr>
   </table>
   <div style="line-height:14px;font-size:14px;height:14px;">&nbsp;</div>
   <div class="dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111315;font-weight:400;margin:0 0 16px;text-align:center;">Unlock this lead to view the business<br>and verified contact details.</div>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{unlock_lead_url}}" style="height:56px;v-text-anchor:middle;width:460px;" arcsize="20%" stroke="f" fillcolor="#111315"><w:anchorlock/><center class="dmc-ffffff" style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">Unlock Lead</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- -->
<a class="dmc-ffffff dmb-111315" href="{{unlock_lead_url}}" style="background:#111315;border-radius:12px;color:#ffffff;display:block;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;line-height:1.2;text-align:center;padding:18px 26px;text-decoration:none;">Unlock Lead</a>
<!--<![endif]-->
</td></tr></table>
 </td></tr></table>
 <div style="line-height:16px;font-size:16px;height:16px;">&nbsp;</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
   <td valign="middle" style="padding-right:8px;"><img src="https://mantisai.in/email/v1/ico-verified.jpg" width="22" height="22" alt="" style="display:block;border:0;width:22px;height:22px;max-width:100%;"></td>
   <td class="dmc-697071" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#697071;">Live opportunity &nbsp;&middot;&nbsp; Signals verified today</td>
 </tr></table>
</td></tr><tr><td class="dmc-777c7d dmk-e5e6e1" style="padding:26px 30px 32px;border-top:1px solid #e5e6e1;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.8;color:#777c7d;">You&rsquo;re receiving this because you enabled lead alerts.<br><a class="dmc-64880d" href="{{manage_alerts_url}}" style="color:#64880d;text-decoration:underline;">Manage alerts</a> &nbsp;&middot;&nbsp; <a class="dmc-64880d" href="{{unsubscribe_url}}" style="color:#64880d;text-decoration:underline;">Unsubscribe</a><br>&copy; 2026 Mantis Ai</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
export const SINGLE_LEAD_TEXT = "Convert this lead before another agency does.\n\nPremium Cafe - Sector 56, Gurugram\nHeat Score 96 | 4.7* | 326 reviews | No Website\nSignals: High Intent, High Transactional Client, Growing Search Demand, Decision-maker found\n\nName, email and phone are protected until you unlock.\nUnlock: {{unlock_lead_url}}\n\nManage alerts: {{manage_alerts_url}} | Unsubscribe: {{unsubscribe_url}}";

/** 05-partnership-proposal
 *  Placeholders: {{partnership_url}}, {{unsubscribe_url}} */
export const PARTNERSHIP_HTML = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><!--dm-pinned-->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>Partner access &middot; Mantis Ai</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root{color-scheme:only light;supported-color-schemes:only light;}
  html,body{margin:0!important;padding:0!important;width:100%!important;background:#f7f7f3;}
  table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
  a{text-decoration:none;}
  @media only screen and (max-width:620px){
    .c{width:100%!important;}
    .p{padding-left:18px!important;padding-right:18px!important;}
    .stack{display:block!important;width:100%!important;max-width:100%!important;}
    .h1{font-size:32px!important;line-height:1.12!important;}
    .hide-sm{display:none!important;}
  }
</style>

<style>
  @media (prefers-color-scheme: dark) {
  html,body{background:#f7f7f3!important;}
  .dmb-111315{background-color:#111315!important}
  .dmb-b5e21d{background-color:#b5e21d!important}
  .dmb-f5f8e9{background-color:#f5f8e9!important}
  .dmb-f7f7f3{background-color:#f7f7f3!important}
  .dmb-f7faef{background-color:#f7faef!important}
  .dmb-ffffff{background-color:#ffffff!important}
  .dmc-111315{color:#111315!important}
  .dmc-565b5d{color:#565b5d!important}
  .dmc-5d8508{color:#5d8508!important}
  .dmc-606768{color:#606768!important}
  .dmc-60850b{color:#60850b!important}
  .dmc-687071{color:#687071!important}
  .dmc-697071{color:#697071!important}
  .dmc-6a930a{color:#6a930a!important}
  .dmc-707677{color:#707677!important}
  .dmc-737879{color:#737879!important}
  .dmc-b7e51d{color:#b7e51d!important}
  .dmc-f7f7f3{color:#f7f7f3!important}
  .dmc-ffffff{color:#ffffff!important}
  .dmk-9fc725{border-color:#9fc725!important}
  .dmk-b3cf68{border-color:#b3cf68!important}
  .dmk-dce8bb{border-color:#dce8bb!important}
  .dmk-dfe2d9{border-color:#dfe2d9!important}
  .dmk-dfe3d9{border-color:#dfe3d9!important}
  .dmk-e1e4dd{border-color:#e1e4dd!important}
  .dmk-e4e6df{border-color:#e4e6df!important}
  .dmk-e7e8e2{border-color:#e7e8e2!important}
  .dmk-edf0e8{border-color:#edf0e8!important}
  }
  [data-ogsc] .dmb-111315,[data-ogsb] .dmb-111315{background-color:#111315!important}
  [data-ogsc] .dmb-b5e21d,[data-ogsb] .dmb-b5e21d{background-color:#b5e21d!important}
  [data-ogsc] .dmb-f5f8e9,[data-ogsb] .dmb-f5f8e9{background-color:#f5f8e9!important}
  [data-ogsc] .dmb-f7f7f3,[data-ogsb] .dmb-f7f7f3{background-color:#f7f7f3!important}
  [data-ogsc] .dmb-f7faef,[data-ogsb] .dmb-f7faef{background-color:#f7faef!important}
  [data-ogsc] .dmb-ffffff,[data-ogsb] .dmb-ffffff{background-color:#ffffff!important}
  [data-ogsc] .dmc-111315,[data-ogsb] .dmc-111315{color:#111315!important}
  [data-ogsc] .dmc-565b5d,[data-ogsb] .dmc-565b5d{color:#565b5d!important}
  [data-ogsc] .dmc-5d8508,[data-ogsb] .dmc-5d8508{color:#5d8508!important}
  [data-ogsc] .dmc-606768,[data-ogsb] .dmc-606768{color:#606768!important}
  [data-ogsc] .dmc-60850b,[data-ogsb] .dmc-60850b{color:#60850b!important}
  [data-ogsc] .dmc-687071,[data-ogsb] .dmc-687071{color:#687071!important}
  [data-ogsc] .dmc-697071,[data-ogsb] .dmc-697071{color:#697071!important}
  [data-ogsc] .dmc-6a930a,[data-ogsb] .dmc-6a930a{color:#6a930a!important}
  [data-ogsc] .dmc-707677,[data-ogsb] .dmc-707677{color:#707677!important}
  [data-ogsc] .dmc-737879,[data-ogsb] .dmc-737879{color:#737879!important}
  [data-ogsc] .dmc-b7e51d,[data-ogsb] .dmc-b7e51d{color:#b7e51d!important}
  [data-ogsc] .dmc-f7f7f3,[data-ogsb] .dmc-f7f7f3{color:#f7f7f3!important}
  [data-ogsc] .dmc-ffffff,[data-ogsb] .dmc-ffffff{color:#ffffff!important}
  [data-ogsc] .dmk-9fc725,[data-ogsb] .dmk-9fc725{border-color:#9fc725!important}
  [data-ogsc] .dmk-b3cf68,[data-ogsb] .dmk-b3cf68{border-color:#b3cf68!important}
  [data-ogsc] .dmk-dce8bb,[data-ogsb] .dmk-dce8bb{border-color:#dce8bb!important}
  [data-ogsc] .dmk-dfe2d9,[data-ogsb] .dmk-dfe2d9{border-color:#dfe2d9!important}
  [data-ogsc] .dmk-dfe3d9,[data-ogsb] .dmk-dfe3d9{border-color:#dfe3d9!important}
  [data-ogsc] .dmk-e1e4dd,[data-ogsb] .dmk-e1e4dd{border-color:#e1e4dd!important}
  [data-ogsc] .dmk-e4e6df,[data-ogsb] .dmk-e4e6df{border-color:#e4e6df!important}
  [data-ogsc] .dmk-e7e8e2,[data-ogsb] .dmk-e7e8e2{border-color:#e7e8e2!important}
  [data-ogsc] .dmk-edf0e8,[data-ogsb] .dmk-edf0e8{border-color:#edf0e8!important}
  [data-ogsb] body,[data-ogsc] body{background:#f7f7f3!important;}
</style>
</head>
<body class="dmb-f7f7f3" style="margin:0;padding:0;background:#f7f7f3;">
<div class="dmc-f7f7f3" style="display:none;font-size:1px;color:#f7f7f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">You&rsquo;ve reached your plan limit &mdash; apply for the Mantis Partner Program.</div>
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table class="dmb-f7f7f3" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7f3" style="background:#f7f7f3;">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="c dmb-ffffff dmk-e7e8e2" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e7e8e2;border-radius:22px;overflow:hidden;">
<tr><td class="p" style="padding:34px 30px 20px;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
   <img src="https://mantisai.in/email/v1/logo.png" width="180" height="39" alt="Mantis" style="display:block;border:0;width:180px;height:39px;max-width:100%;margin:0 auto;"></td></tr></table>
 <div style="line-height:14px;font-size:14px;height:14px;">&nbsp;</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td class="dmc-60850b dmb-f7faef dmk-9fc725" style="background:#f7faef;border:1px solid #9fc725;border-radius:999px;padding:9px 19px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#60850b;white-space:nowrap;">Partner access</td></tr></table>
 <div style="line-height:16px;font-size:16px;height:16px;">&nbsp;</div>
 <div class="h1 dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:37px;line-height:1.1;letter-spacing:-1.1px;font-weight:800;color:#111315;margin:0 0 12px;text-align:center;">You&rsquo;ve used every credit<br>on your plan.</div>
 <div class="dmc-565b5d" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15.5px;line-height:1.5;color:#565b5d;font-weight:400;margin:0 0 20px;text-align:center;">That means you&rsquo;re working Mantis harder than the plan was built for.<br>Partner access raises the ceiling &mdash; higher lead limits, priority support,<br>and a direct line to the team that builds it.</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
   <td width="180" valign="middle" class="stack" style="width:180px;"><img src="https://mantisai.in/email/v1/05-mantis.jpg" width="170" height="216" alt="Mantis Ai mascot" style="display:block;border:0;width:170px;height:216px;max-width:100%;"></td>
   <td width="10" class="hide-sm" style="width:10px;">&nbsp;</td>
   <td valign="middle" class="stack"><table class="dmk-dfe2d9" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe2d9;border-radius:16px;">
<tr>
 <td width="175" valign="top" class="stack" style="width:175px;padding:14px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding-bottom:10px;"><tr>
    <td valign="middle" style="padding-right:6px;"><img src="https://mantisai.in/email/v1/ico-search.jpg" width="18" height="18" alt="" style="display:block;border:0;width:18px;height:18px;max-width:100%;"></td>
    <td class="dmc-111315" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:750;color:#111315;">Live Search</td></tr></table>
  <div class="dmc-111315 dmk-e1e4dd" style="border:1px solid #e1e4dd;border-radius:8px;padding:8px 9px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:10.5px;color:#111315;">&#9679; Gurugram, Haryana</div>
  <div class="dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:750;color:#111315;padding:13px 0 6px;">248 fresh leads &#8599;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
   <tr><td class="dmc-111315 dmk-edf0e8" style="padding:7px 2px;border-bottom:1px solid #edf0e8;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111315;">No Website<span class="dmc-5d8508" style="float:right;color:#5d8508;font-weight:700;">98</span></td></tr><tr><td class="dmc-111315 dmk-edf0e8" style="padding:7px 2px;border-bottom:1px solid #edf0e8;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111315;">High Intent<span class="dmc-5d8508" style="float:right;color:#5d8508;font-weight:700;">82</span></td></tr><tr><td class="dmc-111315" style="padding:7px 2px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111315;">Weak SEO<span class="dmc-5d8508" style="float:right;color:#5d8508;font-weight:700;">68</span></td></tr>
  </table>
  <div class="dmc-697071" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:9.5px;color:#697071;padding-top:11px;">Searching 50+ live sources</div>
  <div class="dmc-6a930a" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#6a930a;letter-spacing:4px;padding-top:6px;">&#9679;&#9679;&#9679;&#9679;&#9679;</div>
 </td>
 <td width="175" valign="top" class="stack" style="width:175px;"><img src="https://mantisai.in/email/v1/05-map.png" width="175" height="180" alt="Gurugram map" style="display:block;border:0;width:175px;height:180px;max-width:100%;"></td>
</tr></table></td>
 </tr></table>
 <div style="line-height:20px;font-size:20px;height:20px;">&nbsp;</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td width="50%" valign="top" class="stack" style="width:50%;padding:5px;">
<table class="dmk-dfe3d9" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe3d9;border-radius:13px;">
<tr><td align="center" style="padding:16px 12px 15px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-ben-1.png" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;max-width:100%;margin:0 auto 9px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;line-height:1.3;">Higher lead limits</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:7px;">Room to keep working past what your plan allows.</div>
</td></tr></table></td><td width="50%" valign="top" class="stack" style="width:50%;padding:5px;">
<table class="dmk-dfe3d9" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe3d9;border-radius:13px;">
<tr><td align="center" style="padding:16px 12px 15px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-ben-2.jpg" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;max-width:100%;margin:0 auto 9px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;line-height:1.3;">Fresh local opportunities</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:7px;">Discover businesses with live demand in your area.</div>
</td></tr></table></td></tr><tr><td width="50%" valign="top" class="stack" style="width:50%;padding:5px;">
<table class="dmk-dfe3d9" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe3d9;border-radius:13px;">
<tr><td align="center" style="padding:16px 12px 15px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-ben-3.jpg" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;max-width:100%;margin:0 auto 9px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;line-height:1.3;">Website gap signals</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:7px;">See who has no website, with ratings and review counts alongside.</div>
</td></tr></table></td><td width="50%" valign="top" class="stack" style="width:50%;padding:5px;">
<table class="dmk-dfe3d9" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe3d9;border-radius:13px;">
<tr><td align="center" style="padding:16px 12px 15px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-ben-4.jpg" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;max-width:100%;margin:0 auto 9px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;line-height:1.3;">Founder &amp; contact enrichment</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:7px;">Access verified contacts to reach real decision makers.</div>
</td></tr></table></td></tr></table>
 <div style="line-height:22px;font-size:22px;height:22px;">&nbsp;</div>
 <table class="dmk-b3cf68" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px dotted #b3cf68;"><tr><td style="font-size:0;line-height:0;height:14px;">&nbsp;</td></tr></table>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="33%" valign="top" class="stack" style="width:33%;padding:0 6px;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-n1.png" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;margin:0 auto 10px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;">Fill the short form</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:6px;">Tell us about your agency in under 2 minutes.</div></td><td width="33%" valign="top" class="stack" style="width:33%;padding:0 6px;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-n2.png" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;margin:0 auto 10px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;">Get partner access</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:6px;">We&rsquo;ll review and lift your limits.</div></td><td width="33%" valign="top" class="stack" style="width:33%;padding:0 6px;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;">
 <img src="https://mantisai.in/email/v1/05-n3.png" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;max-width:100%;margin:0 auto 10px;">
 <div class="dmc-111315" style="font-size:14px;font-weight:750;color:#111315;">Find and pitch clients</div>
 <div class="dmc-687071" style="font-size:11.5px;line-height:1.45;color:#687071;padding-top:6px;">Use insights to find, reach and win more local clients.</div></td></tr></table>
 <div style="line-height:22px;font-size:22px;height:22px;">&nbsp;</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{partnership_url}}" style="height:56px;v-text-anchor:middle;width:540px;" arcsize="20%" stroke="f" fillcolor="#111315"><w:anchorlock/><center class="dmc-ffffff" style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">Apply for Partner Access &rarr;</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- -->
<a class="dmc-ffffff dmb-111315" href="{{partnership_url}}" style="background:#111315;border-radius:12px;color:#ffffff;display:block;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;line-height:1.2;text-align:center;padding:18px 26px;text-decoration:none;">Apply for Partner Access <span class="dmc-b7e51d" style="color:#b7e51d;">&rarr;</span></a>
<!--<![endif]-->
</td></tr></table>
 <div class="dmc-707677" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.5;color:#707677;font-weight:400;margin:0 0 0px;text-align:center;">Takes less than 2 minutes.</div>
 <div style="line-height:14px;font-size:14px;height:14px;">&nbsp;</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td class="dmb-f5f8e9 dmk-dce8bb" align="center" style="background:#f5f8e9;border:1px solid #dce8bb;border-radius:10px;padding:12px;">
   <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td valign="middle" style="padding-right:8px;"><img src="https://mantisai.in/email/v1/ico-shield-sm2.jpg" width="20" height="20" alt="" style="display:block;border:0;width:20px;height:20px;max-width:100%;"></td>
    <td class="dmc-111315" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13.5px;color:#111315;">No payment required &nbsp;&middot;&nbsp; Partner access is subject to approval</td>
   </tr></table></td></tr></table>
 <table class="dmk-e4e6df" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid #e4e6df;"><tr>
  <td width="66" valign="top" class="stack" style="width:66px;padding-top:20px;"><img src="https://mantisai.in/email/v1/05-mark.png" width="50" height="50" alt="" style="display:block;border:0;width:50px;height:50px;max-width:100%;"></td>
  <td valign="top" class="stack dmc-111315" style="padding-top:20px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.55;color:#111315;">
    <strong style="font-size:14px;">Partnership proposal from Mantis Ai</strong><br>
    Questions? Reply directly to this email.<br>Reverblunt Pvt. Ltd. &middot; Gurugram, India</td>
  <td valign="top" align="right" class="stack dmc-737879" style="padding-top:20px;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:11.5px;line-height:1.8;color:#737879;text-align:right;">
    <a class="dmc-606768" href="{{unsubscribe_url}}" style="color:#606768;text-decoration:underline;">Unsubscribe from partnership emails</a><br>&copy; 2026 Mantis Ai</td>
 </tr></table>
</td></tr>
<tr><td class="dmb-b5e21d" bgcolor="#b5e21d" style="background:#b5e21d;height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
export const PARTNERSHIP_TEXT = "Let's help you find more local clients.\n\nMantis Ai is inviting selected web, tech and marketing agencies to access our lead intelligence portal for free.\n\n01 Fill the short form\n02 Get portal access\n03 Find and pitch clients\n\nApply: {{partnership_url}}\nNo payment required. Partner access is subject to approval.\n\nUnsubscribe: {{unsubscribe_url}}";
