"use client";

/**
 * What the LEAD sees, inside real devices:
 *  - Gmail on the web, in a laptop (full Gmail chrome around the open message);
 *  - the Gmail app on an Android phone (2025 Material 3 Expressive look: tinted surface, message
 *    card, filled Reply / Forward);
 *  - WhatsApp on an Android phone, the business's message arriving as an incoming bubble;
 *  - a call script, on the in-call screen.
 * HTML mail renders in a sandboxed iframe (no scripts).
 */

import { useState } from "react";
import {
  Laptop, Smartphone, Star, Reply, Forward, MoreVertical, ArrowLeft, Archive, OctagonAlert, Trash2, MailOpen, Clock, FolderInput, Tag,
  Printer, ExternalLink, ChevronDown, ChevronLeft, ChevronRight, Video, Phone as PhoneIcon, Paperclip, Camera, Mic, Smile, Menu, Search,
  Pencil, Inbox, Send, File, Settings, HelpCircle, Grid3x3, MessageSquare, Users, Smile as Emoji, MicOff, Grid2x2, Volume2, UserPlus, PhoneOff,
} from "lucide-react";
import { fill, SAMPLE_VALUES } from "@/lib/v2/outreach/graph";
import { LaptopFrame, PhoneFrame } from "./Devices";

export const looksHtml = (s: string) => /<\s*(html|body|div|p|table|br|a|h[1-6]|span|img|strong|em|ul|ol)\b/i.test(s);

const AVATAR_COLORS = ["#1a73e8", "#e8710a", "#188038", "#a142f4", "#d93025", "#007b83", "#5f6368"];
const avatarColor = (s: string) => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function mailDoc(body: string, html: boolean, media: string | null | undefined, px: number) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const img = media ? `<p><img src="${media}" alt=""></p>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
    html,body{margin:0;padding:0;overflow:hidden}
    body{font:${px}px/1.5 Arial,Helvetica,sans-serif;color:#222;word-wrap:break-word}
    img{max-width:100%;height:auto} a{color:#1155cc} p{margin:0 0 1em}</style></head>
    <body>${img}${html ? body : `<div>${esc(body)}</div>`}</body></html>`;
}

function MailFrame({ doc, title }: { doc: string; title: string }) {
  const [h, setH] = useState(120);
  return (
    <iframe className="pv-iframe" title={title} sandbox="allow-popups allow-same-origin" srcDoc={doc} style={{ height: h }}
      onLoad={(e) => { const d = e.currentTarget.contentDocument; if (d) setH(Math.min(2400, d.documentElement.scrollHeight + 2)); }} />
  );
}

type MailProps = { subject: string; body: string; isHtml?: boolean; mediaUrl?: string | null; from?: string; values?: Record<string, string> };

function useMail(p: MailProps) {
  const values = p.values ?? SAMPLE_VALUES;
  const from = p.from ?? `${values.sender_name || "Tarun"} <hello@yourcompany.com>`;
  return {
    values, html: p.isHtml ?? looksHtml(p.body), body: fill(p.body, values), subject: fill(p.subject || "(no subject)", values),
    name: from.replace(/<.*>/, "").replace(/"/g, "").trim() || from, addr: from.match(/<(.*)>/)?.[1] ?? from,
    to: values.business_name || "them",
  };
}

/** Gmail on the web — the open message with Gmail's own chrome around it (1280×800). */
export function GmailWeb(p: MailProps) {
  const m = useMail(p);
  return (
    <div className="gw">
      <aside className="gw-rail">
        <Menu size={22} />
        <span className="gw-rail-item on"><span><Inbox size={20} /></span>Mail</span>
        <span className="gw-rail-item"><span><MessageSquare size={20} /></span>Chat</span>
        <span className="gw-rail-item"><span><Users size={20} /></span>Spaces</span>
        <span className="gw-rail-item"><span><Video size={20} /></span>Meet</span>
      </aside>
      <aside className="gw-nav">
        <div className="gw-logo"><svg width="32" height="24" viewBox="0 0 32 24"><path d="M2 24h5V11.5L0 6.2V22a2 2 0 0 0 2 2z" fill="#4285f4"/><path d="M25 24h5a2 2 0 0 0 2-2V6.2l-7 5.3z" fill="#34a853"/><path d="M25 2.5v9L32 6.2V3.5c0-2.5-2.8-3.9-4.8-2.4z" fill="#fbbc04"/><path d="M7 11.5v-9l9 6.8 9-6.8v9l-9 6.7z" fill="#ea4335"/><path d="M0 3.5v2.7l7 5.3v-9L4.8 1.1C2.8-.4 0 1 0 3.5z" fill="#c5221f"/></svg><span>Gmail</span></div>
        <span className="gw-compose"><Pencil size={20} /> Compose</span>
        {[["Inbox", Inbox, "1"], ["Starred", Star, ""], ["Snoozed", Clock, ""], ["Sent", Send, ""], ["Drafts", File, ""], ["More", ChevronDown, ""]].map(([l, I, n], i) => {
          const Icon = I as typeof Inbox;
          return <span key={l as string} className={`gw-nav-item${i === 0 ? " on" : ""}`}><Icon size={18} /><span>{l as string}</span><em>{n as string}</em></span>;
        })}
      </aside>
      <div className="gw-main">
        <div className="gw-top">
          <span className="gw-search"><Search size={20} /><span>Search mail</span></span>
          <span className="gw-top-r"><HelpCircle size={22} /><Settings size={22} /><Grid3x3 size={22} /><span className="gw-me">{m.to.charAt(0).toUpperCase()}</span></span>
        </div>
        <div className="gw-card">
          <div className="gw-tools">
            <ArrowLeft size={18} /><i /><Archive size={18} /><OctagonAlert size={18} /><Trash2 size={18} /><i /><MailOpen size={18} /><Clock size={18} /><i /><FolderInput size={18} /><Tag size={18} /><MoreVertical size={18} />
            <span className="gw-pager">1 of 1 <ChevronLeft size={18} /><ChevronRight size={18} /></span>
          </div>
          <div className="gw-scroll">
            <div className="gw-subject"><h1>{m.subject}</h1><span className="gw-chip">Inbox <b>×</b></span><span className="gw-subject-r"><Printer size={18} /><ExternalLink size={18} /></span></div>
            <div className="gw-from">
              <span className="gw-av" style={{ background: avatarColor(m.name) }}>{m.name.charAt(0).toUpperCase()}</span>
              <span className="gw-who"><b>{m.name}</b> <span className="gw-addr">&lt;{m.addr}&gt;</span><br /><span className="gw-to">to me <ChevronDown size={14} /></span></span>
              <span className="gw-when">10:42 AM (0 minutes ago) <Star size={18} /><Emoji size={18} /><Reply size={18} /><MoreVertical size={18} /></span>
            </div>
            <div className="gw-body"><MailFrame doc={mailDoc(m.body, m.html, p.mediaUrl, 14)} title="Email in Gmail" /></div>
            <div className="gw-actions"><span><Reply size={18} /> Reply</span><span><Forward size={18} /> Forward</span><span className="gw-emoji"><Emoji size={18} /></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Gmail app on Android (Material 3 Expressive, 2025): tinted surface, message card, filled buttons. */
export function GmailApp(p: MailProps) {
  const m = useMail(p);
  return (
    <div className="ga">
      <div className="ga-bar"><ArrowLeft size={26} /><span /><Archive size={24} /><Trash2 size={24} /><MailOpen size={24} /><MoreVertical size={24} /></div>
      <div className="ga-subject"><span>{m.subject} <span className="ga-chip">Inbox</span></span><Star size={26} /></div>
      <div className="ga-card">
        <div className="ga-from">
          <span className="ga-av" style={{ background: avatarColor(m.name) }}>{m.name.charAt(0).toUpperCase()}</span>
          <span className="ga-who"><b>{m.name}</b> <em>now</em><br /><span>to me <ChevronDown size={16} /></span></span>
          <span className="ga-unsub">Unsubscribe</span><MoreVertical size={22} />
        </div>
        <div className="ga-body"><MailFrame doc={mailDoc(m.body, m.html, p.mediaUrl, 16)} title="Email in the Gmail app" /></div>
      </div>
      <div className="ga-actions"><span><Reply size={22} /> Reply</span><span><Forward size={22} /> Forward</span><span className="ga-emoji"><Emoji size={22} /></span></div>
      <div className="ga-nav"><span className="on"><Inbox size={24} /><b>99+</b></span><span><MessageSquare size={24} /></span><span><Video size={24} /></span></div>
    </div>
  );
}

/** Email preview with a device switch: Gmail in a laptop, or the Gmail app on a phone. */
export function EmailPreview(props: MailProps & { phoneWidth?: number; defaultDevice?: "laptop" | "phone" }) {
  const [device, setDevice] = useState<"laptop" | "phone">(props.defaultDevice ?? "laptop");
  return (
    <div className="pv">
      <div className="pv-switch" role="group" aria-label="Preview on">
        <button type="button" className={device === "laptop" ? "on" : ""} onClick={() => setDevice("laptop")}><Laptop size={15} /> Laptop</button>
        <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}><Smartphone size={15} /> Phone</button>
      </div>
      {device === "laptop"
        ? <LaptopFrame><GmailWeb {...props} /></LaptopFrame>
        : <PhoneFrame width={props.phoneWidth ?? 300} status="tinted"><GmailApp {...props} /></PhoneFrame>}
    </div>
  );
}

/** WhatsApp's own formatting: *bold* _italic_ ~strike~ ```mono```. */
function waFormat(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/```([\s\S]+?)```/g, "<code>$1</code>")
    .replace(/(^|[\s(])\*(\S[^*]*?\S|\S)\*(?=$|[\s).,!?])/g, "$1<b>$2</b>")
    .replace(/(^|[\s(])_(\S[^_]*?\S|\S)_(?=$|[\s).,!?])/g, "$1<i>$2</i>")
    .replace(/(^|[\s(])~(\S[^~]*?\S|\S)~(?=$|[\s).,!?])/g, "$1<s>$2</s>");
}

/** WhatsApp on Android, as the lead receives your business's message. */
export function WhatsAppPreview({ body, business = "Your business", mediaUrl, values = SAMPLE_VALUES, width = 300 }: {
  body: string; business?: string; mediaUrl?: string | null; values?: Record<string, string>; width?: number;
}) {
  return (
    <div className="pv">
      <div className="pv-caption">Lead · WhatsApp</div>
      <PhoneFrame width={width}>
        <div className="wa">
          <div className="wa-bar">
            <ArrowLeft size={26} />
            <span className="wa-av" style={{ background: avatarColor(business) }}>{business.charAt(0).toUpperCase()}</span>
            <span className="wa-title"><b>{business}</b><span>Business account</span></span>
            <Video size={26} /><PhoneIcon size={23} /><MoreVertical size={23} />
          </div>
          <div className="wa-chat">
            <div className="wa-notice">This business uses a secure service from Meta to manage this chat. Tap to learn more.</div>
            <div className="wa-day">Today</div>
            {body.trim() || mediaUrl ? (
              <div className="wa-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {mediaUrl && <img src={mediaUrl} alt="" className="wa-img" />}
                {body.trim() && <span dangerouslySetInnerHTML={{ __html: waFormat(fill(body, values)) }} />}
                <span className="wa-time">10:42 am</span>
              </div>
            ) : <div className="wa-none">Your message shows here</div>}
          </div>
          <div className="wa-compose">
            <span className="wa-field"><Smile size={25} /><span>Message</span><Paperclip size={23} /><Camera size={23} /></span>
            <span className="wa-mic"><Mic size={24} /></span>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

/** Call touches: the talk track the user reads while on the call. */
export function CallPreview({ body, values = SAMPLE_VALUES, width = 300 }: { body: string; values?: Record<string, string>; width?: number }) {
  const who = values.business_name || "The business";
  return (
    <div className="pv">
      <div className="pv-caption">You · on call</div>
      <PhoneFrame width={width}>
        <div className="cl">
          <div className="cl-head"><span className="cl-av" style={{ background: avatarColor(who) }}>{who.charAt(0).toUpperCase()}</span><b>{who}</b><span>00:42</span></div>
          <div className="cl-script"><em>Talk track</em><div>{fill(body, values) || "Your talk track shows here"}</div></div>
          <div className="cl-keys">{[[MicOff, "Mute"], [Grid2x2, "Keypad"], [Volume2, "Speaker"], [UserPlus, "Add call"]].map(([I, l]) => { const Icon = I as typeof MicOff; return <span key={l as string}><i><Icon size={24} /></i>{l as string}</span>; })}</div>
          <span className="cl-end"><PhoneOff size={28} /></span>
        </div>
      </PhoneFrame>
    </div>
  );
}
