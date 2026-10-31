"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mounts the founder widget on our own site the same way any other site would mount it — through
 * the public loader, not by importing the React component.
 *
 * That is deliberate. The embedded path is the one that has to keep working on sites nobody looks
 * at for months; wiring our own pages to a private code path would mean the version we exercise
 * daily is not the version customers get. This way a regression in the loader shows up here first.
 *
 * Two places it stays out of: /widget, which is the widget (a launcher inside its own iframe), and
 * /admin, where the founder does not need a button to message himself.
 */
export function FounderWidgetScript() {
  const pathname = usePathname();
  // Chat is a working surface: the launcher sat on top of the results panel's "Add to leads" bar.
  // Hidden by a root flag rather than unmounted, because a widget loaded on another page stays in
  // the DOM through client-side navigation into /chat.
  const onChat = !!pathname?.startsWith("/chat");
  useEffect(() => {
    if (onChat) document.documentElement.setAttribute("data-no-founder-widget", "");
    else document.documentElement.removeAttribute("data-no-founder-widget");
  }, [onChat]);
  if (pathname?.startsWith("/widget") || pathname?.startsWith("/admin")) return null;

  return (
    <Script
      src="/widget.js"
      strategy="lazyOnload"
      data-site="mantis"
      data-accent="#648b1c"
      data-title="Talk to Founder"
      data-greeting="Have an idea, partnership or feedback? I read every message myself."
    />
  );
}
