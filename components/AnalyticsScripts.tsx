"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasAnalyticsConsent } from "@/components/CookieConsent";

/**
 * The widget is an iframe embedded on other people's sites. Global chrome from this app's root
 * layout must not render inside it: the consent banner covered the Send button in a 380px frame,
 * and firing our page-view analytics from a frame on a customer's homepage would book their
 * traffic as ours. A path check rather than a second root layout — Next only allows those when
 * there is no top-level app/layout.tsx, and restructuring every route for one embed is the kind
 * of change that breaks things far from the thing being built.
 */
const isWidgetFrame = (pathname: string | null) => Boolean(pathname?.startsWith("/widget"));


/** Root layout is a server component, so consent (localStorage) can only be checked client-side
 * after mount — the GA <Script> tags live here instead of inline so they never render, and never
 * fire a network request, until that check comes back "granted". */
export function AnalyticsScripts({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(hasAnalyticsConsent());
  }, []);

  if (!consented) return null;

  if (isWidgetFrame(pathname)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" />
      <Script id="ga-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
