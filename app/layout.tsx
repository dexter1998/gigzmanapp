import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, Poppins } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Headline/greeting moments only ("Welcome back, Tarun.") — everything else (UI, body,
// labels) stays Plus Jakarta Sans, matching Origami's own display+body pairing without
// adopting Origami's colors.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

// The "mantis" wordmark specifically (sidebar, login) — everything else keeps its existing
// font treatment.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "mantis",
  description: "Find local businesses without a website.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
