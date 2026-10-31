/**
 * Which outreach channels are live. WhatsApp is "Coming soon" everywhere in the dashboard: the
 * builder still renders existing WhatsApp touches, but nothing is sent on that channel — tests
 * report "Coming soon", approve queues those touches as skipped, and the worker skips any that
 * were queued earlier. Flip WHATSAPP_LIVE (and the UI's copy of it) to switch the channel back on.
 *
 * Kept free of server imports so client components can read it too.
 */
export const WHATSAPP_LIVE = false;
export const WHATSAPP_SOON_NOTE = "WhatsApp sending is coming soon — this touch was skipped";
