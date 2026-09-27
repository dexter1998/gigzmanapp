"use client";

import Script from "next/script";
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
