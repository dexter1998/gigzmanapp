// GENERATED from mantis-email-templates/build/01-otp-verification.html — do not hand-edit.
// Rebuild there (build01.py -> darkmode.py) and regenerate rather than patching this copy.
//
// Images are absolute https URLs served from /email/v1 in this app's own public directory, not CID
// attachments: Gmail listed CID parts as attachments and skipped them on mobile, and dropping them
// took the message from 240KB to under 12KB. Colours are pinned against forced dark mode.
//
// Placeholders: {{otp_code}}, {{verification_url}}, {{privacy_url}}
export const OTP_EMAIL_HTML = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><!--dm-pinned-->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
<title>Verify your email &middot; Mantis AI</title>
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
  .dmb-ffffff{background-color:#ffffff!important}
  .dmc-111315{color:#111315!important}
  .dmc-232628{color:#232628!important}
  .dmc-565b5d{color:#565b5d!important}
  .dmc-64880d{color:#64880d!important}
  .dmc-777c7d{color:#777c7d!important}
  .dmc-79a900{color:#79a900!important}
  .dmc-f7f7f3{color:#f7f7f3!important}
  .dmc-ffffff{color:#ffffff!important}
  .dmk-91bc1b{border-color:#91bc1b!important}
  .dmk-e5e6e1{border-color:#e5e6e1!important}
  .dmk-e7e8e2{border-color:#e7e8e2!important}
  }
  [data-ogsc] .dmb-111315,[data-ogsb] .dmb-111315{background-color:#111315!important}
  [data-ogsc] .dmb-f7f7f3,[data-ogsb] .dmb-f7f7f3{background-color:#f7f7f3!important}
  [data-ogsc] .dmb-ffffff,[data-ogsb] .dmb-ffffff{background-color:#ffffff!important}
  [data-ogsc] .dmc-111315,[data-ogsb] .dmc-111315{color:#111315!important}
  [data-ogsc] .dmc-232628,[data-ogsb] .dmc-232628{color:#232628!important}
  [data-ogsc] .dmc-565b5d,[data-ogsb] .dmc-565b5d{color:#565b5d!important}
  [data-ogsc] .dmc-64880d,[data-ogsb] .dmc-64880d{color:#64880d!important}
  [data-ogsc] .dmc-777c7d,[data-ogsb] .dmc-777c7d{color:#777c7d!important}
  [data-ogsc] .dmc-79a900,[data-ogsb] .dmc-79a900{color:#79a900!important}
  [data-ogsc] .dmc-f7f7f3,[data-ogsb] .dmc-f7f7f3{color:#f7f7f3!important}
  [data-ogsc] .dmc-ffffff,[data-ogsb] .dmc-ffffff{color:#ffffff!important}
  [data-ogsc] .dmk-91bc1b,[data-ogsb] .dmk-91bc1b{border-color:#91bc1b!important}
  [data-ogsc] .dmk-e5e6e1,[data-ogsb] .dmk-e5e6e1{border-color:#e5e6e1!important}
  [data-ogsc] .dmk-e7e8e2,[data-ogsb] .dmk-e7e8e2{border-color:#e7e8e2!important}
  [data-ogsb] body,[data-ogsc] body{background:#f7f7f3!important;}
</style>
</head>
<body class="dmb-f7f7f3" style="margin:0;padding:0;background:#f7f7f3;">
<div class="dmc-f7f7f3" style="display:none;font-size:1px;color:#f7f7f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your Mantis verification code is {{otp_code}} and expires in 10 minutes.</div>
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table class="dmb-f7f7f3" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7f3" style="background:#f7f7f3;">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="c dmb-ffffff dmk-e7e8e2" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e7e8e2;border-radius:22px;overflow:hidden;">
<tr><td class="p" style="padding:38px 36px 30px;">
  <img src="https://mantisai.in/email/v1/logo.png" width="170" height="37" alt="Mantis" style="display:block;border:0;width:170px;height:37px;max-width:100%;">
  <div style="line-height:18px;font-size:18px;height:18px;">&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <img src="https://mantisai.in/email/v1/01-badge.png" width="282" height="252" alt="" style="display:block;border:0;width:282px;height:252px;max-width:100%;margin:0 auto;">
  </td></tr></table>
  <div style="line-height:4px;font-size:4px;height:4px;">&nbsp;</div>
  <div class="h1 dmc-111315" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:44px;line-height:1.1;letter-spacing:-1.1px;font-weight:800;color:#111315;margin:0 0 12px;text-align:center;">Verify your email</div>
  <div class="dmc-565b5d" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.5;color:#565b5d;font-weight:400;margin:0 0 26px;text-align:center;">Use this one-time code to finish signing in to Mantis.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="dmc-79a900 dmb-ffffff dmk-91bc1b" align="center" style="border:2px solid #91bc1b;border-radius:14px;background:#ffffff;padding:22px 16px;
        font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:46px;line-height:1;font-weight:800;letter-spacing:9px;color:#79a900;
        text-align:center;mso-line-height-rule:exactly;">{{otp_code}}</td>
  </tr></table>
  <div style="line-height:18px;font-size:18px;height:18px;">&nbsp;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td valign="middle" style="padding-right:9px;"><img src="https://mantisai.in/email/v1/ico-clock.jpg" width="25" height="25" alt="" style="display:block;border:0;width:25px;height:25px;max-width:100%;"></td>
    <td class="dmc-565b5d" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#565b5d;">This code expires in 10 minutes.</td>
  </tr></table>
  <div style="line-height:24px;font-size:24px;height:24px;">&nbsp;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{verification_url}}" style="height:56px;v-text-anchor:middle;width:528px;" arcsize="20%" stroke="f" fillcolor="#111315"><w:anchorlock/><center class="dmc-ffffff" style="color:#ffffff;font-family:Arial,sans-serif;font-size:19px;font-weight:bold;">Verify Email</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- -->
<a class="dmc-ffffff dmb-111315" href="{{verification_url}}" style="background:#111315;border-radius:12px;color:#ffffff;display:block;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:19px;font-weight:700;line-height:1.2;text-align:center;padding:18px 26px;text-decoration:none;">Verify Email</a>
<!--<![endif]-->
</td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 14px;"><tr><td class="dmk-e5e6e1" style="border-top:1px solid #e5e6e1;font-size:0;line-height:0;">&nbsp;</td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;"><tr>
<td width="48" valign="middle" style="width:48px;padding:10px 0;"><img src="https://mantisai.in/email/v1/01-ico-mail.png" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;max-width:100%;"></td>
<td width="14" style="width:14px;">&nbsp;</td>
<td class="dmc-232628" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.45;color:#232628;">Didn&rsquo;t request this? You can safely ignore this email.</td>
</tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;"><tr>
<td width="48" valign="middle" style="width:48px;padding:10px 0;"><img src="https://mantisai.in/email/v1/01-ico-shield.jpg" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;max-width:100%;"></td>
<td width="14" style="width:14px;">&nbsp;</td>
<td class="dmc-232628" valign="middle" style="font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.45;color:#232628;">Never share your verification code with anyone.</td>
</tr></table>
</td></tr><tr><td class="dmc-777c7d dmk-e5e6e1" style="padding:26px 30px 32px;border-top:1px solid #e5e6e1;text-align:center;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.8;color:#777c7d;">&copy; 2026 Mantis AI<br><a class="dmc-64880d" href="mailto:support@mantisai.in" style="color:#64880d;text-decoration:underline;">Support</a> &nbsp;&middot;&nbsp; <a class="dmc-64880d" href="{{privacy_url}}" style="color:#64880d;text-decoration:underline;">Privacy</a></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
