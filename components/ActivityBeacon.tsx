"use client";

/**
 * Tracks what the user does in the app, without every component having to say so.
 *
 * Two sources, one batch to /api/events:
 *  - page views on every route change: `nav.page.view` with the path;
 *  - every click on a button, link or role=button: the element's `data-track` name when it has
 *    one (`data-track="chat.plan.run"`), else a name derived from the section (first path segment)
 *    and the control's visible text: `chat.button.run_this`. Text is normalised and capped so the
 *    event space stays finite.
 *
 * Buffered and sent with sendBeacon on an interval, on pagehide, and when the buffer fills, so a
 * click that unloads the page is not lost. Nothing here can throw into the app: every step is in
 * a try/catch and a failure only drops events.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Ev = { event: string; path: string; props?: Record<string, unknown> };

const SECTION_ALIAS: Record<string, string> = { home: "home", chat: "chat", "my-leads": "leads", leads: "leads", campaigns: "campaigns", inbox: "inbox", templates: "templates", integrations: "integrations", settings: "settings", analytics: "analytics", jobs: "jobs", start: "home", profile: "settings", lms: "other" };

function sectionOf(path: string): string {
  const seg = path.split("/").filter(Boolean)[0] ?? "home";
  return SECTION_ALIAS[seg] ?? "other";
}
function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "unnamed";
}
function sessionId(): string {
  try {
    let id = sessionStorage.getItem("mantis.sid");
    if (!id) { id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem("mantis.sid", id); }
    return id;
  } catch { return "nosession"; }
}

export function ActivityBeacon() {
  const pathname = usePathname();
  const buf = useRef<Ev[]>([]);
  const sid = useRef<string>("");

  useEffect(() => {
    sid.current = sessionId();
    const flush = () => {
      if (!buf.current.length) return;
      const events = buf.current.splice(0, 50);
      const body = JSON.stringify({ sessionId: sid.current, device: window.innerWidth < 768 ? "mobile" : "desktop", events });
      try {
        if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
          void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
        }
      } catch { /* dropped */ }
    };
    const push = (e: Ev) => { buf.current.push(e); if (buf.current.length >= 20) flush(); };
    const onClick = (ev: MouseEvent) => {
      try {
        const t = (ev.target as HTMLElement | null)?.closest<HTMLElement>("[data-track], button, a[href], [role=button]");
        if (!t) return;
        const path = window.location.pathname;
        const named = t.getAttribute("data-track");
        const text = (t.getAttribute("aria-label") || t.textContent || "").trim();
        const href = t instanceof HTMLAnchorElement ? t.getAttribute("href") : null;
        const event = named || `${sectionOf(path)}.${href ? "link" : "button"}.${slug(text || href || "unnamed")}`;
        const props: Record<string, unknown> = {};
        if (href) props.href = href.slice(0, 160);
        const ctx = t.closest<HTMLElement>("[data-track-ctx]")?.getAttribute("data-track-ctx");
        if (ctx) props.ctx = ctx.slice(0, 80);
        push({ event, path, props });
      } catch { /* dropped */ }
    };
    const timer = window.setInterval(flush, 8000);
    const onHide = () => flush();
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("pagehide", onHide); window.clearInterval(timer); flush(); };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    buf.current.push({ event: "nav.page.view", path: pathname, props: { section: sectionOf(pathname) } });
  }, [pathname]);

  return null;
}
