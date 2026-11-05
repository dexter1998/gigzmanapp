import { COMPANY } from "@/lib/company";
import type { MailStream } from "@/lib/email/streams";
import {
  bars, button, checklist, chip, esc, eyebrow, founderNote, grid, h1, h2, hero, label, leadCard, p, panel,
  progress, quote, scale, section, shell, small, stats, steps, textBody, textLink, INK, LIME, MUTED, SANS, MONO,
} from "@/lib/email/ui";

/**
 * Every Mantis account email other than sign-in codes and the lead alert, in one catalogue, each
 * with the job it does. lib/user-mail.ts decides who is due which; scripts/send-mail-tests.ts sends
 * every entry with its `sample` data so the whole set can be read in a real inbox.
 *
 * `via` picks the sending domain (lib/email/streams.ts) and `stream` the unsubscribe bucket: turning
 * off "community" mail must not stop a plan-expiry notice, and turning off offers must not stop the
 * weekly scorecard.
 *
 * Layout: every mail opens with the ink header band and an ink hero that states its one point,
 * usually as a number, then a visual of it (lib/email/ui.ts), one lime button, and the footer.
 * Copy rules: one job per mail, no invented offers. Anything a mail promises that the product may
 * not have yet (a referral reward, a community link, a booking link) comes in as data, and
 * lib/user-mail.ts sends that mail only when the value is configured.
 */

const S = COMPANY.site;

type Rendered = { subject: string; html: string; text: string };
type Entry<D> = {
  via: MailStream;
  stream: "lifecycle" | "customer_offer" | "community" | "lead_alerts";
  /** What the mail is for, in one line. Shown in the test sends' index and in docs. */
  intent: string;
  render: (d: D) => Rendered;
  sample: D;
};

const FROM_USER = "hello@mantisuser.live";
const FROM_LEADS = "alerts@mantisleads.live";

function mail(o: {
  kind: string; subject: string; preheader: string; rows: string[]; text: Array<string | null | false | undefined>;
  why: string; from?: string; unsubscribe?: boolean;
}): Rendered {
  return {
    subject: o.subject,
    html: shell({ title: o.subject, kind: o.kind, preheader: o.preheader, rows: o.rows.join(""), why: o.why, from: o.from ?? FROM_USER, unsubscribe: o.unsubscribe }),
    text: textBody(o.text, { unsubscribe: o.unsubscribe }),
  };
}

const hi = (name: string | null, onDark = true) => p(`Hi ${esc(name || "there")},`, { onDark, size: 15 });
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const n = (x: number) => x.toLocaleString("en-IN");
/** The last section closes the rounded card. */
const last = (inner: string, tint = false) => section(inner, { last: true, tint });

type Lead = { name: string; category: string; area: string; why: string };

const PACKS = [
  { name: "Starter", credits: 2000, price: 1999, tag: "" },
  { name: "Growth", credits: 4000, price: 3499, tag: "Most popular" },
  { name: "Scale", credits: 10000, price: 7499, tag: "Best value" },
];

function packCards(src: string) {
  return grid(PACKS.map((k) => {
    const dark = k.tag === "Most popular";
    return {
      bg: dark ? INK : "#f6f6f2",
      html: `<a href="${S}/settings/billing?pack=${k.name.toLowerCase()}&src=${src}" style="display:block;text-decoration:none">
        <div style="font:700 10.5px/1 ${MONO};letter-spacing:1px;text-transform:uppercase;color:${dark ? LIME : MUTED}">${k.tag || "Pack"}</div>
        <div style="margin-top:10px;font:800 16px/1.2 ${SANS};color:${dark ? "#fff" : INK}">${k.name}</div>
        <div style="margin-top:6px;font:800 23px/1 ${SANS};letter-spacing:-0.5px;color:${dark ? "#fff" : INK}">${inr(k.price)}</div>
        <div style="margin-top:8px;font:12.5px/1.4 ${SANS};color:${dark ? "#c9cdc4" : MUTED}">${n(k.credits)} credits<br>~${n(Math.floor(k.credits / 5))} unlocks</div></a>`,
    };
  }));
}

export const CATALOG = {
  /* ------------------------------------------------------------------ upsell / product */

  usage_meter: {
    via: "user", stream: "lifecycle",
    intent: "At 50/80/100% of credits used: show what the credits bought, then the pack that buys the rest.",
    sample: { firstName: "Tarun", pct: 80, used: 400, credits: 100, leadsFound: 61, unlocked: 18, replies: 2 },
    render: (d: { firstName: string | null; pct: number; used: number; credits: number; leadsFound: number; unlocked: number; replies: number }) => {
      const more = Math.max(1, Math.round(d.leadsFound * d.credits / Math.max(d.used, 1)));
      return mail({
        kind: "Credits",
        subject: d.pct >= 100 ? "You've used all your Mantis credits" : `You've used ${d.pct}% of your credits`,
        preheader: `${n(d.used)} credits → ${d.leadsFound} leads, ${d.unlocked} unlocked, ${d.replies} replies.`,
        rows: [
          hero(hi(d.firstName) + eyebrow(`${d.pct}% used`, true) +
            h1(d.pct >= 100 ? "Your credits are used up." : `${n(d.credits)} credits left.<br><span style="color:${LIME}">About ${more} more leads.</span>`, true) +
            progress(d.pct, true) +
            `<div style="font:700 11px/1 ${MONO};color:#9aa0a3;letter-spacing:0.8px">${n(d.used)} USED · ${n(d.credits)} LEFT</div>`),
          section(label(`What ${n(d.used)} credits got you`) + stats([
            { value: String(d.leadsFound), label: "Leads found" },
            { value: String(d.unlocked), label: "Unlocked" },
            { value: String(d.replies), label: "Replies", hi: true },
          ])),
          last(h2(d.pct >= 100 ? "Pick a pack to keep going" : "Top up before you run out") + packCards(`usage_${d.pct}`) +
            small("Credits never expire. A pack also switches on campaigns for 30 days.")),
        ],
        text: [`Hi ${d.firstName || "there"},`, ``, `${d.pct}% of your credits are used (${d.credits} left).`, `Leads found: ${d.leadsFound} · Unlocked: ${d.unlocked} · Replies: ${d.replies}`, ``, ...PACKS.map((k) => `${k.name}: ${inr(k.price)} for ${n(k.credits)} credits`), `${S}/settings/billing`],
        why: "You get this because your Mantis credit balance changed.",
      });
    },
  },

  unlocked_no_campaign: {
    via: "user", stream: "lifecycle",
    intent: "Unlocked leads but never contacted them: push the outreach feature (the plan's real value).",
    sample: { firstName: "Tarun", unlocked: 12, listName: "Dentists in Gurugram with no website" },
    render: (d: { firstName: string | null; unlocked: number; listName: string }) => mail({
      kind: "Next step",
      subject: `${d.unlocked} leads are waiting for a first message`,
      preheader: "Mantis can write and send the first email for you, after you approve it.",
      rows: [
        hero(hi(d.firstName) + eyebrow("Not contacted yet", true) +
          h1(`<span style="color:${LIME}">${d.unlocked} leads</span> haven't heard from you.`, true) +
          p(`You unlocked them from “${esc(d.listName)}”. A short first email is what turns them into calls.`, { onDark: true })),
        section(label("How a Mantis campaign works") + steps([
          ["Mantis writes the first email", "One per lead, from what it found about that business."],
          ["You read and approve", "Nothing goes out until you say so."],
          ["Replies land in your inbox", "Follow-ups stop by themselves when someone replies."],
        ])),
        last(button("Start a campaign", `${S}/campaigns?src=unlocked_no_campaign`) + small("Sends from your own mailbox, so replies come straight to you.")),
      ],
      text: [`Hi ${d.firstName || "there"},`, ``, `Your ${d.unlocked} unlocked leads from "${d.listName}" haven't been contacted yet.`, `1. Mantis writes the first email  2. You approve  3. Replies land in your inbox`, `Start a campaign: ${S}/campaigns`],
      why: "You get this because you unlocked leads on Mantis.",
    }),
  },

  first_reply: {
    via: "user", stream: "lifecycle",
    intent: "The first reply to a campaign: the moment the product proved itself, and the best moment to suggest more.",
    sample: { firstName: "Tarun", replier: "Dr. Ravi Sharma", company: "Sharma Dental", snippet: "Hi, yes we have been thinking about a website. Can you share some samples and a rough cost?" },
    render: (d: { firstName: string | null; replier: string; company: string; snippet: string }) => {
      const initials = d.replier.replace(/^(dr|mr|ms|mrs)\.?\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      return mail({
        kind: "Reply",
        subject: `🎉 ${d.replier} from ${d.company} replied`,
        preheader: d.snippet.slice(0, 90),
        rows: [
          hero(eyebrow("Your first reply", false) + h1(`🎉 ${esc(d.replier)} replied.`) +
            p(`${esc(d.company)} answered your campaign. This is the moment Mantis is for.`), "lime"),
          section(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
              <td width="52" valign="top"><div style="width:42px;height:42px;border-radius:50%;background:${INK};color:${LIME};text-align:center;font:800 15px/42px ${SANS}">${esc(initials)}</div></td>
              <td valign="top"><div style="font:800 15px/1.3 ${SANS};color:${INK}">${esc(d.replier)} <span style="font-weight:400;color:${MUTED}">· ${esc(d.company)}</span></div>
                <div style="margin-top:8px;padding:14px 16px;background:#f6f6f2;border-radius:4px 14px 14px 14px;font:15px/1.55 ${SANS};color:${INK}">${esc(d.snippet)}</div></td>
            </tr></table>`),
          last(panel(`<div style="font:800 15px/1.4 ${SANS};color:${INK};margin-bottom:6px">⏱ Reply within the hour</div>` +
              p("Leads answered the same hour are far more likely to book a call than ones answered tomorrow.", { muted: true, size: 14 }), { border: true }) +
            button("Open the conversation", `${S}/inbox?src=first_reply`)),
        ],
        text: [`${d.replier} from ${d.company} replied:`, ``, `"${d.snippet}"`, ``, `Open your inbox: ${S}/inbox`],
        why: "You get this because a lead replied to your Mantis campaign.",
      });
    },
  },

  run_recap: {
    via: "user", stream: "lifecycle",
    intent: "A search finished after the tab closed: bring them back to the list while the intent is fresh.",
    sample: { firstName: "Tarun", title: "Dentists in Gurugram with no website", delivered: 20, withEmail: 9, noWebsite: 14,
      top: [{ name: "Sha••••• Dental", category: "Dentist", area: "Sector 45", why: "4.6★, 212 reviews, no website" },
            { name: "Smi•••• Care", category: "Dentist", area: "DLF Phase 4", why: "4.8★, 96 reviews, no website" },
            { name: "Den•••• Studio", category: "Dentist", area: "Sohna Road", why: "4.4★, 51 reviews, Instagram page only" }] },
    render: (d: { firstName: string | null; title: string; delivered: number; withEmail: number; noWebsite: number; top: Lead[] }) => mail({
      kind: "List ready",
      subject: `Your list is ready: ${d.title}`,
      preheader: `${d.delivered} leads, ${d.withEmail} with an email, ${d.noWebsite} with no website.`,
      rows: [
        hero(hi(d.firstName) + eyebrow("Search finished", true) + h1(`${d.delivered} leads are ready.`, true) +
          p(`“${esc(d.title)}”`, { onDark: true }) +
          stats([{ value: String(d.delivered), label: "Leads" }, { value: String(d.withEmail), label: "With email" }, { value: String(d.noWebsite), label: "No website", hi: true }], true)),
        section(label("Top 3 on your list") + d.top.map((l) => leadCard({ name: l.name, meta: `${l.category ? l.category + " · " : ""}${l.area}`, why: l.why, url: `${S}/leads?src=run_recap`, cta: "Open in your list" })).join("")),
        last(button("Open all " + d.delivered, `${S}/leads?src=run_recap`)),
      ],
      text: [`Your search "${d.title}" finished: ${d.delivered} leads (${d.withEmail} with email, ${d.noWebsite} no website).`, ...d.top.map((l) => `- ${l.name}, ${l.area}: ${l.why}`), ``, `Open the list: ${S}/leads`],
      why: "You get this because you ran a search on Mantis.",
    }),
  },

  find_more: {
    via: "user", stream: "lifecycle",
    intent: "3 days after a search with nothing newer: offer the next search that's likely to work.",
    sample: { firstName: "Tarun", title: "Dentists in Gurugram with no website", suggestions: ["Dentists in Noida with no website", "Skin clinics in Gurugram with no website", "Physiotherapists in Gurugram with no website"] },
    render: (d: { firstName: string | null; title: string; suggestions: string[] }) => mail({
      kind: "Ideas",
      subject: "3 searches to run next",
      preheader: `Close to “${d.title}”, with leads you haven't seen.`,
      rows: [
        hero(hi(d.firstName) + eyebrow("Where to look next", true) + h1("3 searches worth running this week.", true) +
          p(`Your last one: “${esc(d.title)}”. These are close to it and have leads you haven't seen.`, { onDark: true })),
        last(d.suggestions.map((s, i) => `
          <a href="${S}/chat?q=${encodeURIComponent(s)}&src=find_more" style="display:block;margin:0 0 10px;padding:16px 18px;border:1px solid #e3e5de;border-radius:12px;text-decoration:none;background:#fff">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
              <td width="36" valign="middle" style="font:800 13px/1 ${MONO};color:${MUTED}">0${i + 1}</td>
              <td valign="middle" style="font:800 15.5px/1.35 ${SANS};color:${INK}">${esc(s)}</td>
              <td width="30" align="right" valign="middle"><div style="width:28px;height:28px;border-radius:50%;background:${LIME};text-align:center;font:800 15px/28px ${SANS};color:${INK}">→</div></td>
            </tr></table></a>`).join("") + small("One tap runs it in chat. You'll see the cost before anything is spent.")),
      ],
      text: [`Your last search: "${d.title}". Try next:`, ...d.suggestions.map((s) => `- ${s}: ${S}/chat?q=${encodeURIComponent(s)}`)],
      why: "You get this because you ran a search on Mantis.",
    }),
  },

  weekly_scorecard: {
    via: "user", stream: "lifecycle",
    intent: "Monday recap for last week's active users: make progress visible, suggest the one next step.",
    sample: { firstName: "Tarun", week: "27 Oct – 2 Nov", found: 84, unlocked: 22, contacted: 18, replies: 3, credits: 340, tip: "Leads with no website replied 2x more than the rest this week. Try “no website” on your next search." },
    render: (d: { firstName: string | null; week: string; found: number; unlocked: number; contacted: number; replies: number; credits: number; tip: string }) => mail({
      kind: "Weekly report",
      subject: `Your week on Mantis: ${d.replies} ${d.replies === 1 ? "reply" : "replies"}, ${d.found} leads`,
      preheader: `${d.week}: ${d.found} found, ${d.contacted} contacted, ${d.replies} replies.`,
      rows: [
        hero(hi(d.firstName) + eyebrow(d.week, true) +
          h1(`${d.replies} ${d.replies === 1 ? "reply" : "replies"} from <span style="color:${LIME}">${d.contacted} emails</span>.`, true) +
          p(`That's a ${d.contacted ? Math.round((d.replies / d.contacted) * 100) : 0}% reply rate. Here's the whole week.`, { onDark: true })),
        section(label("Your funnel this week") + bars([
          { label: "Found", value: d.found }, { label: "Unlocked", value: d.unlocked },
          { label: "Contacted", value: d.contacted }, { label: "Replies", value: d.replies },
        ])),
        section(panel(`<div style="font:700 10.5px/1 ${MONO};letter-spacing:1px;color:${MUTED};margin-bottom:8px">TIP FOR THIS WEEK</div>` + p(esc(d.tip), { size: 15 })), { tint: false }),
        last(button("Plan this week's search", `${S}/chat?src=weekly`) + small(`${n(d.credits)} credits left.`)),
      ],
      text: [`Your week (${d.week}): ${d.found} found, ${d.unlocked} unlocked, ${d.contacted} contacted, ${d.replies} replies.`, d.tip, `${d.credits} credits left.`, `${S}/chat`],
      why: "You get this because you used Mantis last week.",
    }),
  },

  missed_leads_digest: {
    via: "leads", stream: "lead_alerts",
    intent: "Alerts are being ignored: one weekly digest instead of more single alerts.",
    sample: { firstName: "Tarun", count: 14, top: [
      { name: "Sha••••• Dental", category: "Dentist", area: "Gurugram", why: "No website, 4.6★ from 212 reviews" },
      { name: "Fit•••• Hub", category: "Gym", area: "Gurugram", why: "No website, 4.5★ from 340 reviews" },
      { name: "Bri•••• Academy", category: "Coaching centre", area: "Gurugram", why: "Instagram page only, 4.7★ from 88 reviews" }] },
    render: (d: { firstName: string | null; count: number; top: Lead[] }) => mail({
      kind: "Weekly digest",
      subject: `${d.count} leads matched your searches this week`,
      preheader: d.top.map((l) => l.name).join(", "),
      from: FROM_LEADS,
      rows: [
        hero(hi(d.firstName) + eyebrow("Past 7 days", true) + h1(`We found you <span style="color:${LIME}">${d.count} new leads</span>.`, true) +
          p("You haven't opened them yet. The closest ones are below.", { onDark: true })),
        section(d.top.map((l) => leadCard({ name: l.name, meta: `${l.category} · ${l.area}`, why: l.why, cost: "5 credits to unlock", url: `${S}/leads?src=digest`, cta: `View ${l.name.split(/[ •]/)[0]}'s details` })).join("")),
        last(button(`See all ${d.count}`, `${S}/leads?src=digest`) + small("We've switched you to one digest a week. Open any lead to get alerts as they come again.")),
      ],
      text: [`${d.count} leads matched your searches this week:`, ...d.top.map((l) => `- ${l.name} (${l.category}, ${l.area}): ${l.why}`), `${S}/leads`],
      why: "You get this because you have lead alerts on.",
    }),
  },

  plan_expiry: {
    via: "user", stream: "lifecycle",
    intent: "7 days and 1 day before a plan ends: renewal, framed around what stops working.",
    sample: { firstName: "Tarun", plan: "Growth", daysLeft: 7, credits: 1240 },
    render: (d: { firstName: string | null; plan: string; daysLeft: number; credits: number }) => mail({
      kind: "Plan",
      subject: d.daysLeft <= 1 ? `Your ${d.plan} plan ends tomorrow` : `Your ${d.plan} plan ends in ${d.daysLeft} days`,
      preheader: "Your credits stay. Campaigns pause when the plan ends.",
      unsubscribe: false,
      rows: [
        hero(hi(d.firstName) + `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 16px"><tr>
            <td style="padding:14px 18px;background:${LIME};border-radius:12px;text-align:center"><div style="font:800 40px/1 ${SANS};color:${INK}">${d.daysLeft}</div><div style="margin-top:4px;font:700 10.5px/1 ${MONO};letter-spacing:1px;color:${INK}">${d.daysLeft === 1 ? "DAY" : "DAYS"} LEFT</div></td>
            <td style="padding-left:18px">${h1(`Your ${esc(d.plan)} plan ends ${d.daysLeft <= 1 ? "tomorrow" : "soon"}.`, true)}</td></tr></table>`),
        section(grid([
          { bg: "#f4f7ea", html: label("What stays") + checklist([`Your ${n(d.credits)} credits`, "Every lead and list", "Your inbox and replies"]) },
          { bg: "#fbefe8", html: label("What pauses") + `<div style="font:15px/1.9 ${SANS};color:${INK}">⏸ Email campaigns<br>⏸ WhatsApp campaigns<br>⏸ AI voice calls</div>` },
        ], 12)),
        last(button("Renew the plan", `${S}/settings/billing?src=expiry_${d.daysLeft}`) + small("Renewing early adds 30 days from your current end date, so no days are lost.")),
      ],
      text: [`Your ${d.plan} plan ends in ${d.daysLeft} day(s).`, `Stays: ${d.credits} credits, leads, inbox. Pauses: campaigns.`, `Renew: ${S}/settings/billing`],
      why: "You get this because you have a paid Mantis plan.",
    }),
  },

  win_back: {
    via: "user", stream: "lifecycle",
    intent: "21 days quiet: ask why in one reply (Bark's 'What happened?'), and learn what's missing.",
    sample: { firstName: "Tarun", lastSearch: "Dentists in Gurugram with no website" },
    render: (d: { firstName: string | null; lastSearch: string | null }) => {
      const opt = (k: number, t: string) => `<a href="mailto:${COMPANY.email}?subject=${encodeURIComponent(`Mantis: ${k}`)}" style="display:block;margin:0 0 8px;padding:13px 16px;border:1px solid #e3e5de;border-radius:10px;text-decoration:none;font:15px/1.4 ${SANS};color:${INK}"><b style="display:inline-block;width:26px;height:26px;margin-right:10px;border-radius:50%;background:${LIME};text-align:center;line-height:26px">${k}</b>${t}</a>`;
      return mail({
        kind: "From Tarun",
        subject: `What happened, ${d.firstName || "there"}?`,
        preheader: "One tap is enough. I read every answer.",
        rows: [
          hero(hi(d.firstName, false) + h1("What got in the way?") +
            p(`You haven't been back to Mantis in a few weeks${d.lastSearch ? ` since you searched for “${esc(d.lastSearch)}”` : ""}. Tap the one that's closest, or just hit reply.`, { muted: true }), "paper"),
          last(opt(1, "The leads weren't the right ones") + opt(2, "Too expensive") + opt(3, "I didn't know what to do after finding leads") + opt(4, "Something else (tell me)") +
            `<div style="height:10px"></div>` + founderNote("")),
        ],
        text: [`Hi ${d.firstName || "there"},`, ``, `You haven't been back to Mantis in a few weeks. What got in the way? Reply with a number:`, `1 the leads weren't right`, `2 too expensive`, `3 didn't know what to do next`, `4 something else`, ``, `Tarun, Founder, Mantis`],
        why: "You get this because you have a Mantis account.",
      });
    },
  },

  feature_launch: {
    via: "user", stream: "lifecycle",
    intent: "A new capability shipped: one feature, what it does for them, how to try it in one click.",
    sample: { firstName: "Tarun", feature: "Hiring signals", what: "Mantis can now find companies that are hiring right now, a strong sign they have budget and a problem to solve.", steps: ["Open chat", "Ask for “companies hiring sales people in Bengaluru”", "Unlock the ones that fit"], cta: `${S}/chat?q=${encodeURIComponent("companies hiring sales people in Bengaluru")}` },
    render: (d: { firstName: string | null; feature: string; what: string; steps: string[]; cta: string }) => mail({
      kind: "New feature",
      subject: `New on Mantis: ${d.feature}`,
      preheader: d.what.slice(0, 100),
      rows: [
        hero(eyebrow("Just shipped", true) + h1(esc(d.feature), true) + p(esc(d.what), { onDark: true }) +
          // A drawn product moment: the ask, and what comes back.
          `<div style="margin:14px 0 4px;padding:16px;background:#1d2023;border-radius:12px">
            <div style="margin-bottom:10px;font:700 10px/1 ${MONO};letter-spacing:1px;color:#9aa0a3">EXAMPLE</div>
            <div style="display:inline-block;padding:10px 14px;background:${LIME};border-radius:14px 14px 4px 14px;font:14px/1.4 ${SANS};color:${INK}">${esc(d.steps[1]?.replace(/^Ask for /, "") ?? d.feature)}</div>
            <div style="margin-top:10px;font:13px/1.9 ${MONO};color:#c9cdc4">✓ 24 companies found<br>✓ 17 hiring this month<br>✓ 11 with a decision-maker email</div>
          </div>`),
        section(label("Try it in a minute") + steps(d.steps.map((s) => [esc(s), ""] as [string, string]))),
        last(button(`Try ${d.feature}`, d.cta)),
      ],
      text: [`New on Mantis: ${d.feature}`, d.what, ...d.steps.map((s) => `- ${s}`), d.cta],
      why: "You get this because you have a Mantis account.",
    }),
  },

  annual_plan: {
    via: "user", stream: "customer_offer",
    intent: "Repeat buyers: move them to a yearly commitment (only when a yearly price exists).",
    sample: { firstName: "Tarun", plan: "Growth", monthly: 3499, yearly: 34990 },
    render: (d: { firstName: string | null; plan: string; monthly: number; yearly: number }) => mail({
      kind: "Offer",
      subject: `Pay for 10 months, get 12: ${d.plan} yearly`,
      preheader: `${inr(d.yearly)} a year instead of ${inr(d.monthly * 12)}.`,
      rows: [
        hero(hi(d.firstName) + eyebrow("2 months free", true) + h1(`${esc(d.plan)}, a year at a time.`, true) +
          p("You've renewed before. Paying yearly is the same plan for less, with one payment.", { onDark: true })),
        section(grid([
          { html: label("Monthly") + `<div style="font:800 26px/1 ${SANS};color:${MUTED};text-decoration:line-through">${inr(d.monthly * 12)}</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:${MUTED}">${inr(d.monthly)} × 12 months</div>` },
          { bg: INK, html: `<div style="margin:0 0 10px;font:700 11px/1.2 ${MONO};letter-spacing:1.2px;color:${LIME}">YEARLY</div><div style="font:800 26px/1 ${SANS};color:#fff">${inr(d.yearly)}</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:#c9cdc4">You save ${inr(d.monthly * 12 - d.yearly)}</div>` },
        ], 12)),
        last(button("Switch to yearly", `${S}/settings/billing?plan=yearly&src=annual`) + small("Same credits every month. Switch back any time before renewal.")),
      ],
      text: [`${d.plan} yearly: ${inr(d.yearly)} instead of ${inr(d.monthly * 12)}.`, `${S}/settings/billing?plan=yearly`],
      why: "You get this because you've bought Mantis credits before.",
    }),
  },

  /* ------------------------------------------------------------------ community / partnership */

  get_listed: {
    via: "user", stream: "community",
    intent: "Agencies and freelancers: list their business on Mantis so businesses looking for a vendor find them (supply side).",
    sample: { firstName: "Tarun", business: "Gigzman" },
    render: (d: { firstName: string | null; business: string | null }) => {
      const name = d.business ?? "Your business";
      return mail({
        kind: "Invitation",
        subject: `Get ${d.business ?? "your business"} listed on Mantis`,
        preheader: "Businesses search Mantis for vendors too. Be one of the ones they find.",
        rows: [
          hero(hi(d.firstName) + eyebrow("Free listing", true) + h1(`Let clients find <span style="color:${LIME}">${esc(name)}</span>.`, true) +
            p("Businesses use Mantis to find vendors as well as leads. A listing puts you in front of them.", { onDark: true })),
          section(label("How your listing looks") +
            `<div style="padding:16px 18px;border:1px solid #e3e5de;border-radius:12px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
                <td width="52" valign="top"><div style="width:42px;height:42px;border-radius:10px;background:${INK};color:${LIME};text-align:center;font:800 18px/42px ${SANS}">${esc(name[0] ?? "M")}</div></td>
                <td valign="top"><div style="font:800 16px/1.3 ${SANS};color:${INK}">${esc(name)} ${chip("Verified", "ink")}</div>
                  <div style="margin:2px 0 8px;font:13.5px/1.4 ${SANS};color:${MUTED}">Website design · App development · Gurugram</div>
                  ${chip("Replies within a day", "line")}${chip("2–3 past projects", "line")}</td></tr></table></div>`),
          section(panel(label("Why list now") + checklist(["Get found by businesses that need what you sell", "Enquiries come to you, no cold outreach", "Show your work in one place"]))),
          last(button("Get listed", `${S}/partner?src=get_listed`) + small("Free. Takes about 5 minutes.")),
        ],
        text: [`Get ${name} listed on Mantis, free.`, `Businesses use Mantis to find vendors too.`, `${S}/partner`],
        why: "You get this because your Mantis profile says you run an agency or freelance.",
      });
    },
  },

  partner_program: {
    via: "user", stream: "community",
    intent: "Power users and those out of credits: earn credits by introducing clients or showing the badge.",
    sample: { firstName: "Tarun" },
    render: (d: { firstName: string | null }) => {
      const tile = (icon: string, t: string, s: string) => ({ html: `<div style="font:24px/1 ${SANS}">${icon}</div><div style="margin-top:10px;font:800 14.5px/1.3 ${SANS};color:${INK}">${t}</div><div style="margin-top:4px;font:13px/1.45 ${SANS};color:${MUTED}">${s}</div>` });
      return mail({
        kind: "Partners",
        subject: "Earn Mantis credits as a partner",
        preheader: "Put the Mantis badge on your site or introduce clients, and get credits back.",
        rows: [
          hero(hi(d.firstName) + eyebrow("Partner programme", true) + h1(`Use Mantis, <span style="color:${LIME}">earn credits back</span>.`, true) +
            p("You've used Mantis more than most. Partners get credits for helping other businesses find it.", { onDark: true })),
          section(grid([tile("🏷️", "Show the badge", "Add the Mantis partner badge to your website."), tile("🤝", "Introduce clients", "Send businesses that need leads our way."), tile("🪙", "Get credits", "Credits for every approved partner action.")])),
          last(button("Apply to the partner programme", `${S}/partner?src=partner_mail`) + small(`Brand kit and badge: ${textLink("partner/brand-kit", `${S}/partner/brand-kit`)}`)),
        ],
        text: [`Become a Mantis partner and earn credits.`, `${S}/partner`],
        why: "You get this because you have a Mantis account.",
      });
    },
  },

  referral: {
    via: "user", stream: "community",
    intent: "Right after a win (first reply): ask for one referral while they're happiest.",
    sample: { firstName: "Tarun", reward: "200 credits", url: `${S}/r/tarun` },
    render: (d: { firstName: string | null; reward: string; url: string }) => mail({
      kind: "Referral",
      subject: `Know someone who needs clients? You both get ${d.reward}`,
      preheader: "Share your link. When they sign up and run a search, you both get credits.",
      rows: [
        hero(hi(d.firstName) + eyebrow("Give & get", true) + h1(`Give ${esc(d.reward)}.<br><span style="color:${LIME}">Get ${esc(d.reward)}.</span>`, true) +
          p("Mantis just found you a lead worth replying to. Someone you know could use the same.", { onDark: true })),
        section(label("Your link") + `<div style="padding:16px;border:2px dashed ${LIME};border-radius:12px;background:#f4f7ea;font:700 16px/1.4 ${MONO};color:${INK};word-break:break-all">${esc(d.url)}</div>` +
          `<div style="height:14px"></div>` + steps([["They sign up with your link", ""], ["They run their first search", ""], [`You both get ${esc(d.reward)}`, ""]])),
        last(button("Share my link", d.url)),
      ],
      text: [`Give ${d.reward}, get ${d.reward}.`, `Your link: ${d.url}`],
      why: "You get this because you have a Mantis account.",
    }),
  },

  community_invite: {
    via: "user", stream: "community",
    intent: "Active users: join the founders' group (weekly lead drops, what's working), lowers churn.",
    sample: { firstName: "Tarun", url: "https://chat.whatsapp.com/example", members: 120 },
    render: (d: { firstName: string | null; url: string; members: number | null }) => mail({
      kind: "Community",
      subject: "You're invited: the Mantis founders' group",
      preheader: "What's getting replies this week, shared by people doing outreach.",
      rows: [
        hero(hi(d.firstName) + eyebrow("Invite only", true) + h1("Join the Mantis founders' group.", true) +
          p(`${d.members ? `${d.members} founders and agency owners` : "Founders and agency owners"} sharing what's actually getting replies.`, { onDark: true })),
        section(grid([["Weekly", "lead drop from the Mantis team"], ["Real", "numbers from live campaigns"], ["Zero", "selling or spam"]].map(([a, b], i) => ({
          bg: i === 0 ? LIME : "#f6f6f2",
          html: `<div style="font:800 22px/1 ${SANS};color:${INK}">${a}</div><div style="margin-top:8px;font:13.5px/1.4 ${SANS};color:${INK}">${b}</div>`,
        })))),
        last(button("Join the group", d.url)),
      ],
      text: [`Join the Mantis founders' group: ${d.url}`],
      why: "You get this because you use Mantis.",
    }),
  },

  case_study_ask: {
    via: "user", stream: "community",
    intent: "After a real win: ask for a short story (testimonial / landing-page proof), for credits.",
    sample: { firstName: "Tarun", win: "Sharma Dental replied and booked a call", reward: "500 credits" as string | null },
    render: (d: { firstName: string | null; win: string; reward: string | null }) => mail({
      kind: "From Tarun",
      subject: "Could we tell your story?",
      preheader: `Five minutes, four questions${d.reward ? `, and ${d.reward} as a thank-you` : ""}.`,
      rows: [
        hero(hi(d.firstName, false) + h1("Could we tell your story?") +
          quote(esc(d.win)) +
          p("That's exactly what Mantis is for, and I'd love to share it, with your permission. Just reply with short answers:", { muted: true }), "paper"),
        last(steps([["What do you sell, and who to?", ""], ["How did you find clients before Mantis?", ""], ["What happened with this lead?", ""], ["Can we use your name and logo?", ""]]) +
          (d.reward ? panel(p(`🎁 As a thank-you we'll add <b>${esc(d.reward)}</b> to your account.`, { size: 15 })) : "") +
          founderNote("")),
      ],
      text: [`Hi ${d.firstName || "there"},`, `I saw: ${d.win}. Could we share your story? Reply with short answers to:`, `- What do you sell, and who to?`, `- How did you find clients before?`, `- What happened with this lead?`, `- Can we use your name and logo?`, d.reward && `${d.reward} as a thank-you.`, `Tarun`],
      why: "You get this because you use Mantis.",
    }),
  },

  beta_invite: {
    via: "user", stream: "community",
    intent: "Top users: early access to a feature before launch — loyalty plus real feedback.",
    sample: { firstName: "Tarun", feature: "AI voice calls to your leads" },
    render: (d: { firstName: string | null; feature: string }) => mail({
      kind: "Early access",
      subject: `Early access: ${d.feature}`,
      preheader: "You're one of our most active users, so you get it first.",
      rows: [
        hero(hi(d.firstName) + eyebrow("Early access · you're on the list", true) + h1(`Try <span style="color:${LIME}">${esc(d.feature)}</span> before anyone else.`, true) +
          p("You're among the most active people on Mantis, so I'd like you to use this first and tell me what's wrong with it.", { onDark: true })),
        last(panel(p("Reply <b>yes</b> to this email and we'll switch it on for your account today.", { size: 15.5 }), { border: true }) +
          button("Reply yes", `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Yes: ${d.feature}`)}`) + founderNote("")),
      ],
      text: [`Early access: ${d.feature}. Reply "yes" and we'll switch it on for you.`, `Tarun`],
      why: "You get this because you're an active Mantis user.",
    }),
  },

  stickly_cross_sell: {
    via: "user", stream: "customer_offer",
    intent: "Users with a website and no Stickly: the chat widget that turns site visitors into leads.",
    sample: { firstName: "Tarun", website: "gigzman.com" },
    render: (d: { firstName: string | null; website: string | null }) => mail({
      kind: "From the Mantis team",
      subject: `Turn visitors on ${d.website ?? "your site"} into leads`,
      preheader: "Stickly: a chat widget that captures leads and sends them to your Mantis inbox. Free plan.",
      rows: [
        hero(hi(d.firstName) + eyebrow("Stickly × Mantis", true) + h1(`Mantis finds leads.<br><span style="color:${LIME}">Stickly catches the ones who find you.</span>`, true)),
        section(`<div style="padding:18px;border:1px solid #e3e5de;border-radius:12px;background:#fafaf7">
            <div style="font:700 10.5px/1 ${MONO};letter-spacing:1px;color:${MUTED};margin-bottom:12px">${esc((d.website ?? "your-site.com").toUpperCase())}</div>
            <div style="text-align:right"><div style="display:inline-block;max-width:260px;padding:12px 14px;background:#5138EE;border-radius:14px 14px 4px 14px;font:14px/1.45 ${SANS};color:#fff;text-align:left">Hi! Looking for a website? Leave your number and we'll call you in 10 minutes.</div></div>
            <div style="margin-top:8px"><div style="display:inline-block;padding:10px 14px;background:#fff;border:1px solid #e3e5de;border-radius:14px 14px 14px 4px;font:14px/1.45 ${SANS};color:${INK}">Yes, 98•• ••••• · need an online store</div></div>
            <div style="margin-top:12px;font:12.5px/1.4 ${MONO};color:${MUTED}">→ saved to your Mantis inbox</div>
          </div>`),
        section(grid([["Free", "plan to start"], ["$19", "a month for more"], ["2 min", "one line of code"]].map(([a, b]) => ({
          html: `<div style="font:800 22px/1 ${SANS};color:${INK}">${a}</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:${MUTED}">${b}</div>`,
        })))),
        last(button("Add Stickly to my site", "https://stickly.live/?src=mantis_mail")),
      ],
      text: [`Stickly: a chat widget that captures leads on ${d.website ?? "your site"} into your Mantis inbox. Free plan.`, `https://stickly.live/?src=mantis_mail`],
      why: "You get this because you have a Mantis account.",
    }),
  },

  office_hours: {
    via: "user", stream: "community",
    intent: "New users on day 2: a 20-minute call to set up their ICP; the biggest activation lever.",
    sample: { firstName: "Tarun", url: "https://cal.com/mantis/20min" },
    render: (d: { firstName: string | null; url: string }) => mail({
      kind: "From Tarun",
      subject: "20 minutes to set up your first search?",
      preheader: "I'll set up your ideal customer with you, live.",
      rows: [
        hero(hi(d.firstName, false) + `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px"><tr>
            <td style="padding:12px 16px;background:${INK};border-radius:12px;text-align:center"><div style="font:800 30px/1 ${SANS};color:${LIME}">20</div><div style="margin-top:4px;font:700 10px/1 ${MONO};letter-spacing:1px;color:#fff">MIN</div></td>
            <td style="padding-left:16px">${h1("Set up your first search with me, live.")}</td></tr></table>` +
          p("Most people get their best leads after one change to how they describe their ideal customer. I'm happy to do that with you.", { muted: true }), "paper"),
        last(label("On the call") + steps([["You tell me what you sell", "and who has bought it before."], ["We set up the search together", "in your account, so it's saved."], ["You leave with a list", "of leads you can contact today."]]) +
          button("Pick a time", d.url) + `<div style="height:8px"></div>` + founderNote("")),
      ],
      text: [`20 minutes to set up your first search with me? ${d.url}`, `Tarun`],
      why: "You get this because you recently joined Mantis.",
    }),
  },

  white_label: {
    via: "user", stream: "community",
    intent: "Agencies with a team: resell Mantis leads to their own clients under their name (big ticket).",
    sample: { firstName: "Tarun", agency: "Gigzman" },
    render: (d: { firstName: string | null; agency: string | null }) => {
      const name = d.agency ?? "Your agency";
      return mail({
        kind: "Agency partners",
        subject: `Sell leads to your clients under ${d.agency ?? "your"} name`,
        preheader: "A partner plan for agencies: Mantis leads, your branding, your price.",
        rows: [
          hero(hi(d.firstName) + eyebrow("For agencies", true) + h1(`Lead lists for your clients,<br><span style="color:${LIME}">with ${esc(name)} on them.</span>`, true) +
            p("Give clients lead lists and reports without building a lead engine. Your branding, your price.", { onDark: true })),
          section(label("What your client sees (example)") + `<div style="border:1px solid #e3e5de;border-radius:12px;overflow:hidden">
              <div style="padding:12px 16px;background:${INK};font:800 14px/1 ${SANS};color:#fff">${esc(name)} <span style="font-weight:400;color:#9aa0a3">· Monthly lead report</span></div>
              <div style="padding:14px 16px">${stats([{ value: "120", label: "New leads" }, { value: "38", label: "Contacted" }, { value: "9", label: "Replies", hi: true }])}</div></div>`),
          last(p("If that's interesting, reply with roughly how many clients you'd use it for, and I'll send the details.") + founderNote("")),
        ],
        text: [`Sell leads to your clients under ${name}'s name. Reply with how many clients you'd use it for.`, `Tarun`],
        why: "You get this because your Mantis profile says you run an agency.",
      });
    },
  },

  nps: {
    via: "user", stream: "lifecycle",
    intent: "30 days in: one-number score; promoters get the referral ask, detractors a founder call.",
    sample: { firstName: "Tarun" },
    render: (d: { firstName: string | null }) => mail({
      kind: "One question",
      subject: "One question about Mantis",
      preheader: "Tap a number from 0 to 10.",
      rows: [
        hero(hi(d.firstName, false) + h1("How likely are you to recommend Mantis to a friend?") +
          p("Tap a number. It opens a reply with your score in it; add a word on why if you have a second.", { muted: true }), "paper"),
        last(scale((k) => `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Mantis score: ${k}`)}`) + `<div style="height:16px"></div>` + founderNote("")),
      ],
      text: [`How likely are you to recommend Mantis? Reply with 0–10.`, `Tarun`],
      why: "You get this because you've used Mantis for a month.",
    }),
  },
  /* ------------------------------------------------------------------ event triggers (docs: trigger table, 2026-11-05)
   * Built from product_events: what people actually do (map searches, unlocks, WhatsApp and call
   * clicks) and where they stop (a plan not run, a campaign not approved). */

  map_to_chat: {
    via: "user", stream: "lifecycle",
    intent: "Row 1 — 20+ map searches in a day and never used chat: one line in chat builds the whole list.",
    sample: { firstName: "Tarun", searches: 40, prompt: "Gyms in Noida without a website" },
    render: (d: { firstName: string | null; searches: number; prompt: string }) => mail({
      kind: "Tip",
      subject: `You searched ${d.searches} areas by hand. Try one line instead`,
      preheader: `“${d.prompt}” — chat builds the whole list in one go.`,
      rows: [
        hero(hi(d.firstName) + eyebrow(`${d.searches} map searches yesterday`, true) +
          h1(`One line can do what <span style="color:${LIME}">${d.searches} map searches</span> did.`, true) +
          p("Tell Mantis chat what you want in plain words. It searches every area for you and hands back one list.", { onDark: true })),
        section(label("Your search, written for you") +
          `<div style="padding:16px;background:#f6f6f2;border-radius:12px"><div style="display:inline-block;padding:12px 16px;background:${INK};border-radius:14px 14px 4px 14px;font:600 15px/1.45 ${SANS};color:#fff">${esc(d.prompt)}</div>
           <div style="margin-top:12px;font:13.5px/1.6 ${SANS};color:${MUTED}">→ Mantis plans the search, shows the cost, and runs it when you say go.</div></div>`),
        last(button("Open chat with this search", `${S}/chat?q=${encodeURIComponent(d.prompt)}&src=map_to_chat`)),
      ],
      text: [`You searched ${d.searches} areas on the map. In chat, one line does it: "${d.prompt}".`, `${S}/chat?q=${encodeURIComponent(d.prompt)}`],
      why: "You get this because you searched on the Mantis map.",
    }),
  },

  ai_caller_unlocked: {
    via: "user", stream: "lifecycle",
    intent: "Row 2 — 3+ unlocks and no campaign or AI caller yet: let the AI caller ring the leads they already paid for.",
    sample: { firstName: "Tarun", unlocked: 5, names: ["Sharma Dental", "FitZone Gym", "Bright Academy", "Anna's Boutique"] },
    render: (d: { firstName: string | null; unlocked: number; names: string[] }) => mail({
      kind: "AI caller",
      subject: `Your ${d.unlocked} leads are waiting. Let the AI caller ring them`,
      preheader: "It calls in Hindi or English, pitches your offer and books the meeting.",
      rows: [
        hero(hi(d.firstName) + eyebrow("AI caller", true) +
          h1(`Your <span style="color:${LIME}">${d.unlocked} leads</span> are waiting for a call.`, true) +
          p("The Mantis AI caller rings them for you: it starts in Hindi, switches to the language they speak, pitches your offer and books the meeting.", { onDark: true })),
        section(label("Leads you unlocked") + d.names.slice(0, 5).map((n) => `<div style="padding:11px 0;border-bottom:1px solid #eceee7;font:700 15px/1.3 ${SANS};color:${INK}">📞&nbsp; ${esc(n)}</div>`).join("") +
          (d.unlocked > d.names.length ? `<div style="padding-top:10px;font:13px/1.4 ${SANS};color:${MUTED}">and ${d.unlocked - Math.min(d.names.length, 5)} more</div>` : "")),
        section(steps([["Hear a test call on your own number", "Two minutes, so you know exactly how it sounds."], ["Pick the leads", "The ones you unlocked are ready."], ["It calls between 10:00 and 19:30", "Call summaries land in your Mantis inbox."]])),
        last(button("Hear a test call", `${S}/integrations/voice?src=ai_caller_unlocked`)),
      ],
      text: [`Your ${d.unlocked} unlocked leads are waiting: ${d.names.join(", ")}.`, `The AI caller rings them in Hindi or English and books meetings. Hear a test call: ${S}/integrations/voice`],
      why: "You get this because you unlocked leads on Mantis.",
    }),
  },

  whatsapp_one_by_one: {
    via: "user", stream: "lifecycle",
    intent: "Row 3 — 5+ WhatsApp clicks: they do outreach by hand; show the follow-up they're missing and collect demand for bulk WhatsApp.",
    sample: { firstName: "Tarun", clicks: 12 },
    render: (d: { firstName: string | null; clicks: number }) => mail({
      kind: "Outreach",
      subject: `You messaged ${d.clicks} businesses one by one`,
      preheader: "The follow-up is where most replies come from. Let Mantis do that part.",
      rows: [
        hero(hi(d.firstName) + eyebrow(`${d.clicks} WhatsApp chats opened`, true) +
          h1(`${d.clicks} businesses, <span style="color:${LIME}">one at a time</span>.`, true) +
          p("That's the right instinct: a personal message works. What usually gets skipped is the follow-up, and that's where most replies come from.", { onDark: true })),
        section(grid([
          { html: label("Today") + `<div style="font:15px/1.6 ${SANS};color:${INK}">Open WhatsApp<br>Type the message<br>Repeat ${d.clicks} times<br>No follow-up</div>` },
          { bg: INK, html: `<div style="margin:0 0 10px;font:700 11px/1.2 ${SANS};letter-spacing:1.2px;color:${LIME}">WITH MANTIS</div><div style="font:15px/1.6 ${SANS};color:#fff">Write once<br>Sent to every lead<br>Follow-ups go by themselves<br>Replies in one inbox</div>` },
        ], 12)),
        last(panel(p("<b>Bulk WhatsApp is coming next.</b> Reply “WhatsApp” to this email and you'll get it first. Until then, the AI caller and email campaigns can follow up for you.", { size: 15 }), { border: true }) +
          button("Follow up with AI calls", `${S}/integrations/voice?src=whatsapp_one_by_one`)),
      ],
      text: [`You opened WhatsApp for ${d.clicks} businesses one by one. Reply "WhatsApp" to get bulk WhatsApp first.`, `Meanwhile, AI calls can follow up: ${S}/integrations/voice`],
      why: "You get this because you contacted leads from Mantis.",
    }),
  },

  calls_for_you: {
    via: "user", stream: "lifecycle",
    intent: "Row 4 — 2+ call-button clicks: they're calling leads themselves; the AI caller does it for them.",
    sample: { firstName: "Tarun", calls: 3 },
    render: (d: { firstName: string | null; calls: number }) => mail({
      kind: "AI caller",
      subject: "Let Mantis make these calls for you",
      preheader: "The AI caller rings your leads and tells you who's interested.",
      rows: [
        hero(hi(d.firstName) + eyebrow("You're already calling leads", true) +
          h1(`Let Mantis <span style="color:${LIME}">make the calls</span>.`, true) +
          p(`You've called ${d.calls} leads yourself. The AI caller can ring the rest in Hindi or English, pitch your offer and book meetings, while you take only the interested ones.`, { onDark: true })),
        section(grid([
          { html: `<div style="font:800 22px/1 ${SANS};color:${INK}">10–7:30</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:${MUTED}">calls only in working hours</div>` },
          { html: `<div style="font:800 22px/1 ${SANS};color:${INK}">Hinglish</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:${MUTED}">starts in Hindi, follows their language</div>` },
          { bg: LIME, html: `<div style="font:800 22px/1 ${SANS};color:${INK}">Summary</div><div style="margin-top:8px;font:13px/1.4 ${SANS};color:${INK}">of every call in your inbox</div>` },
        ])),
        last(button("Try AI calling", `${S}/integrations/voice?src=calls_for_you`) + small("Start with a free test call to your own number.")),
      ],
      text: [`You've called ${d.calls} leads yourself. The AI caller can ring the rest and book meetings.`, `${S}/integrations/voice`],
      why: "You get this because you called leads from Mantis.",
    }),
  },

  plan_ready: {
    via: "user", stream: "lifecycle",
    intent: "Row 5 — a search plan was made but not run within 30 minutes: one click to run it.",
    sample: { firstName: "Tarun", title: "Dentists in Gurugram with no website", area: "Gurugram", credits: 120, chatId: "00000000-0000-0000-0000-000000000000" },
    render: (d: { firstName: string | null; title: string; area: string; credits: number; chatId: string }) => mail({
      kind: "Search plan",
      subject: "Your search plan is ready, one click to run",
      preheader: `${d.title} · about ${d.credits} credits`,
      rows: [
        hero(hi(d.firstName) + eyebrow("Waiting for you", true) + h1("Your search plan is ready.", true) +
          p("Everything is set up. It only needs a go.", { onDark: true })),
        section(grid([
          { html: label("Looking for") + `<div style="font:800 15px/1.4 ${SANS};color:${INK}">${esc(d.title)}</div>` },
          { html: label("Where") + `<div style="font:800 15px/1.4 ${SANS};color:${INK}">${esc(d.area)}</div>` },
          { bg: LIME, html: label("Cost") + `<div style="font:800 15px/1.4 ${SANS};color:${INK}">~${n(d.credits)} credits</div>` },
        ])),
        last(button("Run my search", `${S}/chat/${d.chatId}?src=plan_ready`)),
      ],
      text: [`Your search plan "${d.title}" (${d.area}, ~${d.credits} credits) is ready.`, `${S}/chat/${d.chatId}`],
      why: "You get this because you planned a search on Mantis.",
    }),
  },

  campaign_unfinished: {
    via: "user", stream: "lifecycle",
    intent: "Row 8 — a campaign was created but not tested or approved within 24 hours: name the one missing step.",
    sample: { firstName: "Tarun", name: "Dentists Gurugram", campaignId: "00000000-0000-0000-0000-000000000000", missing: ["mailbox", "test", "approve"] as string[] },
    render: (d: { firstName: string | null; name: string; campaignId: string; missing: string[] }) => {
      const all: Array<[string, string, string]> = [
        ["mailbox", "Connect a mailbox", "So it sends from your own address."],
        ["test", "Send yourself a test", "See exactly what your leads will get."],
        ["approve", "Approve it", "Nothing goes out until you do."],
      ];
      const next = all.find(([k]) => d.missing.includes(k)) ?? all[2];
      return mail({
        kind: "Campaign",
        subject: "Your campaign is one step from going live",
        preheader: `“${d.name}” — next: ${next[1].toLowerCase()}.`,
        rows: [
          hero(hi(d.firstName) + eyebrow("Almost live", true) + h1(`“${esc(d.name)}” is <span style="color:${LIME}">one step away</span>.`, true) +
            p(`Next: ${esc(next[1].toLowerCase())}.`, { onDark: true })),
          section(all.map(([k, t, sub]) => {
            const done = !d.missing.includes(k);
            return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px"><tr>
              <td width="38" valign="top"><div style="width:26px;height:26px;border-radius:50%;background:${done ? LIME : "#fff"};border:2px solid ${done ? LIME : INK};text-align:center;font:800 13px/26px ${SANS};color:${INK}">${done ? "✓" : ""}</div></td>
              <td valign="top"><div style="font:800 15px/1.35 ${SANS};color:${done ? MUTED : INK};${done ? "text-decoration:line-through;" : ""}">${t}</div><div style="font:13.5px/1.5 ${SANS};color:${MUTED}">${sub}</div></td></tr></table>`;
          }).join("")),
          last(button("Finish campaign", `${S}/campaigns/${d.campaignId}?src=campaign_unfinished`)),
        ],
        text: [`Your campaign "${d.name}" is one step from going live. Next: ${next[1]}.`, `${S}/campaigns/${d.campaignId}`],
        why: "You get this because you created a campaign on Mantis.",
      });
    },
  },

  comeback_leads: {
    via: "user", stream: "lifecycle",
    intent: "Row 16 — active one day, gone since (day 1/3/7/14): real unseen leads from their last search, Bark-digest style. Replaces the old day 3/5/10/15/20 reactivation.",
    sample: { firstName: "Tarun", total: 12, category: "Gyms", area: "Noida", leads: [
      { name: "Fit•••• Hub", category: "Gym", area: "Sector 18", why: "No website · 4.5★ from 340 reviews" },
      { name: "Iro•••• Fitness", category: "Gym", area: "Sector 62", why: "No website · 4.7★ from 120 reviews" },
      { name: "Pow•••• House", category: "Gym", area: "Sector 50", why: "Instagram page only · 4.4★ from 88 reviews" }] },
    render: (d: { firstName: string | null; total: number; category: string; area: string; leads: Lead[] }) => mail({
      kind: "New leads",
      subject: `${d.total} new ${d.category.toLowerCase()} without a website in ${d.area}`,
      preheader: d.leads.map((l) => l.name).join(", "),
      rows: [
        hero(hi(d.firstName) + eyebrow(`${d.category} · ${d.area}`, true) +
          h1(`We found <span style="color:${LIME}">${d.total} businesses</span> you haven't seen yet.`, true) +
          p("Same search as last time, new businesses. Names and contacts unlock in one click.", { onDark: true })),
        section(d.leads.map((l) => leadCard({ name: l.name, meta: `${l.category} · ${l.area}`, why: l.why, cost: "5 credits to unlock", url: `${S}/leads?src=comeback`, cta: "Unlock this lead" })).join("")),
        last(button(`See all ${d.total}`, `${S}/leads?src=comeback`)),
      ],
      text: [`${d.total} new ${d.category} without a website in ${d.area}:`, ...d.leads.map((l) => `- ${l.name} (${l.area}): ${l.why}`), `${S}/leads`],
      why: "You get this because you searched on Mantis.",
    }),
  },

  founder_question: {
    via: "user", stream: "community",
    intent: "Row 19 — power users (10+ unlocks or 10+ WhatsApp clicks): a plain personal question from Tarun; the reply is the point.",
    sample: { firstName: "Tarun", unlocked: 34 },
    render: (d: { firstName: string | null; unlocked: number }) => mail({
      kind: "From Tarun",
      subject: "Quick question, Tarun from Mantis",
      preheader: "What do you do with the leads once you have them?",
      rows: [
        hero(p(`Hi ${esc(d.firstName || "there")},`) +
          p(`I'm Tarun, I built Mantis. You've unlocked ${d.unlocked} leads, more than almost anyone, so I wanted to ask you directly:`) +
          p("<b>What do you do with the leads once you have them?</b> Call, WhatsApp, email, hand them to someone?") +
          p("I'm asking because we're starting a done-for-you service where our AI caller works your list and books the meetings for you. If that sounds useful, tell me and I'll set it up for you first.") +
          p("Just hit reply. It comes straight to me.") + founderNote(""), "paper").replace("<tr><td style=\"", "<tr><td style=\"border-radius:0 0 14px 14px;"),
      ],
      text: [`Hi ${d.firstName || "there"},`, ``, `I'm Tarun, I built Mantis. You've unlocked ${d.unlocked} leads, so I wanted to ask: what do you do with the leads once you have them?`, `We're starting a done-for-you service where our AI caller works your list and books meetings. Interested? Just reply.`, ``, `Tarun`],
      why: "You get this because you're one of the most active people on Mantis.",
    }),
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, Entry<any>>;

export type MailId = keyof typeof CATALOG;
