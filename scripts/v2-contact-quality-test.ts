/**
 * Email tiers and phone kinds (lib/v2/contact-quality.ts) — pure, no database.
 *
 *   npx tsx scripts/v2-contact-quality-test.ts
 */
import { tierEmail, tierEmails, classifyPhone, classifyPhones, whatsappOf, bestPhone } from "../lib/v2/contact-quality";

let pass = 0;
const failures: string[] = [];
function eq<T>(name: string, got: T, want: T) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else failures.push(`${name} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
const t = (e: string, ctx = {}) => { const g = tierEmail(e, ctx); return `${g.tier}:${g.kind}`; };

// ---- emails: tier 1 (people)
eq("first name", t("rahul@acme.in"), "1:person");
eq("first.last", t("rahul.sharma@acme.in"), "1:person");
eq("first_last", t("lavina_cardin@amsshardul.com"), "1:person");
eq("initial+surname", t("a.kumar@acme.in"), "1:person");
eq("doctor", t("dr.mistry.clinic@gmail.com", { businessName: "Mistry Dental" }), "1:person");
eq("named founder", t("sk@acme.in", { personName: "Sanjay Kapoor" }), "2:role");
eq("named founder in address", t("sanjay.k@acme.in", { personName: "Sanjay Kapoor" }), "1:person");
eq("person + role word", t("rahul.hr@acme.in", { personName: "Rahul Verma" }), "1:person");
// ---- tier 2 (decision inboxes)
eq("sales", t("sales@acme.in"), "2:role");
eq("business", t("business@acme.in"), "2:role");
eq("owner", t("owner@acme.in"), "2:role");
eq("director", t("director@acme.in"), "2:role");
eq("sales2", t("sales2@acme.in"), "2:role");
eq("info small", t("info@acme.in"), "2:role");
eq("hello small", t("hello@acme.in"), "2:role");
eq("business gmail", t("unitownrealty@gmail.com", { businessName: "Unitown Realty", personName: "Unitown Realty", domain: "unitown.in" }), "2:role");
eq("code inbox", t("ban.tch@chanceryhotels.com"), "2:role");
// ---- tier 3 (generic)
for (const g of ["support", "care", "help", "noreply", "no-reply", "careers", "hr", "jobs", "accounts", "billing", "admin", "webmaster", "reservations", "customercare", "support.team", "hr-india"])
  eq(`generic ${g}`, t(`${g}@acme.in`), "3:generic");
eq("info large org", t("info@bigchain.com", { large: true }), "3:generic");
eq("reservations.tch", t("reservations.tch@chanceryhotels.com"), "3:generic");

// ---- list grading
const list = tierEmails(["info@unitown.in", "unitownrealty@gmail.com", "INFO@unitown.in", "support@unitown.in", "rahul@unitown.in"], { businessName: "Unitown Realty", domain: "unitown.in" });
eq("list order", list.map((x) => `${x.email}:${x.tier}`), ["rahul@unitown.in:1", "unitownrealty@gmail.com:2", "info@unitown.in:3", "support@unitown.in:3"]);
eq("contact only one stays 2", tierEmails(["contact@acme.in"]).map((x) => x.tier), [2]);
eq("contact next to support stays 2", tierEmails(["support@acme.in", "contact@acme.in"]).map((x) => `${x.email}:${x.tier}`), ["contact@acme.in:2", "support@acme.in:3"]);
eq("junk dropped", tierEmails(["not-an-email", "", null, "a@b"]).length, 0);

// ---- phones (India)
const k = (raw: string) => { const p = classifyPhone(raw); return p ? `${p.kind}|${p.e164}|${p.number}` : null; };
eq("mobile +91", k("+919999592083"), "mobile|+919999592083|+91 99995 92083");
eq("mobile bare", k("9717705808"), "mobile|+919717705808|+91 97177 05808");
eq("mobile 0-prefixed", k("09876543210"), "mobile|+919876543210|+91 98765 43210");
eq("mobile spaced", k("+91 98765-43210"), "mobile|+919876543210|+91 98765 43210");
eq("gurgaon landline", k("01247178135"), "landline|+911247178135|0124 7178135");
eq("vadodara landline", k("02652363366"), "landline|+912652363366|0265 2363366");
eq("delhi landline", k("011 2345 6789"), "landline|+911123456789|011 2345 6789");
eq("bangalore spaced", k("080 4141 4141"), "landline|+918041414141|080 4141 4141");
eq("bangalore +91", k("+918066749999"), "landline|+918066749999|080 6674 9999");
eq("ahmedabad", k("079 2656 1234"), "landline|+917926561234|079 2656 1234");
eq("tollfree 1800", k("1800 123 4567"), "tollfree|null|1800 123 4567");
eq("tollfree 1860", k("1860-500-1234"), "tollfree|null|1860 500 1234");
eq("tollfree +91", k("+91 1800 208 1234"), "tollfree|null|1800 208 1234");
eq("malformed", k("+9112466879761"), "unknown|null|+9112466879761");
eq("foreign", k("+44 20 7946 0958"), "unknown|+442079460958|+44 20 7946 0958");
eq("us tollfree", k("+1 800 555 0199"), "tollfree|+18005550199|+1 800 555 0199");
eq("empty", classifyPhone(""), null);

const ph = classifyPhones(["01247178135", "+91 96540 00098", "9654000098", "1800 123 4567"]);
eq("mobile first + dedupe", ph.map((p) => p.kind), ["mobile", "landline", "tollfree"]);
eq("whatsapp = mobile", whatsappOf(ph), "+919654000098");
eq("no whatsapp for landline only", whatsappOf(classifyPhones(["02652363366"])), null);
eq("best phone prefers mobile", bestPhone(["01247178135", "9654000098"]), "9654000098");
eq("best phone falls back", bestPhone(["02652363366"]), "02652363366");

console.log(`${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log("  FAIL", f);
process.exit(failures.length ? 1 : 0);
