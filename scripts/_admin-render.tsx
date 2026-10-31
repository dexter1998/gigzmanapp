import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "@/lib/db";
import { trackEvent } from "@/lib/events";
import Page from "@/app/(admin)/admin/activity/page";
import UserPage from "@/app/(admin)/admin/users/[email]/page";
(async () => {
  const email = "test@mantisai.in";
  for (const [ev, src] of [["nav.page.view", "client"], ["chat.button.run_this", "client"], ["chat.plan.run", "server"], ["leads.lead.unlock", "server"], ["integrations.email.connected", "server"], ["billing.pack.checkout_start", "server"]] as const)
    trackEvent(email, ev, { test: true }, { source: src, path: "/chat", sessionId: "sid-test", device: "desktop" });
  await new Promise((r) => setTimeout(r, 800));
  const [c] = await sql`SELECT count(*)::int n FROM product_events`;
  console.log("product_events rows:", c.n);
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ days: "30" }) }));
  console.log("activity page html:", html.length, "chars;", /Activation funnel/.test(html), /Ready to upsell/.test(html), /chat\.plan\.run/.test(html) ? "shows server event" : "no server event shown");
  const uhtml = renderToStaticMarkup(await UserPage({ params: Promise.resolve({ email }) }));
  console.log("user page html:", uhtml.length, "chars;", /Activity timeline/.test(uhtml), /chat\.plan\.run/.test(uhtml));
  process.exit(0);
})().catch((e) => { console.error("RENDER FAILED", e?.message?.slice(0, 400)); process.exit(1); });
