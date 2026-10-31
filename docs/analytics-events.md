# Product analytics — events, funnels, upsell signals

Built 2026-10-26. Purpose: every user action is recorded once, in one table, so the admin can see
what each section is used for, where users drop, and who is ready to pay — and so later analysis
(cohorts, pricing experiments, churn) has raw rows rather than guesses.

## 1. One table

`product_events(user_email, session_id, event, section, source, path, props, device, created_at)`

- `event` = `section.object.action`, e.g. `chat.plan.run`, `integrations.email.connected`.
- `source` = `client` (behaviour: clicks, page views) or `server` (truth: an action that completed).
- `section` is derived from the event name; the admin groups by it.
- `props` carries ids and small facts (run_id, campaign_id, credits, plan), never free text or PII.

## 2. Capture

**Client beacon** (`components/ActivityBeacon.tsx`, mounted once in the app layout): every click on a
button / link / role=button becomes an event — the element's `data-track` name when it has one,
otherwise `<section>.button.<text>` from the control's visible text. Every route change is
`nav.page.view`. Batched; sent with `sendBeacon` so unload clicks survive.

Give an important control a stable name with `data-track="chat.plan.run"` so renaming the label
does not split its history; put `data-track-ctx="campaign:123"` on a container to attach context.

**Server events** (`lib/events.ts` → `trackEvent`, called from API routes): what actually happened.

| Event | Where | Props |
|---|---|---|
| chat.message.send | POST /api/chats/[id]/messages | turn_type, action_type, took_ms |
| chat.context.confirm | same (action confirm_context) | profile_id, offering |
| chat.plan.created | same (plan produced) | run_id, target, est_credits |
| chat.plan.run | same (run_plan) | run_id |
| chat.run.control | POST /api/v2/runs/[id]/control | action |
| leads.lead.unlock / add / open_site / open_linkedin / contact | POST /api/v2/outcomes | run_id, n |
| leads.map.search | POST /api/leads/find | place_type, area, billed |
| leads.lead.enrich | POST /api/v2/enrich, /api/leads/[id]/enrich | n |
| campaigns.campaign.create / planner.plan / campaign.test / approve / control | /api/v2/outreach/campaigns* | campaign_id, kind, channels |
| templates.template.save | /api/v2/outreach/templates | kind |
| integrations.email.connect_start / connected | senders/google/start, callback, POST senders | provider |
| integrations.voice.test_call | voice/test-call | seconds, credits |
| billing.pack.checkout_start / paid | payments/order, razorpay/verify, webhooks | pack, amount, credits |
| account.onboarding.complete | /api/user/onboarding | mode |
| account.business_profile.save | /api/v2/business-profiles | source |

## 3. Funnels (per user, from server events)

1. **Activation**: signup → onboarding.complete → first chat.message.send → first chat.plan.created → first chat.plan.run → first leads.lead.* action.
2. **Outreach**: chat.plan.run → integrations.email.connected → campaigns.campaign.create → campaign.test → campaign.approve → (inbox reply opened).
3. **Monetisation**: credits below 100 → billing.pack.checkout_start → billing.pack.paid.

Drop-off is measured stage to stage over 7 / 30 days; the admin shows counts and conversion.

## 4. Upsell signals (computed in the admin, not stored)

A user is **ready to upsell** when, in the last 14 days, any two hold:
- ≥ 3 runs started, or ≥ 40 leads delivered;
- a lead action (unlock / add / contact) in ≥ 2 sessions;
- email connected or a test call made;
- credits < 25% of what they were granted, or a checkout started and not paid;
- ≥ 5 active days.

Signals are shown per user with the evidence (which events), so sales can act on them.

## 5. What is deliberately not tracked

Message text, lead names, emails, phone numbers. Admin pages (they are ours). The public site
(GA4 covers it).
