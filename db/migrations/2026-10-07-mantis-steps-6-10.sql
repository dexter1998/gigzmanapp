-- Five further touches for the Mantis sequence, t6..t10.
--
-- Why new step_keys rather than re-sending an existing one: email_sends carries
-- UNIQUE(recipient, campaign_id, step_key) and sendBulkEmail claims that row before sending, so a
-- second send of t2_single to someone who already received it is refused as "already sent" -- and
-- the blast script marks a refusal as do_not_send, which would have permanently retired the
-- 19,286 stalled recipients this is meant to re-engage.
--
-- These are reachable only once campaigns.max_touches is raised past 5; until then Rule 1 of
-- decideNextStep stalls everyone at their current count. Raising it extends the sequence for
-- every active recipient, not only the stalled ones.
--
-- t5_partnership keeps is_last_chance, so it stays reserved as the final touch for someone who
-- opens without ever clicking, rather than becoming just another step in the middle.
--
-- No fabricated specifics. The existing t2_single cites a real business with real review counts;
-- inventing new ones would put false figures in front of 19,000 people, so these lean on the
-- offer instead. If each touch should carry a real example, that has to be filled from lead data.
--
-- Additive only.
INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                            requires_state, is_last_chance, subject, html, text)
VALUES
('mantis_cold_outreach_2026', 't6_multi', 6, 0, 1440, 'any', false,
 'Website leads near {{company}}',
 '<p>Hi,</p><p>We track businesses with strong reviews and no website -- the ones already getting found and with nothing to send people to.</p><p>There is a list of them around {{company}}. It is free to look at.</p><p><a href="https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t6_multi">See the leads</a></p><p>Thanks,</p><p>Manya Sachdeva<br/>Mantis AI</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
 E'Hi,\n\nWe track businesses with strong reviews and no website -- the ones already getting found and with nothing to send people to.\n\nThere is a list of them around {{company}}. It is free to look at.\n\nhttps://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t6_multi\n\nThanks,\n\nManya Sachdeva\nMantis AI\n\nUnsubscribe: {{unsubscribe_url}}\n'),

('mantis_cold_outreach_2026', 't7_single', 7, 0, 1440, 'any', false,
 'A lead for {{company}}, no website yet',
 '<p>Hi,</p><p>Every week we find businesses with hundreds of reviews and no website at all. Strong intent, nowhere for a customer to land.</p><p>Those are the easiest website conversations an agency can have.</p><p><a href="https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t7_single">Open one</a></p><p>Thanks,</p><p>Manya Sachdeva<br/>Mantis AI</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
 E'Hi,\n\nEvery week we find businesses with hundreds of reviews and no website at all. Strong intent, nowhere for a customer to land.\n\nThose are the easiest website conversations an agency can have.\n\nhttps://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t7_single\n\nThanks,\n\nManya Sachdeva\nMantis AI\n\nUnsubscribe: {{unsubscribe_url}}\n'),

('mantis_cold_outreach_2026', 't8_intent', 8, 0, 1440, 'any', false,
 'How {{company}} can tell which leads are worth calling',
 '<p>Hi,</p><p>Each lead comes with an intent score, so you can tell the ones worth a call from the ones that waste an afternoon.</p><p>That is the whole product. Nothing to install.</p><p><a href="https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t8_intent">Have a look</a></p><p>Thanks,</p><p>Manya Sachdeva<br/>Mantis AI</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
 E'Hi,\n\nEach lead comes with an intent score, so you can tell the ones worth a call from the ones that waste an afternoon.\n\nThat is the whole product. Nothing to install.\n\nhttps://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t8_intent\n\nThanks,\n\nManya Sachdeva\nMantis AI\n\nUnsubscribe: {{unsubscribe_url}}\n'),

('mantis_cold_outreach_2026', 't9_credits', 9, 0, 1440, 'any', false,
 'Free credits for {{company}}',
 '<p>Hi,</p><p>You can run Mantis on free credits first -- pull a list, check the leads, decide afterwards.</p><p>No card, no call.</p><p><a href="https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t9_credits">Claim the credits</a></p><p>Thanks,</p><p>Manya Sachdeva<br/>Mantis AI</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
 E'Hi,\n\nYou can run Mantis on free credits first -- pull a list, check the leads, decide afterwards.\n\nNo card, no call.\n\nhttps://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t9_credits\n\nThanks,\n\nManya Sachdeva\nMantis AI\n\nUnsubscribe: {{unsubscribe_url}}\n'),

('mantis_cold_outreach_2026', 't10_close', 10, 0, 1440, 'any', false,
 'Last one from me, {{company}}',
 '<p>Hi,</p><p>This is the last email I will send about this.</p><p>If finding website leads is ever useful to {{company}}, the free credits stay on the account and you can come back whenever.</p><p><a href="https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t10_close">Keep the credits</a></p><p>Thanks,</p><p>Manya Sachdeva<br/>Mantis AI</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
 E'Hi,\n\nThis is the last email I will send about this.\n\nIf finding website leads is ever useful to {{company}}, the free credits stay on the account and you can come back whenever.\n\nhttps://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email&utm_campaign=mantis_cold_outreach_2026&utm_content=t10_close\n\nThanks,\n\nManya Sachdeva\nMantis AI\n\nUnsubscribe: {{unsubscribe_url}}\n')
ON CONFLICT (campaign_id, step_key) DO NOTHING;
