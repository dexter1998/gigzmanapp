import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readUnsubscribeToken } from "@/lib/unsubscribe-token";

// Unsubscribe endpoint for the List-Unsubscribe header on every bulk send.
//
// One URL has to serve two callers, which is why this is a route handler and not a page:
//   POST -- RFC 8058 one-click. Gmail/Yahoo's own "Unsubscribe" button POSTs here with no user
//           interaction and expects the opt-out to take effect immediately. Their bulk-sender
//           rules require this to work; a link that 404s reads as a spam signal.
//   GET  -- the link in the email body, opened by a person. This does NOT unsubscribe on its own:
//           mail clients and security scanners prefetch links, and a GET that mutated state would
//           silently opt people out who never clicked. It renders a confirm button that POSTs.
export const dynamic = "force-dynamic";

async function recordUnsubscribe(email: string, stream: string, source: string) {
  await sql`
    INSERT INTO email_unsubscribes (email, stream, source)
    VALUES (${email}, ${stream}, ${source})
    ON CONFLICT (email, stream) DO NOTHING
  `;
}

function page(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email preferences · Mantis</title>
<style>
  :root{color-scheme:only light}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#f7f7f3;font-family:Inter,Manrope,'Helvetica Neue',Arial,sans-serif;padding:24px}
  .card{background:#fff;border:1px solid #e7e8e2;border-radius:22px;padding:40px 36px;
        max-width:460px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04)}
  h1{font-size:24px;line-height:1.2;letter-spacing:-.6px;color:#111315;margin:0 0 12px}
  p{font-size:15px;line-height:1.6;color:#565b5d;margin:0 0 8px}
  .addr{font-weight:700;color:#111315;word-break:break-all}
  button{margin-top:24px;width:100%;border:0;border-radius:12px;background:#111315;color:#fff;
         font-size:16px;font-weight:700;padding:16px;cursor:pointer;font-family:inherit}
  button:disabled{opacity:.55;cursor:default}
  .muted{margin-top:20px;font-size:13px;color:#777c7d}
  a{color:#64880d}
</style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const payload = readUnsubscribeToken(token);
  if (!payload) {
    return page(
      `<h1>This link isn't valid</h1>
       <p>It may have been altered or truncated by your mail client. Forward the email to
       <a href="mailto:support@mantisai.in">support@mantisai.in</a> and we'll take you off the list.</p>`,
      400
    );
  }

  const [already] = await sql`
    SELECT 1 FROM email_unsubscribes
    WHERE email = ${payload.email} AND stream IN ('all', ${payload.stream})
    LIMIT 1
  `;
  if (already) {
    return page(
      `<h1>You're already unsubscribed</h1>
       <p class="addr">${escapeHtml(payload.email)}</p>
       <p>This address won't receive any more marketing email from Mantis.</p>`
    );
  }

  return page(
    `<h1>Unsubscribe from Mantis emails?</h1>
     <p class="addr">${escapeHtml(payload.email)}</p>
     <p>You'll stop receiving lead alerts, offers and product updates. Sign-in codes and other
     account emails will still reach you.</p>
     <button id="go" type="button">Unsubscribe</button>
     <p class="muted" id="msg"></p>
     <script>
       document.getElementById('go').addEventListener('click', async function () {
         var b = this, m = document.getElementById('msg');
         b.disabled = true; b.textContent = 'Unsubscribing…';
         try {
           var r = await fetch(location.pathname, { method: 'POST' });
           if (!r.ok) throw new Error();
           b.textContent = 'Unsubscribed';
           m.textContent = 'You can close this tab.';
         } catch (e) {
           b.disabled = false; b.textContent = 'Unsubscribe';
           m.textContent = 'Something went wrong — please try again.';
         }
       });
     </script>`
  );
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const payload = readUnsubscribeToken(token);
  if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 400 });

  await recordUnsubscribe(payload.email, payload.stream, "one-click");
  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
