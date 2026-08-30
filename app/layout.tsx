import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-BBJ4EB6XYK";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Headline/greeting moments only ("Welcome back, Tarun.") — everything else (UI, body,
// labels) stays Plus Jakarta Sans, matching Origami's own display+body pairing without
// adopting Origami's colors.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

// The "mantis" wordmark specifically (sidebar, login) — everything else keeps its existing
// font treatment.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "mantis",
  description: "Find local businesses without a website.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* afterInteractive: loads once the page is interactive, matching Next.js's own
            recommendation for analytics scripts that don't need to block rendering. */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />
        <Script id="ga-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
