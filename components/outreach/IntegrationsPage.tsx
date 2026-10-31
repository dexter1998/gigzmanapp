"use client";

/**
 * Integrations (docs/v2-campaigns.md). Two groups, as agreed: OUTREACH channels (mail, WhatsApp,
 * AI voice) and CRM/data. The list only says what each channel is and whether it's set up: a
 * channel with nothing connected shows "Setup & Connect", a connected one collapses to its account
 * + "Manage setup". Both open that channel's own setup screen (/integrations/<channel>), which is
 * where every connect happens — and every connect is verified live before it shows as connected.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, CircleHelp, ArrowRight, PhoneCall } from "lucide-react";
import { BrandLogo, type Brand } from "./BrandLogo";
import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import { ConnectedSummary, FlashBar, useOutreachData, useReturnFlash, SupportLink, type Flash } from "./integrations/shared";

type Row = { href: string; brands: Brand[]; title: string; desc: string; tag?: string; soon?: boolean };

export function IntegrationsPage({ initialFlash = null }: { initialFlash?: Flash | null }) {
  const { data, failed, of } = useOutreachData();
  const [tab, setTab] = useState<"outreach" | "crm">("outreach");
  const [flash, setFlash] = useReturnFlash(initialFlash);
  const voiceReady = !!data?.voice?.ok;

  return (
    <div className="ox-page">
      <header className="ox-head">
        <div>
          <h1>Integrations</h1>
        </div>
      </header>
      <FlashBar flash={flash} onClose={() => setFlash(null)} />
      {failed && <FlashBar flash={{ ok: false, text: "Couldn't load channels · refresh" }} onClose={() => {}} />}
      <div className="ox-acc-bar">
        <div className="ox-acc-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "outreach"} className={tab === "outreach" ? "on" : ""} onClick={() => setTab("outreach")}>Outreach channels</button>
          <button type="button" role="tab" aria-selected={tab === "crm"} className={tab === "crm" ? "on" : ""} onClick={() => setTab("crm")}>CRM &amp; data</button>
        </div>
        <SupportLink className="ox-acc-help" subject="Help with Mantis integrations setup"><CircleHelp size={17} /> Setup help</SupportLink>
      </div>
      <p className="ox-acc-sub">{tab === "outreach"
        ? "Your own accounts, or Mantis inboxes, numbers and voice."
        : "Sync leads and replies to your tools."}</p>

      {tab === "outreach" && (
        <>
          <ChannelCard
            brand="gmail" title="Email senders" href="/integrations/email" loading={!data && !failed}
            intro="Your mailboxes or Mantis warmed inboxes" defaultOpen
            connected={of("email").length ? <ConnectedSummary senders={of("email")} href="/integrations/email" /> : null}
            rows={[
              { href: "/integrations/email?method=gmail", brands: ["google-color"], title: "Connect Gmail", desc: "Google Workspace or Gmail" },
              { href: "/integrations/email?method=outlook", brands: ["microsoft"], title: "Connect Outlook", desc: "Microsoft 365 or Outlook" },
              { href: "/integrations/email?method=smtp", brands: ["imap"], title: "Connect custom SMTP", desc: "Zoho, SendGrid, any provider" },
              { href: "/integrations/email?method=mantis", brands: ["mantis"], title: "Use Mantis inboxes", desc: "Pre-warmed · best deliverability", tag: "Recommended" },
            ]}
          />
          {/* WhatsApp is coming soon: the card stays so people know it is on the way, but there is
              nothing to set up yet and nothing is sent on that channel (lib/v2/outreach/channels.ts). */}
          <ChannelCard
            brand="whatsapp" title="WhatsApp" href="/integrations/whatsapp" loading={false} soon={!WHATSAPP_LIVE}
            intro={WHATSAPP_LIVE ? "Your WhatsApp Business number" : "Bulk WhatsApp campaigns · on the way"}
            connected={WHATSAPP_LIVE && of("whatsapp").length ? <ConnectedSummary senders={of("whatsapp")} href="/integrations/whatsapp" /> : null}
            rows={[
              { href: "/integrations/whatsapp?method=meta", brands: ["whatsapp"], title: "Connect your number", desc: "Own WhatsApp Business number", soon: !WHATSAPP_LIVE },
              { href: "/integrations/whatsapp?method=mantis", brands: ["mantis"], title: "Use a Mantis number", desc: "Verified, warmed · approved templates", soon: true },
            ]}
          />
          <ChannelCard
            brand="voice" title="AI voice calls" href="/integrations/voice" loading={!data && !failed}
            intro="Hours, credits, voice, India rules"
            connected={voiceReady ? (
              <div className="ox-summary">
                <span className="ox-summary-logos"><span><BrandLogo brand="voice" size={20} /></span></span>
                <span className="ox-summary-main"><b>Mantis voice agent</b><span>{data?.voice?.note}</span></span>
                <span className="ox-status on">Ready</span>
                <Link className="v2-btn" href="/integrations/voice#test" title="Rings your phone now — hear the agent before you launch"><PhoneCall size={14} /> Test call</Link>
                <Link className="v2-btn" href="/integrations/voice">Manage setup</Link>
              </div>
            ) : null}
            rows={[
              { href: "/integrations/voice#hours", brands: ["voice"], title: "Calling hours", desc: `${data?.voice?.window.from ?? "10:00"}–${data?.voice?.window.to ?? "19:30"} IST · Mon–Sat` },
              { href: "/integrations/voice#credits", brands: ["mantis"], title: "Credits", desc: `${data?.voice?.creditsPerMinute ?? 30} credits/connected min · unanswered free` },
              { href: "/integrations/voice#skills", brands: ["voice"], title: "Voice & skills", desc: "Sales, partnership, announcement + more · per touch" },
              { href: "/integrations/voice#rules", brands: ["voice"], title: "India rules", desc: "DLT route · DND · hours · consent" },
              { href: "/integrations/voice#test", brands: ["voice"], title: "Test call", desc: "Rings you now · hear the agent" },
            ]}
          />
        </>
      )}

      {tab === "crm" && (
        <section className="ox-crm-section">
          <div className="ox-crm-grid">
            {([
              ["hubspot", "HubSpot", "Contacts, companies, deals"],
              ["zoho", "Zoho CRM", "Leads + activities"],
              ["pipedrive", "Pipedrive", "Deal per interested reply"],
              ["sheets", "Google Sheets", "Lead lists as live sheets"],
              ["zapier", "Zapier", "Leads + replies → 6,000 apps"],
              ["webhook", "Webhook", "POST leads + replies to your URL"],
            ] as Array<[Brand, string, string]>).map(([b, name, desc]) => (
              <div key={name} className="ox-crm-card">
                <span className="ox-crm-logo"><BrandLogo brand={b} size={26} /></span>
                <b>{name}</b>
                <span>{desc}</span>
                <span className="ox-status off">Coming soon</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * One channel as an accordion row (the reference layout): icon tile, title + one-line subtitle,
 * "Setup & Connect" (or the connected account + Manage setup) and a chevron. Open, it lists the
 * ways to set it up as a full-width table — logo, name, description, chevron — each a deep link
 * into the channel's setup screen.
 */
function ChannelCard({ brand, title, intro, href, rows, connected, loading, defaultOpen = false, soon = false }: {
  brand: Brand; title: string; intro: string; href: string; rows: Row[]; connected: React.ReactNode | null; loading: boolean; defaultOpen?: boolean;
  /** Channel not live yet: no setup button, a "Coming soon" status instead, rows inert. */
  soon?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`ox-acc${open ? " open" : ""}`}>
      <div className="ox-acc-head">
        <button type="button" className="ox-acc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="ox-acc-icon"><BrandLogo brand={brand} size={30} /></span>
          <span className="ox-acc-title"><b>{title}</b><span>{intro}</span></span>
        </button>
        <div className="ox-acc-right">
          {soon ? <span className="ox-status off">Coming soon</span>
            : loading ? <span className="ox-acc-skel" aria-label="Loading" />
            : connected ? <div className="ox-acc-connected">{connected}</div>
            : <Link className="ox-acc-cta" href={href}>Setup &amp; Connect <ArrowRight size={15} /></Link>}
          <button type="button" className="ox-acc-chev" aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown size={18} /></button>
        </div>
      </div>
      {open && (
        <div className="ox-acc-rows">
          {rows.map((r) => {
            const body = (
              <>
                <span className="ox-acc-logo">{r.brands.map((b) => <BrandLogo key={b} brand={b} size={22} />)}</span>
                <span className="ox-acc-name">{r.title}{r.tag && <span className="ox-acc-pill">{r.tag}</span>}{r.soon && <span className="ox-acc-pill soon">Soon</span>}</span>
                <span className="ox-acc-desc">{r.desc}</span>
                <ChevronRight size={17} className="ox-acc-go" />
              </>
            );
            // A whole channel that is coming soon has nothing behind its rows yet.
            return soon
              ? <div key={r.title} className="ox-acc-row" aria-disabled="true" style={{ cursor: "default", opacity: 0.7 }}>{body}</div>
              : <Link key={r.title} href={r.href} className="ox-acc-row">{body}</Link>;
          })}
        </div>
      )}
    </section>
  );
}
