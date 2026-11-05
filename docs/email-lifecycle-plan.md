# Mantis email lifecycle plan: activation, retention, upsell

See also `docs/email-playbook.md`: the full trigger catalogue, idea bank from every inbox
sender, marketplace mechanics, lemlist learnings, and mail formats.

Written 2026-11-04. Inputs: two web research passes (frameworks, practitioner/YC evidence),
the tarun@gigzman.com inbox (2,200 mails from 22 Aug to 4 Nov; 1,699 third-party, 438 from
Bark.com), and Mantis's existing `product_events` (docs/analytics-events.md) and
`lib/lifecycle-email.ts`. Status: plan only; nothing new built.

## 1. Where Mantis is

- 57% of chats never reach a plan. That is the activation leak, and no email fixes it alone.
- 0 paid packs. 500 free credits once, so most users never hit a decision point.
- Every trigger this plan needs is already tracked: `chat.plan.created`, `chat.plan.run`,
  `leads.lead.unlock`, `campaigns.campaign.*`, `billing.pack.checkout_start/paid`,
  `account.onboarding.complete`.
- `lib/lifecycle-email.ts` (cron `/api/cron/lifecycle-email`) already has two flows:
  - **Reactivation:** inactive day 3/5/10/15/20, alternating "N businesses in {city} need a
    website" and a single-lead alert "A 82-heat lead just appeared in {city}".
  - **Partnership invite** when credits hit 0.
  Both key off the V1 map search (last lat/lng, 6 km radius), not the V2 chat/ICP. There is no
  onboarding, activation, credit-meter or purchase flow. Whether the cron is scheduled on App
  Runner is unverified.

## 2. What the inbox taught us

Data: 2,200 mails scraped from tarun@gigzman.com, 22 Aug – 4 Nov 2026. 501 are our own mail
(gigzman.com, mantisai.in, blogyapp.com, stickly.live) and are excluded. The Bark account was
created 13 Oct, so Bark covers 23 days. Read/unread state was not captured.

### Categories (1,699 third-party mails)

| Category | Mails | Senders | Top senders |
|---|---|---|---|
| Lead alerts / marketplace | 439 | 4 | Bark 438, Sortlist 1 |
| Newsletter / content | 345 | 30 | Product Hunt 66, TAAFT 51, Joey Yap 46, OpenTools 41 |
| Launch platforms / directories | 282 | 92 | Nick Launches 38, Smol Launch 14, TinyLaunch 14, GoodFirms 10 |
| Security / account / transactional | 164 | 68 | Google 57, Telnyx 10, npm 9 |
| Job / hiring platforms | 139 | 25 | Internshala 92, Naukri 11, JobHai 10 |
| Product / feature announcement | 95 | 27 | Semrush 20, Apollo 13, Calendly 9 |
| Replies / bounces to our own outbound | 68 | 41 | mailer-daemon 23, 22 helpdesk auto-replies |
| Onboarding / activation sequence | 65 | 43 | Mapbox 6, Calendly 5, Wati 4 |
| Usage / billing / credit / trial | 51 | 24 | Wati 7, Trustindex 4, Calendly 4 |
| Cold outreach received | 29 | 25 | upvote.network 5 |
| Events / webinars | 22 | 6 | sampark.gov.in 7, Startup Haryana 5 |

### Bark: the closest analog to Mantis (438 mails in 23 days)

Bark sells leads for credits, exactly like Mantis. Its email is its product.

**Lead alerts (408).** The subject is the lead:

| Template | Count |
|---|---|
| `Additional details: {name} is looking for a {service}` | 176 |
| `{name} urgently needs a {service}` | 95 |
| `Verified: {name} is looking for a {service}` | 65 |
| `{name} is looking for a {service}` | 72 |

- 61 subjects add city + postcode ("…a Web Designer in Leicester, LE3").
- Body: full brief (budget "£250–£999", timeline, "How likely are you to hire?"), masked contact
  ("078** ******"), the price ("40 credits to respond", 10–74 credits per lead), scarcity
  ("1/5 professionals have responded"), and in every alert: "20% off your starter pack… If you
  don't get hired at least once from your starter pack, we'll give you all your credits back."
- Cadence: 8–29 a day, 19.8/weekday, 11.8/weekend, sent in real time as buyers post.
- **No decay with zero engagement:** 18.4/day in the first 11 days, 17.2/day in the last 12, while
  Bark's own summary said "No Responses".
- Re-sends: 43% are "Additional details", and 44 leads got 2–6 mails. Re-sends look like new leads.
- Bark claimed "512 Leads" in 30 days but emailed about 390, so it filters what it mails.

**Daily digest (20):** "Today's 10 closest leads for Gigzman", fixed at about 19:00 UK time.

**Account sequence (non-alert mails, D0 = signup):**

| Day | Subject | Job |
|---|---|---|
| D0 | "Welcome to Bark" + "Tarun, congratulations on joining Bark" (from Emma) | Welcome |
| D1–D2 | "Opportunity for Gigzman", "Web Development customers for Gigzman" | Show demand |
| D3 | "Offer for Gigzman" ("Expiring soon") | First offer |
| D6–D7 | "Last chance to get 50% off your credit pack!", "Final hours!…" | Hard deadline + guarantee |
| D12 | "What happened, Tarun?" ("you haven't responded to any leads yet" + 2-min survey) | Ask why |
| D19 | "You're one step away from speaking to Satnam" | Probably a viewed-but-not-bought trigger |
| D21 | "Gigzman's last 30 days on Bark" | Scorecard: "512 Leads / No Responses / 47% Profile Score vs 33% average / You don't have any credits" |

**Lesson for Mantis:** our credits buy leads too. The strongest retention and upsell email Mantis
can send is *new leads matching your saved ICP*, each with a credit price, a pack offer and a
guarantee. Mantis's existing single-lead alert is the seed of this; it needs V2 ICP matching.

### Other SaaS sequences worth copying

- **Apollo (direct competitor, 22 mails in 36 days):** teaches the core loop in order:
  "The difference between a search and a list" → "A list is only the beginning" → "Once your
  sequence is live — three things to watch in week 1". Credit upsell on D1 ("Unlock… 30,000
  credits").
- **Calendly (22):** daily tips D0–D12, "7 days left in your trial! See your scheduling progress"
  (D8), "Your trial has ended" (D15), then weekly "See what you're missing".
- **Wati:** names the single missing step: "Your number isn't connected yet".
- **Keywords Everywhere (12):** teaching drip with widening gaps (D0, 2, 5, 9, 13, 17, 22) incl.
  "How keyword lookups are metered", ending D30 with the best breakup in the inbox: "Last note
  from me. Keep using it free. No expiry… once a month".
- **Supabase:** inactivity as the trigger: "Project is going to be paused" (D7, D17).
- **Internshala:** free thing + expiry countdown ("expires in 10/9/6/4/2 days"), abandoned
  checkout ("your Premium plan payment is incomplete"), festive sale ("Diwali Sale 60% off"),
  a named human ("Simran, your hiring expert") with a callback CTA.
- **BetaList / Huzzler:** "Your $10 credit expires in 24 hours".
- **Semrush:** the user's own data as the subject ("Your traffic dropped?").

### What not to copy

- **Volume that never adapts.** Bark kept ~18/day with zero responses. Internshala sent 92 mails
  in 48 days, 6 on D0 from 3 senders. Wati sent 3 mails after "Last nudge, we promise", and its
  "trial ended" arrived before "ends in 2 days". Apollo sent up to 2 a day.
- **Broken personalisation.** Wati: "For an eCommerce brand like google.com".
- **Re-sends dressed as new.** Label them "Update on a lead you saw".
- **Fake-mistake subjects.** Our own "We accidentally gave you 500 credits" drew 22 helpdesk
  auto-replies. Don't repeat it for users.
- Heavy HTML templates. Research shows plain text gets more clicks (HubSpot: image-heavy HTML 51%
  fewer clicks).

## 3. What research says (short)

- **Activation = Setup → Aha → Habit** (Reforge). For Mantis: setup = business profile saved,
  aha = first plan runs and returns leads, habit = comes back to find or contact again.
- **Behaviour-triggered beats time-based**, but complexity hurts. PostHog's best version was a
  personal email from a real person (68% open, 16% CTR). Their 53-email version fell to 2.4% CTR.
  Use about 3–5 triggered emails, stop on activation, pause after 2 ignored mails.
- **Plain-text founder welcome with one question** gets 15–30% replies (HN, Groove).
- **Stuck-user "red flag" email:** Groove got 10% response; 30% of those retained vs 8% baseline.
- **Credit meters:** Vercel, ElevenLabs, Replit warn at thresholds. Clay, Apollo, lemlist and
  Instantly do not, which is a gap Mantis can fill.
- **India:** auto top-up is impractical because of RBI e-mandate rules. Send a low-balance email
  with a one-tap Razorpay/UPI link. Pair email with WhatsApp; Indian founders call WhatsApp
  mandatory (Haptik, Voxxi).
- **Referral paid in credits:** Clay gives 3,000 credits each way on the referee's first paid
  activation.
- **Hold out 10%** of users from each flow, otherwise lift is guesswork.

Full sourced reports are in the session that produced this doc. The key URLs are listed in §9.

## 4. Sending setup

| Stream | Domain | Config set | Unsubscribe |
|---|---|---|---|
| Transactional: OTP, receipts, credit-balance alerts | `mantisai.in` | `mantis-transactional` | Not required |
| Lifecycle: onboarding, lead alerts, recaps, offers | `go.mantisai.in` (already verified in SES) | new `mantis-lifecycle` | One-click (RFC 8058) + preferences page |
| Mantis's own cold acquisition | `mantismail.live`, `mantismailer.live` | new per-domain sets | Required |
| V2 pre-warmed inboxes for users | proposed: `mantisleads.live` (+ spares) | per-user-campaign | Required |

- Lifecycle mail must come from a mantisai.in name. A user who signed up at mantisai.in and gets
  mail from `mantisuser.live` will read it as phishing. Same for OTP from `mantisotp.live`.
  Recommendation: keep `mantisotp.live` and `mantisuser.live` as spare cold pools, not for users.
- From: a person ("Tarun from Mantis"). Reply-To: a monitored inbox (SES inbound → Mantis Inbox).
- Gmail's 5,000/day bulk threshold counts against the parent domain, so `go.mantisai.in` volume
  counts toward mantisai.in. Fine for lifecycle; one more reason cold never touches mantisai.in.
- The SES account is on PROBATION (seen 2026-11-04). Lifecycle volume is small and engaged, so it
  helps reputation. Cold volume on the new .live domains must ramp slowly.

## 5. The flows

Each flow lists trigger → email → exit. "WA" means a WhatsApp variant for users with a phone.

### A. Activation (attacks the 57% leak)

| # | Trigger | Email | Exit |
|---|---|---|---|
| A1 | Signup + 1h | Plain-text welcome from Tarun: "What kind of customer are you trying to find? Reply in one line and I'll run it for you." | Any reply or `chat.plan.created` |
| A2 | Chat idle 2h, no `chat.plan.created` | Stuck-chat rescue: "You were looking for *dentists in Gurgaon without websites*. Here are 3 of them. One click runs the full plan." Deep link to the chat with the plan pre-built. | `chat.plan.run` |
| A3 | Run finished, leads not opened in 1h | "Your 47 leads are ready": count, 3 previewed rows (name, city, why they fit), one CTA. | `leads.lead.unlock` |
| A4 | Leads unlocked, no campaign in 48h | "Send your first 10": a pre-drafted outreach for these leads, opens the builder. | `campaigns.campaign.approve` |
| A5 | Day 4, never activated | Survey: "What stopped you? Reply with one word." Answers feed the product, not just email. | Any reply |
| A6 | D1, D3, D6 while not activated | Core-loop lessons, Apollo style: "ICP → plan", "A list is only the beginning: unlock → outreach", "How credits are spent". | Activation |

- Stop rule: after 2 ignored activation mails, pause 14 days.
- High-intent users (a plan created, or 100+ credits spent): WhatsApp message plus a founder call
  within 24h. Close reports phone at 70% response vs email at 16%.

### B. Retention: the Bark engine

| # | Trigger | Email | Notes |
|---|---|---|---|
| B1 | New lead matches a saved ICP/run with a strong signal (no website, just funded, hiring) | **Single-lead alert.** Subject: "Sharma Dental (Gurgaon) has no website, 4.6★ 212 reviews". Body: the facts, why it fits, "8 credits to unlock contact", "3 Mantis users viewed this". CTA: unlock. | Cap 3/day per user. Only high-fit leads. |
| B2 | Daily, if ≥5 new matches | **Digest:** "Today's 10 best leads for your ICP", one line each with credit price. | Users can switch to digest-only |
| B3 | Lead gets new info (phone verified, new review, new funding) | **Re-touch:** "Verified: Sharma Dental's owner phone confirmed". | Max 1 re-touch per lead |
| B4 | Monday, users active last week | **Weekly recap** (Grammarly style): leads found, contacted, replies, meetings, credits left, "next ICP to try". | Only active users |
| B4b | D21, then monthly, everyone | **Scorecard** (Bark D21): "{N} ICP matches this month · {M} unlocked · {R} replies · credits left {C}" plus a peer benchmark. | Replaces B4 for inactive users |
| B5 | Campaign event (first reply, meeting booked) | "Ravi from Sharma Dental replied", deep link to Inbox. | Transactional stream |

- This needs a saved-ICP watcher: a job that re-runs saved runs/playbooks against new registry
  rows and scores fit. This is the biggest build item. The existing single-lead alert in
  `lib/lifecycle-email.ts` (heat score, 6 km of last map search) becomes the V1 fallback.
- **Adapt to engagement (Bark doesn't):** after 7 days with zero alert clicks, drop B1 to the
  B2 digest; after 14 more, digest weekly.

### C. Monetisation

| # | Trigger | Email |
|---|---|---|
| C1 | 50% of free credits used | Usage report: "250 credits → 61 leads, 18 contacted, 2 replies. The rest find about 60 more." |
| C2 | 80% used | Top-up nudge with INR pack table priced in leads, not credits, and a one-tap Razorpay link. |
| C3 | 100% / blocked action | Transactional: what was blocked, credits needed, smallest pack that covers it. |
| C4 | Activated, credits idle 7 days | Internshala-style: "Your 312 unused credits find about 75 leads. Use them on {ICP}". |
| C5 | Activated, no purchase by day 10 | **First-pack offer, once:** 20% off the first pack + Bark-style guarantee: "If the pack gets you zero replies, we refund the credits." |
| C6 | Bought 2 packs | Bigger pack at a better per-credit rate (never below the ₹0.385 floor). |
| C7 | `billing.pack.checkout_start` without `paid` in 1h | Abandoned checkout (Internshala): "Your pack payment didn't go through", same Razorpay link. Transactional. |

- C5 is the only discount. Research (PostHog) shows repeated discount pressure lowers trust.
- Every B1/B2 lead alert also carries the first-pack line once the user is below 20% credits.

### D. Referral and win-back

| # | Trigger | Email |
|---|---|---|
| D1 | After first reply or meeting (peak happiness) | "Give 300 credits, get 300". Payout only when the referee buys a first pack (blocks the temp-mail abuse). |
| D2 | Inactive 14 days | "Here's what changed for your ICP": count of new matching leads since last visit, top 3. |
| D3 | Inactive 30 days | One product-news mail (e.g. V2 agents). Non-openers then get suppressed. |
| D4 | Inactive 45 days | Breakup, Keywords Everywhere style: "Last note from me. Your account stays free; I'll send one lead digest a month. Reply 'yes' for weekly." |

The existing reactivation steps (day 3/5/10/15/20) overlap A2–A6 and D2. Fold them in: keep the
widening gaps, swap the V1 city/radius content for the user's V2 ICP when one exists.
The existing partnership invite at 0 credits stays, but goes *after* C3 (buy first), not instead.

## 6. Rules for every email

- Plain text or near-plain. At most one image, no GIFs, one CTA.
- Subject = the user's own data or a lead, never a feature name.
- Every lifecycle mail has `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
  and a preferences link (lead alerts on/off, digest only, recaps on/off).
- Global cap: 1 nudge-type mail per day per user (B1 lead alerts and transactional excluded),
  3 per week.
- 10% random holdout per flow, logged in `product_events`, so every flow reports real lift.
- Measure on product events (plan run, unlock, campaign approve, paid), not opens.

## 7. Build order

| Week | Build | Why first |
|---|---|---|
| 1 | Lifecycle sender (`go.mantisai.in`, config set, unsubscribe + prefs, holdout, event log), SES inbound for replies | Everything sits on it |
| 1 | A1 welcome, A2 stuck-chat rescue, A3 leads-ready | Hits the 57% leak; low effort |
| 2 | C1–C3 credit meter + Razorpay deep link, C5 first-pack offer | 0 paid today; needs a decision point |
| 2 | WhatsApp + founder call for high-intent signups | Highest response channel in India |
| 3–4 | B1–B3 saved-ICP watcher + lead alerts + digest | The Bark engine; biggest build, biggest retention lever |
| 4 | B4 weekly recap, A4, A5 | Habit + learning |
| 5 | D1 referral, D2–D4 win-back | Needs activated users first |

Cold acquisition on `mantismail.live` / `mantismailer.live` runs in parallel with a slow ramp:
week 1–2 at 20–50 mails/inbox/day, up only if bounce < 2% and complaints < 0.08%.

## 8. Targets to watch

| Metric | Today | 30-day target |
|---|---|---|
| Chats reaching a plan | 43% | 60% |
| Signups running a plan within 24h | unknown, measure | baseline + 20% |
| First paid pack | 0 | first 10 paying users |
| Lead-alert CTR | n/a | > 8% |
| Lifecycle unsubscribe | n/a | < 0.5% per mail |
| Spam complaints | ~0 | < 0.08% (gate) |

## 9. Key sources

- PostHog onboarding versions: https://posthog.com/blog/how-we-built-email-onboarding
- Lenny on activation metrics: https://www.lennysnewsletter.com/p/how-to-determine-your-activation
- Elena Verna on activation: https://www.elenaverna.com/p/hey-b2b-i-bet-you-are-measuring-activation
- Vero action-based sequence: https://getvero.com/resources/email-onboarding-sequence
- patio11 lifecycle results: https://training.kalzumeus.com/newsletters/archive/lifecycle_emails_results
- HN plain-text onboarding: https://news.ycombinator.com/item?id=24707994
- Grammarly weekly report: https://www.getvero.com/resources/grammarly/
- Clay referral credits: https://www.clay.com/changelog/exciting-news-in-platform-referrals-for-all-workspaces
- Replit spend/credit packs: https://docs.replit.com/billing/managing-spend
- Gmail sender rules: https://support.google.com/a/answer/81126
- HubSpot plain text vs HTML: https://blog.hubspot.com/marketing/plain-text-vs-html-emails-data
- Blume on India SaaS (WhatsApp): https://blume.vc/commentaries/the-rough-guide-to-building-an-enterprise-saas-dhandha-in-india
- RBI e-mandate limits: https://www.businesstoday.in/personal-finance/news/story/rbi-caps-recurring-payments-at-rs15000-without-otp-under-new-e-mandate-framework-526759-2026-04-21
