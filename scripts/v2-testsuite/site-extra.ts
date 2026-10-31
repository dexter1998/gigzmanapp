/**
 * site-extra checks. The repo has no test runner, so this is a runnable script:
 *   1. offline fixtures for each extractor (asserts — exits 1 on a failure),
 *   2. live: readSiteExtra on real sites, printed as a compact table.
 * usage: npx tsx scripts/v2-testsuite/site-extra.ts [--offline] [url ...]
 */
import { fetchPage } from "@/lib/v2/net";
import {
  readSiteExtra, readForms, bookingCapable, findSecrets, missingSecurityHeaders, cmsVersion, pageDates,
  seoBasics, comingSoon, certifications, exporterEvidence, shopApps, extractOfferings, offerMatch, registrableDomain,
} from "@/lib/v2/signals/site-extra";

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}

function offline() {
  const u = "https://acme.in/contact";
  const form = (attrs: string, inner = '<input name="name"><input name="phone"><textarea name="message"></textarea>') => `<form ${attrs}>${inner}<button>Send</button></form>`;
  check("cf7", readForms(form('action="/contact/#wpcf7-f1" class="wpcf7-form"'), u)[0].backend, "service");
  check("mailto", readForms(form('action="mailto:a@b.in"'), u)[0].backend, "mailto");
  check("none", readForms(form('action="#"'), u)[0].backend, "none");
  check("none in next app = unknown", readForms(`<div id="__next">${form('action=""')}</div>`, u)[0].backend, "unknown");
  check("own", readForms(form('action="/send.php" method="post"'), u)[0].backend, "own");
  check("formspree", readForms(form('action="https://formspree.io/f/abc"'), u)[0].backend, "service");
  check("search form", readForms('<form action="/"><input name="s"></form>', u)[0].kind, "search");
  check("newsletter", readForms('<form action="/sub"><input type="email" name="email"></form>', u)[0].kind, "newsletter");
  check("booking by date", readForms(form('action="/book"', '<input name="name"><input type="date" name="d">'), u)[0].kind, "booking");
  check("dob is not booking", readForms(form('action="/x"', '<input name="name"><input type="date" name="dob"><textarea></textarea>'), u)[0].kind, "enquiry");
  check("hubspot embed", readForms('<script src="//js.hsforms.net/forms/v2.js"></script>', u)[0]?.backend, "service");
  check("bookingCapable widget", bookingCapable('<a href="https://calendly.com/acme/30min">Book</a>'), true);
  check("bookingCapable own form", bookingCapable(form('action="/appt.php"', '<input name="name"><select name="preferred_time"></select>')), true);
  check("bookingCapable plain enquiry", bookingCapable(form('action="/x.php"')), false);

  // Secrets — note the fixtures are fake values built at runtime.
  const ak = "AKIA" + "Q3EGTWZ7MNP4K2LA";
  check("aws", findSecrets(`var k="${ak}"`, "x").map((s) => s.masked), ["AKIA…"]);
  check("aws example", findSecrets('AKIAIOSFODNN7EXAMPLE', "x").length, 0);
  check("stripe", findSecrets(`"sk_live_${"a1B2c3D4e5F6g7H8i9J0k1L2"}"`, "x")[0]?.type, "stripe_secret_key");
  check("password label", findSecrets('{password:"Password",confirm:"Confirm password"}', "x").length, 0);
  check("password literal", findSecrets('const cfg={adminPassword:"Adm1n@2024"}', "x")[0]?.type, "hardcoded_password");
  check("autocomplete", findSecrets('autocomplete:"current-password"', "x").length, 0);
  check("url creds", findSecrets('mongodb+srv://app:Pa55word9@cluster0.x.mongodb.net', "x")[0]?.type, "credentials_in_url");
  check("firebase not flagged", findSecrets('apiKey:"AIzaSyD-abcdefghijklmnopqrstuvwxyz12345"', "x").length, 0);
  check("razorpay needs key id", findSecrets('key_secret:"abcdEFGH1234ijklMNOP5678"', "x").length, 0);
  check("razorpay", findSecrets('key_id:"rzp_live_abcdEFGH1234ij",key_secret:"abcdEFGH1234ijklMNOP5678"', "x")[0]?.type, "razorpay_key_secret");
  check("value never returned", JSON.stringify(findSecrets(`"${ak}"`, "x")).includes(ak.slice(4)), false);

  check("headers", missingSecurityHeaders({ "Strict-Transport-Security": "max-age=1", "content-security-policy": "frame-ancestors 'self'" }), ["X-Content-Type-Options"]);
  check("wp5", cmsVersion('<meta name="generator" content="WordPress 5.8.3" />'), { cms: "wordpress", version: "5.8.3", outdated: true });
  check("wp6", cmsVersion('<meta name="generator" content="WordPress 6.4" />')?.outdated, false);
  check("joomla3", cmsVersion('<meta name="generator" content="Joomla! - Open Source Content Management" /><meta name="generator" content="Joomla! 3.9" />')?.outdated, true);
  check("dates", pageDates('<time datetime="2024-02-03T10:00:00Z">x</time><p>March 5, 2023</p>').map((d) => d.toISOString().slice(0, 10)).sort(), ["2023-03-05", "2024-02-03"]);
  check("seo", seoBasics("<html><head><title>X</title></head><body><p>hi</p></body></html>").missing, ["meta_description", "h1", "schema_jsonld"]);
  check("coming soon title", comingSoon("<title>Coming Soon | Acme</title>")?.where, "title");
  check("saas teaser not coming soon", comingSoon(`<title>Acme</title><h1>Acme CRM</h1><p>${"word ".repeat(400)} AI reports coming soon</p>`), null);
  check("certs", certifications("We are an ISO 9001:2015 certified, FSSAI Lic. No. 12345678901234 and HACCP company").names, ["ISO 9001", "FSSAI", "HACCP"]);
  check("export to excel", exporterEvidence("<p>Export to Excel, PDF or Tally in one click.</p>"), null);
  check("exporter", exporterEvidence("<p>Leading manufacturer and exporter of spices</p>"), "manufacturer and exporter");
  check("shop apps", shopApps('<script src="https://static.klaviyo.com/x.js"></script><div class="jdgm-widget" data-judgeme></div>').apps, ["klaviyo", "judge_me"]);
  check("offerings", extractOfferings("<main><h2>Our Services</h2><h3>Root Canal Treatment</h3><h3>Dental Implants</h3><h3>Teeth Whitening</h3><h3>Why choose us?</h3></main>"), ["Root Canal Treatment", "Dental Implants", "Teeth Whitening"]);
  check("offerMatch", offerMatch(["Dental Implants", "Teeth Whitening"], ["implant", "braces"]), { score: 0.5, matched: ["Dental Implants"] });
  check("domain", [registrableDomain("www.shop.acme.co.in"), registrableDomain("app.acme.com")], ["acme.co.in", "acme.com"]);
  console.log(failed ? `${failed} offline check(s) failed` : "offline: all checks passed");
}

const SITES = [
  "https://www.hostbooks.com/", "https://chakr.in/", "https://kaltrefrigeration.com/", "https://www.datakatalyst.com/",
  "https://www.clovedental.in/", "https://www.sabkadentist.com/", "https://www.snitch.co.in/", "https://mokobara.com/",
];

async function live(urls: string[]) {
  const rows: string[] = [];
  for (const url of urls) {
    const t0 = Date.now();
    const home = await fetchPage(url, 10000);
    if (!home?.html) { rows.push(`${url}  (home did not load)`); continue; }
    const r = await readSiteExtra({ homeUrl: home.url, homeHtml: home.html });
    const on = Object.entries(r.signals).filter(([, v]) => v).map(([k]) => k);
    const f = r.facts;
    console.log(`\n== ${home.url}  (${Date.now() - t0}ms)`);
    console.log(`  signals ON : ${on.join(", ") || "-"}`);
    console.log(`  signals off: ${Object.entries(r.signals).filter(([, v]) => !v).map(([k]) => k).join(", ")}`);
    console.log(`  form=${f.form_backend ?? "-"} cms=${f.cms ?? "-"} ssl_days=${f.ssl_days_left ?? "-"} mx=${f.mx_provider ?? "-"} hdr_missing=${JSON.stringify(f.missing_security_headers ?? null)} seo_missing=${JSON.stringify(f.seo_missing ?? null)}`);
    console.log(`  blog=${f.blog_url ?? "-"} last=${f.blog_last_post ?? "-"} certs=${JSON.stringify(f.certifications ?? [])} shop_apps=${JSON.stringify(f.shop_apps ?? null)}`);
    console.log(`  offerings(${f.offerings_url ?? "-"}): ${JSON.stringify(f.offerings ?? [])}`);
    console.log(`  secrets: ${JSON.stringify(f.exposed_secrets ?? [])} bundles=${f.scanned_bundles}`);
    console.log(`  notes: ${JSON.stringify(r.notes)}`);
    rows.push([home.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 26).padEnd(26), String(f.form_backend ?? "-").padEnd(8), String(r.signals.booking_capable ?? "-").padEnd(6),
      String(f.ssl_days_left ?? "-").padEnd(5), String(f.mx_provider ?? "-").padEnd(10), String(r.signals.no_dmarc ?? "-").padEnd(6),
      String((f.missing_security_headers as string[] | undefined)?.length ?? "-").padEnd(4), String(f.blog_days_since_post ?? (r.signals.no_blog ? "none" : "?")).padEnd(6),
      String(r.signals.exposed_secret).padEnd(6), String((f.offerings as string[] | undefined)?.length ?? 0)].join(" "));
  }
  console.log("\nsite                       form     book   ssl   mx         nodmrc hdr- blogd  secret offers");
  rows.forEach((r) => console.log(r));
}

(async () => {
  offline();
  const args = process.argv.slice(2);
  if (!args.includes("--offline")) await live(args.filter((a) => !a.startsWith("--")).length ? args.filter((a) => !a.startsWith("--")) : SITES);
  process.exit(failed ? 1 : 0);
})();
