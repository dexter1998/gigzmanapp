"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent } from "@/components/CookieConsent";

/** Root layout is a server component, so consent (localStorage) can only be checked client-side
 * after mount — the GA <Script> tags live here instead of inline so they never render, and never
 * fire a network request, until that check comes back "granted". */
export function AnalyticsScripts({ measurementId }: { measurementId: string }) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(hasAnalyticsConsent());
  }, []);

  if (!consented) return null;

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
