/**
 * Real brand marks for Integrations. Paths come from simple-icons (CC0); the marks simple-icons no
 * longer ships (Microsoft, Pipedrive) are drawn here from their public brand shapes.
 */
import { siGmail, siGoogle, siWhatsapp, siMeta, siHubspot, siZoho, siGooglesheets, siZapier } from "simple-icons";

type Icon = { path: string; hex: string; title: string };
const SI: Record<string, Icon> = {
  gmail: siGmail, google: siGoogle, whatsapp: siWhatsapp, meta: siMeta, hubspot: siHubspot, zoho: siZoho, sheets: siGooglesheets, zapier: siZapier,
};

export type Brand = keyof typeof SI | "microsoft" | "pipedrive" | "imap" | "mantis" | "voice" | "webhook" | "google-color";

export function BrandLogo({ brand, size = 22 }: { brand: Brand; size?: number }) {
  if (brand === "google-color") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Google" role="img">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
    );
  }
  if (brand === "microsoft") {
    return (
      <svg width={size} height={size} viewBox="0 0 23 23" aria-label="Microsoft" role="img">
        <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M12 1h10v10H12z" />
        <path fill="#00A4EF" d="M1 12h10v10H1z" /><path fill="#FFB900" d="M12 12h10v10H12z" />
      </svg>
    );
  }
  if (brand === "pipedrive") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Pipedrive" role="img">
        <rect width="32" height="32" rx="8" fill="#1A1A1A" />
        <path fill="#fff" d="M17.2 7.5c-2 0-3.2.9-3.8 1.6l-.1-1.2H9.6v17.6h3.8v-5.4c.6.5 1.7 1 3.3 1 3.6 0 6.1-2.8 6.1-6.9 0-4.2-2.4-6.7-5.6-6.7zm-.8 10.3c-2 0-2.9-1.9-2.9-3.6 0-2.7 1.5-3.7 2.9-3.7 1.7 0 2.9 1.5 2.9 3.6 0 2.4-1.4 3.7-2.9 3.7z" />
      </svg>
    );
  }
  if (brand === "imap" || brand === "webhook" || brand === "voice" || brand === "mantis") {
    const d = brand === "imap" ? "M3 6h18v12H3zM3 7l9 6 9-6" : brand === "webhook" ? "M10 13a5 5 0 1 1 4-8M14 11a5 5 0 1 1-4 8M8 17h8" : brand === "voice" ? "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" : "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z";
    const color = brand === "mantis" ? "#3f6f12" : "#4b5148";
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label={brand} role="img"><path d={d} /></svg>
    );
  }
  const i = SI[brand];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label={i.title} role="img"><path fill={`#${i.hex}`} d={i.path} /></svg>
  );
}
