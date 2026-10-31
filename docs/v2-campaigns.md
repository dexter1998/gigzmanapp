# Mantis V2 — outreach (Campaigns, Inbox, Analytics, Templates, Integrations)

Agreed 2026-10-21. V2-gated (V2_EMAILS). Builds on the lead lists in docs/v2-agents.md.

## Flow
1. **Start:** from a chat's results (**Quick Outreach**: that chat's list, builder opens and the
   planner drafts at once) or from Campaigns → Create (sequence / quick email / quick WhatsApp /
   quick call list) → pick a list.
2. **Campaign Planner** (`lib/v2/outreach/planner.ts`, Sonnet): reads the list (count, email/phone
   reach, what we noticed), the seller profile and the connected senders, and returns TOUCHES
   (channel, wait, subject, body). Code compiles them to the canvas graph (`graph.ts`); the model
   never places nodes and never sends. Edits ("make touch 2 a WhatsApp") re-plan the whole
   sequence from the current one.
3. **Canvas:** React Flow, n8n-style nodes: trigger → touch → wait → "Replied?" (yes → stop) → …
   Click a node to edit it with a live inbox / phone preview, or start it from a template.
4. **Test:** popup asks email / WhatsApp / mobile (saved for next time); every touch goes to the
   user, filled with the first lead's real values. Call touches are talk tracks (AI voice: soon).
5. **Approve:** start now or at a time, an IST send window, days, new leads per day. Every
   lead × touch becomes a `v2_sends` row; unreachable ones are `skipped` with the reason.
6. **Run:** pause / resume / stop. A reply stops that lead's sequence (Inbox).

## Safety
- Approve is required, and a test must have been sent first.
- Real sends to leads also need `V2_OUTREACH_SEND=1` on the server. Without it the queue fills
  and waits, so local/test environments can't cold-mail real businesses. Tests always go.
- Sender secrets (SMTP passwords, Google refresh tokens, Meta tokens) are AES-GCM encrypted
  (`secret.ts`) and never returned to the client.
- Every connect is verified live: SMTP login, Gmail profile read, Meta number read.
- WhatsApp is never the planner's first touch to a stranger (Meta policy).

## Senders (Integrations)
| Channel | Options | State |
|---|---|---|
| Email | Google (Gmail API OAuth), IMAP/SMTP, Microsoft | Google + SMTP built; Microsoft needs an Entra app |
| Email | Mantis pre-warmed inboxes (AWS) | UI + `v2_sender_pool`; no stock yet |
| WhatsApp | Meta Cloud API (own number) | built |
| WhatsApp | Mantis pre-warmed numbers | UI only; no stock yet |
| Voice | Mantis voice agent | coming soon; call touches are tasks |
| CRM | HubSpot, Zoho, Pipedrive, Sheets, Zapier, Webhook | shown as coming soon |

Google needs, in GCP project dhando-506016: the Gmail API (enabled), the gmail.send +
gmail.readonly scopes on the consent screen, and the redirect URI
`<AUTH_URL>/api/v2/outreach/senders/google/callback` on the OAuth client.

## Worker & inbox (built 2026-10-21)
- `GET /api/cron/v2-outreach` (CRON_SECRET, same as the other crons): reads replies first, then
  drains due sends (`worker.ts`). Rows are claimed (`sending`) before anything goes out.
- Follow-up emails go into the first touch's thread (In-Reply-To / Gmail threadId, "Re:" subject),
  and carry a List-Unsubscribe mailto header plus a "reply unsubscribe" line.
- Per-sender daily limit (rolling 24h). Nothing left to send → campaign `done`. Call touches become `task`.
- Stops: a reply (any channel), a bounce, `email_unsubscribes` (stream `v2:<user>`), suppressed/bounced registry addresses.
- `inbox.ts`: Gmail API / IMAP. Only replies to OUR sends are stored (thread, In-Reply-To or a mailed
  address); Haiku sorts reply / auto-reply and the sentiment. Auto-replies don't stop a sequence.
- WhatsApp: `POST /api/v2/outreach/whatsapp/webhook` (needs `META_APP_SECRET`, `V2_WA_VERIFY_TOKEN`
  and a public URL). Replies → Inbox; read receipts → opened.
- Testing without real sends: `V2_OUTREACH_REDIRECT=<address>` sends every lead message there
  (subject prefixed with the real recipient). Verified with a local SMTP sink: 5 sends, threading,
  and a simulated reply cancelling that lead's next touch.

## Not built yet
- Email open tracking (needs a public pixel URL, and hurts deliverability — left out on purpose).
- WhatsApp first touches need Meta-approved templates; free text only works inside the 24h window.
- Microsoft OAuth, CRM connectors (a Composio key is saved in .env.local, deliberately unused).
- Scheduling the cron on App Runner (EventBridge → the route), and prod schema
  (`scripts/deploy/apply-schema-prod.sh`) before deploy.

## AI voice calls (2026-10-22)
- The voice agent is `~/Desktop/voice-call-poc` (Telnyx AI assistant). Mantis calls its
  `POST /api/integrations/mantis/calls` (HMAC with `V2_VOICE_SECRET` = the voice server's
  `MANTIS_SHARED_SECRET`). The voice server POSTs the result to `/api/v2/outreach/voice/callback`.
- Each call touch has a mode, AI voice agent or call task, and a skill: pitch, sales,
  partnership, collaboration, announcement, vendor finding (`purchase`) or introduce. The
  planner picks the skill and writes the agent's brief; the brief reaches the assistant as
  `{{lead_brief}}`, with the seller's profile as the offer facts.
- Queue: calls go out 10:00–19:30 IST, Monday to Saturday, one at a time per user, and only with
  credits for 3 minutes. Each lead's call is spaced 4 minutes after the previous one's.
- Credits: `voice_minute` = 30 per connected minute, billed once per call (ledger ref
  `voicecall:<session>`). Unanswered calls are free.
- Results: an answered call writes its transcript to Inbox. A booking also stops that lead's
  sequence.
- Compliance: the voice server dials only numbers in `MANTIS_ALLOWED_NUMBERS` until the India
  140-series/DLT route exists (`MANTIS_ALLOW_ANY_NUMBER=true` lifts this; set it only then).
  Live sends also need `V2_OUTREACH_SEND=1`, or `V2_OUTREACH_REDIRECT` +
  `V2_VOICE_REDIRECT_PHONE` for testing.
