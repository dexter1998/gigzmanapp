# AI voice calls — agent contract (Mantis ⇄ hosted voice agents)

Mantis places AI calls through a hosted voice-agent platform. Two agents exist there; Mantis passes
everything call-specific as **input variables** and reads results back from **output variables**.
Keep names exactly as below — the agent prompts reference them.

Provider details (never shown in the UI): `SARVAM_API_KEY`, `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`,
`SARVAM_CONNECTION_ID`, `SARVAM_FROM_NUMBER` in env. Agent ids/versions:
`VOICE_CALLER_APP_ID`, `VOICE_CALLER_APP_VERSION`, `VOICE_TEST_APP_ID`, `VOICE_TEST_APP_VERSION`.

API
- Place a call: `POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org}/workspaces/{ws}/outbounds`,
  header `X-API-Key`, body:
  ```json
  { "app_config": { "app_id": "...", "app_version": "1", "app_type": "agent",
      "connection_config": { "connection_id": "...", "agent_phone_number": "+91..." },
      "agent_variables": { "...": "..." } },
    "user_config": { "user_phone_number": "+91..." },
    "webhook_config": { "url": "https://.../api/v2/outreach/voice/hosted-callback", "metadata": { "send_id": "123" } } }
  ```
  → `{ "attempt_id": "..." }`. Retry 5xx/timeouts with backoff; never retry 422.
- Read results: `GET https://apps.sarvam.ai/api/analytics/v1/{org}/{ws}/{app_id}/interactions`
  with `start_datetime`, `end_datetime` (ISO, required), `limit`, `offset`. Each item has `job_id`
  (= attempt_id), `duration_in_seconds`, `num_messages`, `ended_by`, `failure_reason`,
  `language_name`, `agent_variables` (outputs incl. `call_summary`), `audio_url`.
  Webhooks can be lost: always reconcile by polling.

## Agent 1 — "Mantis Caller" (every campaign call)

Input variables (all "include in context"):

| name | meaning | example |
|---|---|---|
| `agent_name` | what the caller calls herself | Neha |
| `caller_company` | who the call is on behalf of (campaign "sending as") | Gigzman |
| `followup_with` | the human who follows up | Tarun from Gigzman |
| `offer_name` | what is offered / asked about | SEO |
| `offer_summary` | one line on the offer | getting found on Google search and Maps |
| `call_goal` | skill goal, one line | Book a 15-minute follow-up call |
| `call_playbook` | how this skill runs (2–5 short lines) | (from the skill) |
| `lead_name` | who we are speaking to (person, else business) | Dr. Mehta |
| `business_name` | the lead's business | Smile Dental Clinic |
| `business_area` | city / area | Sector 56, Gurgaon |
| `business_category` | trade | dentist |
| `why_calling` | the specific reason for THIS lead (signal noticed) | their website has no online booking |
| `number_source` | how we got the number (honest) | their Google Business listing |
| `lead_brief` | extra facts about the lead, short | 4.6★, 120 reviews, no Instagram |

Output variables: `call_summary` (built in), `outcome` (interested | not_interested | callback |
booked | wrong_person | no_conversation), `meeting_day`, `meeting_time`, `meeting_person`,
`notes`.

## Agent 2 — "Mantis Test Call" (Integrations → test call, and campaign "Send test")

A normal testing call to the Mantis user themself: it says this is a Mantis test call, chats
normally, answers questions about Mantis, and asks for feedback (how Mantis feels, would they
consider a paid plan, imagine campaigns running on autopilot with calls, replies and bookings).

Input variables: `user_name`, `user_company`, `campaign_context` (optional: what the campaign would
say, so the user hears their own pitch in brief).
Output variables: `call_summary`, `rating` (1–5), `would_pay` (yes | maybe | no), `feedback`.
