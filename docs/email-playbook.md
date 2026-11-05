# Mantis email playbook: campaigns, triggers, and an idea bank

Written 2026-11-04. Companion to `docs/email-lifecycle-plan.md` (the what-to-build-first plan).
This doc is the full catalogue: how campaigns are organised, every trigger, and every mail idea
we can borrow from the inbox (tarun@gigzman.com, 1,699 third-party mails), from lead
marketplaces (Bark, IndiaMART, Justdial, Sulekha, TechBehemoths, GoodFirms, Clutch, DesignRush,
Sortlist, Trustpilot, G2, Thumbtack, Upwork), and from lemlist's growth.

Status: ideas and design. Nothing here is built.

---

## 1. How Mantis email should be organised

### Five streams, never mixed

| Stream | What | From | Domain | Unsubscribe |
|---|---|---|---|---|
| **Transactional** | OTP, receipts, low balance, blocked action, reply received, integration broken | `Mantis <no-reply@…>` (reply goes to support) | `mantisai.in` | Not required |
| **Lifecycle** | Onboarding, activation nudges, scorecards, offers, win-back | `Tarun from Mantis` | `go.mantisai.in` | One-click + preferences |
| **Lead alerts** | Bark-style per-lead alerts and daily digests | `Mantis Leads` | `leads.mantisai.in` (best) or `mantisleads.live` (see note) | One-click + frequency control |
| **Newsletter** | Weekly content: playbooks, city data, user wins | `Tarun from Mantis` | `go.mantisai.in` | One-click |
| **Cold acquisition** | Mantis finding its own customers | personas | `mantismail.live`, `mantismailer.live` | Required |

**Note on `mantisleads.live` for alerts.** Separating alerts protects mantisai.in, because alerts
are the highest-volume stream. But a signed-up user getting mail from an unfamiliar domain looks
like phishing, and links that point to a different domain than the sender raise spam scores.
If we use it anyway: say in the welcome mail "lead alerts come from mantisleads.live", keep the
display name "Mantis Leads", warm it for 2–3 weeks first, and host a real landing page on it that
redirects to mantisai.in. `leads.mantisai.in` gets the same isolation without the trust cost.

### One trigger engine

```
product_events / DB state ──► rule (who is due, which mail)
                           ──► eligibility: prefs, stream unsubscribes, caps, holdout, suppression
                           ──► render (plain text first, user's own data in subject)
                           ──► send via SES config set per stream (campaign_id tag)
                           ──► outcome: open/click/reply + the PRODUCT event it was meant to cause
```

- Extend `lib/lifecycle-email.ts`, which already does "which step is due" + idempotent claims in
  `email_sends`. Add a `stream` and `goal_event` per rule.
- **Every mail declares one goal event** (`chat.plan.run`, `leads.lead.unlock`,
  `billing.pack.paid`…). A flow is judged on that, never on opens.
- **10% holdout per flow**, stored, so lift is measured.
- **Caps:** at most 1 lifecycle/newsletter mail per day and 3 per week; lead alerts at most
  3 instant + 1 digest per day; transactional uncapped.
- **Adaptive cadence** (Bark doesn't do this, and it's the main thing to fix): no alert clicks for
  7 days → digest only; 14 more → weekly digest; 30 more → monthly scorecard only.
- **Stop rules:** a goal event ends its flow. Two ignored nudges pause the flow 14 days.
- **WhatsApp mirror:** for users with a verified number, the high-value mails (leads ready,
  reply received, pack offer) also go as a WhatsApp template. Indian founders say WhatsApp is not
  optional (Haptik, Voxxi).

---

## 2. Trigger catalogue

`D` = days since signup. All event names already exist in `docs/analytics-events.md` unless
marked *new*.

### Activation

| Trigger | Mail | Inspired by |
|---|---|---|
| Signup +1h | Tarun's plain-text welcome: "What do you sell, and who buys it? Reply in one line and I'll run your first search." | PostHog, Groove, lemlist's founder DM |
| Signup, phone given | WhatsApp from Tarun with the same question | lemlist LinkedIn DM, Haptik |
| `account.onboarding.complete` but no `business_profile.save` in 24h | "Your profile is 40% done. Users with a complete profile get 2× better matches." Shows the 3 missing fields. | Bark profile score, GoodFirms, Wellfound "missing important profile information" |
| Chat idle 2h, no `chat.plan.created` | Stuck-chat rescue: "Your plan is one answer away: {the pending question}". Deep link into that chat. | Wati "your number isn't connected yet" |
| `chat.plan.created`, no `chat.plan.run` in 1h | "Your plan is ready to run: ~{N} leads for {est_credits} credits." | Uneed "still sitting in draft", IdeaKiln "You left something unfinished" |
| Run finished, no unlock in 1h | "Your 47 leads are ready" + 3 previews (masked) | Calendly "Your first recap is ready!" |
| D1, D3, D6 while not activated | Core-loop lessons: "ICP → plan", "A list is only the beginning", "How credits are spent" | Apollo, Keywords Everywhere "How lookups are metered" |
| D4, still not activated | "What stopped you? Reply with one word." | Bark D12 "What happened, Tarun?" |
| High-intent signup (plan made or 100+ credits spent) | Offer: "15-min call, I'll build your ICP and first 50 leads with you" | lemlist beta onboarding, GoodFirms demo, Internshala "personal Hiring Partner" |

### Engagement and retention

| Trigger | Mail | Inspired by |
|---|---|---|
| New lead matches a saved ICP (high fit) | **Single-lead alert**, Bark format (§4) | Bark ×408 |
| ≥5 new matches today | **Daily digest**: "Today's 10 best leads for {ICP}" | Bark digest, JobHai "20 New Candidates" |
| Unlocked lead not contacted in 48h | "38 leads are waiting for your outreach" | JobHai "38 candidates are waiting for your response" |
| Lead re-scored (phone verified, new funding, new reviews, site went down) | "Update on a lead you saved: {name}'s owner phone is now verified" | Bark "Verified:" / "Additional details:" (but labelled honestly) |
| Campaign reply received | "Ravi from Sharma Dental replied" (transactional, instant) | Internshala "New message From Ayushi", Slack "You've got 7 unread messages" |
| Daily, while a campaign is running | "Today: 42 sent · 3 replies · 1 meeting" | Naukri "Summary of Total Responses Received on {date}" |
| Campaign scheduled | Countdown: "Your campaign starts tomorrow at 10:00" → "is live" | Saaspa.ge "One week to go… launches tomorrow… is live" |
| Campaign draft untouched 24h | "Your campaign to 120 dentists is 1 step from sending" | StartupBase "Your launch is almost ready" |
| Personal best (reply rate, meetings) | "New high: 9% reply rate this week" | TinyLaunch "mantisai.in just hit a new high: DR 25" |
| Week 1 complete | "Your first week on Mantis" recap | Sell With Boost "week 1 recap", Calendly |
| Monday, active users | Weekly recap with "next ICP to try" | Grammarly, Exotel "Good job so far hitting your goals!" |
| D21, then monthly | **Scorecard** with peer benchmark (§4) | Bark "last 30 days", TechBehemoths monthly ranking |
| Gmail/WhatsApp connection expiring or broken | "Your Gmail connection expires tomorrow, reconnect to keep sending" | npm "tokens expiring tomorrow" |
| Campaign auto-paused (bounce guard) | "We paused your campaign: 6% bounced. Here's what to fix." | Indeed "Your job post has been paused" |

### Monetisation

| Trigger | Mail | Inspired by |
|---|---|---|
| 50% free credits used | Usage report: what the credits produced | Vercel, ElevenLabs |
| 80% used | Top-up: packs priced in leads, one-tap Razorpay/UPI | Replit, RBI e-mandate reality |
| 0 credits / blocked action | "You need 40 more credits to unlock this list" + smallest pack | JobHai "You've Used Up All Your Free Profile Unlocks" |
| Credits idle 7 days | "312 unused credits ≈ 75 leads for {ICP}" | Internshala "free job post expires in 2 days" |
| D6–D7, activated, never paid | **One-time first-pack offer**: 50% off, ends tonight, + guarantee | Bark "Last chance to get 50% off" / "Final hours!" |
| `checkout_start` without `paid` in 1h | "Your payment didn't go through" + same link | Internshala "Premium plan payment is incomplete", OpenHunts "pending payment" |
| Bought 2 packs | Bigger pack, better per-credit rate | patio11 annual-upgrade mail |
| Festival / FY-end | Diwali, New Year, Holi, March 31 budget flush: bonus credits, not discounts | Internshala "Diwali Sale is LIVE 60% off" |
| Heavy user (top 10% usage) | "Want us to run it for you?" done-for-you outreach at a monthly price | Internshala "Hiring Partner", Justdial account manager |

### Referral, community, win-back

| Trigger | Mail | Inspired by |
|---|---|---|
| First reply or meeting | "Give 300 credits, get 300" (pays out on referee's first pack) | Clay, Morning Brew |
| Meets public badge criteria | "You're a Mantis Top Outreacher (Q4)" + badge + share kit | Thumbtack Top Pro, G2 badges, Product Hunt "awarded a badge" |
| Inactive 14 days | "Here's what changed for {ICP} since you left: 86 new matches" | Supabase "going to be paused" (inactivity as trigger) |
| Inactive 30 days | One product-news mail; then suppress non-openers | lemlist, Trustindex feature launches |
| Inactive 45 days | Breakup: "Last note from me. Your account stays free; one digest a month." | Keywords Everywhere "Last note from me" |
| Free plan ended / limits reached | Says exactly what stays free | Trustindex "free features remain" |

---

## 3. Idea bank: every inbox sender → a Mantis mail

| What we received | What Mantis sends |
|---|---|
| **Bark** lead alerts (408) | ICP lead alerts (§4) |
| **Bark** monthly "last 30 days" | Monthly scorecard (§4) |
| **Bark** "Emma" D0–D12 persona drip | "Tarun" persona drip, honest (a real person) |
| **Bark** Get Hired Guarantee | First-pack guarantee: "zero replies from your first 100 sends → credits back" |
| **Sortlist** "only 4 seats available, 7 days" | Seat cap per lead: "Only 5 Mantis users can unlock this lead" (a real product rule, answers the "lead sold to 10 sellers" complaint about IndiaMART/Justdial) |
| **IndiaMART** weekly BuyLead quota that lapses Saturday | Weekly free bonus: "5 free unlocks this week, they reset Sunday". Drives a weekly visit without expiring *paid* credits (Bark got backlash for that) |
| **TechBehemoths** "Your Monthly Ranking: Gurugram #19, B2B Lead Gen India #9" | Directory ranking mail to listed companies: "You're #4 of 212 web agencies in Gurugram on Mantis" + "protect your position: complete your profile" |
| **TechBehemoths** "A buyer is on your profile" | To directory-listed businesses: "3 businesses viewed your company on Mantis this week". Acquisition loop for the directory side |
| **GoodFirms** "Your Profile Is Live, Let the World Know!" | After profile done: "Your Mantis profile is live" + partner badge from the brand kit |
| **GoodFirms / Clutch** review request on vendor's behalf | "Ask 3 clients for a review, we'll send the request for you" (for the directory) |
| **Trustpilot** star row in the email | One-click NPS/rating inside a mail: "How useful were today's leads? ○○○○○" |
| **G2** buyer intent ("viewed your pricing / a competitor") | Intent signals as a paid feature: "5 companies in your ICP visited your website this week" (if we ever add a site pixel) |
| **DesignRush** "Placements start at $500, average project $50K" | Price packs against deal size: "₹999 pack ≈ 250 leads. One web project is ₹40,000." |
| **Justdial** Verified / Trusted badges | "Verified on Mantis" for directory businesses that claim and verify their page |
| **JobHai** "38 candidates waiting for your response" | "38 leads waiting for your outreach" |
| **JobHai** "You've used up all your free profile unlocks" | Credit wall mail |
| **Naukri** daily response summary | Campaign daily summary |
| **Naukri** "Repost jobs that expired recently" | "Re-run last month's search: 120 new businesses since" |
| **Wellfound** "Your company is missing important profile information" | Business profile incomplete |
| **Wellfound** "100 candidates match your searches" | Saved-ICP match count |
| **Internshala** complimentary post + expiry countdown | Bonus credits with a real deadline (only bonus credits, never paid ones) |
| **Internshala** "Hire with Confidence: Now Guaranteed" | Guarantee launch mail |
| **Internshala** "Simran, your hiring expert" callback | "Book 15 min with Tarun" |
| **Internshala** Diwali Sale | Festival bonus credits |
| **Calendly** "7 days left in your trial! See your progress" | "250 credits left. Here's what you did with the first 250" |
| **Calendly** "Your first recap is ready!" | First-run recap |
| **Apollo** "The difference between a search and a list" | Core-loop education series |
| **Apollo** weekly events lineup | "Mantis Live, Thursday 5pm: find 100 clients in 30 min" (founder-run webinar) |
| **Semrush** "Your visibility changed today. Did you notice?" | "Your website score changed" (we already read sites) |
| **AmbitionBox** "How visible is your company?" | Free audit lead magnet: "How visible is your business online?" built on the site reader |
| **Wati** "Your number isn't connected yet" | "Connect Gmail/WhatsApp to send your first campaign" |
| **Keywords Everywhere** "Last note from me" | Breakup mail |
| **Supabase** "Project is going to be paused" | Inactivity trigger (we pause nothing; we show what's waiting) |
| **Slack** "You've got 7 unread messages" | Inbox unread replies |
| **npm** "tokens expiring tomorrow" | Integration health |
| **Indeed** "Your job post has been paused" | Campaign paused by bounce guard |
| **Exotel** "Good job so far hitting your goals!" | Progress praise |
| **Telnyx** "G2 results are in: named a leader" | Social proof mail when Mantis gets a badge/review |
| **Product Hunt** "New review on Mantis Ai" / "awarded a badge" | User badges, "Top Outreacher" |
| **TinyLaunch** "just hit a new high: DR 25" | Personal-best mails |
| **Saaspa.ge** launch countdown | Campaign countdown |
| **Uneed / IdeaKiln** "still in draft", "left something unfinished" | Unfinished plan/campaign |
| **Sell With Boost** "week 1 recap" | First-week recap |
| **Smol Launch / PeerPush / OpenHunts** weekly winners | "Lead list of the week" public post + newsletter section; the user featured gets a badge |
| **Nick Launches** "Week 26: ship a calculator as your lead magnet" | Weekly "Mantis Monday" playbook newsletter (§5) |
| **Indie Hackers** "What's New: $30k MRR in 8 months" | User win stories ("How a Jaipur agency booked 6 calls in a week") |
| **TAAFT / OpenTools** AI news | Skip; not our lane. Our newsletter is about finding customers |
| **Joey Yap** webinar countdown ("We're starting in 1 hour") | Webinar reminders for Mantis Live |
| **Rankbench / Runo** "should I close this out?" | Cold-acquisition breakup step on mantismail.live |
| **Erwinski** "Quick question for {company}" | Cold-acquisition opener |
| **DesignRush** list sold to sponsors | **Don't.** Never sell our users' inbox |
| **Wati** "For an eCommerce brand like google.com" | **Don't.** Validate every merge field; fall back to generic copy |
| Our own "We accidentally gave you 500 credits" | **Don't.** 22 helpdesk auto-replies; reads as a trick |

---

## 4. Formats for the four signature mails

### Lead alert (Bark format, Mantis data)

```
From:    Mantis Leads
Subject: Sharma Dental Clinic (Sector 56, Gurgaon) has no website · 4.6★ 212 reviews

New lead for your ICP "dental clinics without websites, Gurgaon"

  Sharma Dental Clinic · Dentist · Sector 56, Gurgaon
  Why it fits:   no website · 212 Google reviews · open 6 days
  Owner phone:   98****1234      Email: s****@g***l.com
  Fit score:     92/100

  8 credits to unlock  →  [Unlock contact]
  2 of 5 Mantis users have unlocked this lead.

Out of credits? Your first pack is 50% off until Friday, and if your first
100 sends get zero replies, we refund the credits.

Too many alerts? [Daily digest only] · [Pause alerts] · [Unsubscribe]
```

- Subject = the lead and the signal. City in the subject (Bark puts postcode in 61 of 408).
- Masked contact + exact credit price: the paywall is on the contact, not the lead.
- Honest scarcity (real seat cap) and honest re-sends ("Update on a lead you saw").

### Monthly scorecard (Bark D21 + TechBehemoths)

```
Subject: Your October on Mantis: 512 matches, 18 contacted, 2 replies

  ICP matches this month   512
  Unlocked                  61
  Contacted                 18
  Replies                    2   (users like you average 4)
  Profile                  47%  (top users: 90%)  → [Finish profile]
  Credits left               0  → [Get 250 leads for ₹999]

  Your best ICP this month: "dentists without websites, Gurgaon" (11% reply rate)
  Try next: "salons without websites, Noida", 340 matches waiting
```

### Directory ranking (to businesses listed on Mantis; acquisition)

```
Subject: You're #4 of 212 web design agencies in Gurgaon on Mantis

  Gurgaon · Web design          #4 of 212
  Haryana · Web design          #11
  3 businesses viewed your page this week

  Claim your page to add services, a logo, and get the "Verified on Mantis" badge.
  [Claim your page]
```

This turns the 50k-company directory into a two-sided loop: listed companies discover Mantis, and
some of them are agencies that need leads.

### Founder welcome (plain text)

```
From:    Tarun Kumar <tarun@go.mantisai.in>   Reply-To: tarun@mantisai.in
Subject: quick question

Hi Priya,

I'm Tarun, I built Mantis. What do you sell, and who usually buys it?

Reply in one line and I'll run your first search myself and send you
the list.

Tarun
```

---

## 5. Content and newsletter

**"Mantis Monday"**, weekly, one email, built from things we already have:

1. **One playbook** from the blog (e.g. "How to pitch a website to a business with 200 reviews
   and no site"). Repurposes blog posts as the newsletter, as the user asked.
2. **One city data point** from our own registry: "Jaipur: 64% of salons have no website" (we
   have website-gap rates by country/city). Nobody else can publish this; it's our moat as content.
3. **Lead list of the week**: a real ICP, real counts, and the reply rate a user got (with
   permission). lemlist's "Lemlister of the week" and weekly templates were its core loop.
4. **One user win** (Indie Hackers "What's New" style).
5. **One product change**, one line.

Plain text, 300 words, from Tarun. Footer: referral link.

---

## 6. What lemlist teaches (grew to $10M ARR bootstrapped in ~3.5 years, $40M+ by 2025)

| lemlist did | Mantis version |
|---|---|
| Founder ran early customers' campaigns live, in exchange for publishing results | 15-min "I'll build your first plan with you" calls for stuck users; every result becomes a post and a newsletter story |
| Activation redesign took activation 15% → 35%, revenue +60% next month | Fix the 57% no-plan leak before adding more mail |
| Facebook group, seeded by answering questions in other groups first; 75% member-written | Answer lead-gen questions in Indian founder/agency WhatsApp, LinkedIn and Reddit groups; then open a WhatsApp community for agency owners |
| Founder posts daily ("100 posts in 100 days"); team builds personal brands | Tarun posts "Lead list of the week" on LinkedIn daily-ish |
| Warm outbound: export people who engaged with posts, filter by ICP, run campaigns | Run Mantis on our own LinkedIn engagers; every campaign is also a demo |
| Free tools as SEO lead magnets (email checker, finder) | Free "10 leads for your ICP" sample, free email/WhatsApp checker, free website audit, on top of the pSEO list pages |
| Reverse trial: 14 days of everything, then a freemium that can **prepare** but not **send** | Let free users see the full plan and results; gate only unlock and send. Paywall after the aha |
| Welcome sequence with videos and personalised images; founder LinkedIn DM to every signup asking "how did you hear about us?" | Welcome + WhatsApp from Tarun; a personalised image of *their* city's lead count |
| Launch every feature (Product Hunt, AppSumo) | Launch WhatsApp outreach, AI voice, ICP agent separately; Indian venues too |
| Raised prices 50%, conversion didn't drop | Don't underprice INR packs; stay above the ₹0.385 credit floor |
| **Failed:** referral program where affiliates bid on the brand name | Ban brand-name bidding in the terms from day one |
| **Failed:** AppSumo buyers never upgraded; Product Hunt users didn't stay | If we do a lifetime pack, cap it and treat it as cash + feedback only |

Not found anywhere public: lemlist's actual lifecycle subject lines. The fastest way to get them is
to sign up for a trial and record what arrives for 14 days.

---

## 7. New ideas (ours, not copied)

1. **ICP heatmap mail.** "Where your ICP is this week": top 5 cities/areas by new matches. Opens
   because it's about *their* market.
2. **"Lead died" honesty mail.** When an unlocked lead's site comes back up or the business
   closes, tell the user, and auto-credit if it was within 7 days. Trust is the complaint every
   Indian lead marketplace has.
3. **Unlock streak.** "You've contacted leads 4 days in a row." Duolingo-style, but only for
   active users, and never guilt mail.
4. **Competitor-free guarantee.** Seat cap per lead, shown as "Only 5 users, ever". A product
   decision the email advertises.
5. **Reply coach.** When a campaign gets 0 replies after 100 sends: "Your subject line is the
   likely problem. Here are 3 that got 9% for similar ICPs."
6. **City report as PR.** Quarterly "State of small-business websites in India" from the registry;
   sent to users, journalists and the directory. Gets backlinks and press.
7. **Bonus credits, not discounts.** Festivals and milestones grant time-limited *bonus* credits.
   Paid credits never expire (avoids the Bark backlash).
8. **WhatsApp-first for India.** Every critical mail has a WhatsApp twin; the email carries the
   record, WhatsApp carries the nudge.
9. **"Your lead replied, call now" voice handoff.** When a reply lands, offer an AI-voice
   follow-up call within 5 minutes (we already have voice). Speed wins shared leads.

---

## 8. Sources

Inbox: tarun@gigzman.com, 22 Aug – 4 Nov 2026 (scraped 2026-11-04, growth-os
`bin/inbox-learning-read.ts`). Web, key ones:

- Bark credits: https://help.bark.com/hc/en-us/articles/13346288068892
- IndiaMART BuyLead allocation / lapse: https://help.indiamart.com/knowledge-base/buy-lead-allocation ,
  https://help.indiamart.com/knowledge-base/weekly-leads-lapsable
- Thumbtack Top Pro: https://pro-center.thumbtack.com/?p=21959
- Upwork Connects email prefs: https://community.upwork.com/t5/Product-Release-Notes/Connects-Email-Preferences/ba-p/1275035
- G2 buyer intent: https://documentation.g2.com/docs/buyer-intent-data-reference
- Trustpilot review notifications: https://support.trustpilot.com/hc/en-us/articles/202191368-Set-up-and-manage-review-notifications
- lemlist growth: https://www.starterstory.com/cold-email-platform ,
  https://www.starterstory.com/stories/the-underdog-he-turned-his-last-1-000-into-150m ,
  https://saasclub.io/podcast/lempire-guillaume-mobeche-405 ,
  https://www.failory.com/interview/lemlist ,
  https://getlatka.com/interviews/lemlist-charles-tenot-2025
- lemlist freemium: https://help.lemlist.com/en/articles/9579215-opening-the-freemium-model
- lemlist affiliates: https://www.lemlist.com/affiliate-program
- PostHog onboarding: https://posthog.com/blog/how-we-built-email-onboarding
- Groove triggered emails (via CXL): https://cxl.com/blog/saas-churn/
- Blume on WhatsApp in Indian SaaS: https://blume.vc/commentaries/the-rough-guide-to-building-an-enterprise-saas-dhandha-in-india
