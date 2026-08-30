import {
  ArrowRight, Bell, Building2, Check, ChevronDown, ChevronRight, Clipboard, Clock, Crosshair,
  Download, Filter, Globe, Handshake, HelpCircle, Home, Lightbulb, Link2, Lock, Mail, Map, MapPin,
  MessageCircle, Mic, Minus, Moon, Paperclip, Phone, Plus, Quote, Radio, RefreshCw, Search, Settings,
  Shield, ShieldCheck, Sparkles, Star, Table, ThumbsDown, ThumbsUp, User, X, Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The app's icon set, backed by lucide.
 *
 * These were hand-drawn SVGs before. Keeping the same export names and the same
 * `{ color, size, filled }` prop shape means the swap touched this one file rather than the
 * hundred-odd call sites — and it keeps every default size, so nothing shifted visually.
 *
 * Six brand marks stay hand-drawn at the bottom: lucide removed brand icons, so there is no
 * LinkedIn, X, YouTube, Instagram, Facebook or WhatsApp to import.
 */

type IconProps = { color?: string; size?: number };
type FillableProps = IconProps & { filled?: boolean };

/** Wraps a lucide icon in our prop shape, preserving the default size each icon had before. */
function icon(Base: LucideIcon, defaultSize: number, defaultColor = "var(--g-ink)") {
  return function Icon({ color = defaultColor, size = defaultSize }: IconProps = {}) {
    return <Base size={size} color={color} strokeWidth={2} absoluteStrokeWidth />;
  };
}

/** Same, for the icons that render solid when active. */
function fillableIcon(Base: LucideIcon, defaultSize: number, defaultColor: string, defaultFilled = false) {
  return function Icon({ color = defaultColor, size = defaultSize, filled = defaultFilled }: FillableProps = {}) {
    return <Base size={size} color={color} strokeWidth={2} absoluteStrokeWidth fill={filled ? color : "none"} />;
  };
}

export const BellIcon = icon(Bell, 18);
export const CrosshairIcon = icon(Crosshair, 18);
export const SearchIcon = icon(Search, 18);
export const HelpIcon = icon(HelpCircle, 18);
export const StarIcon = fillableIcon(Star, 13, "var(--g-amber-core)", true);
export const GlobeIcon = icon(Globe, 14);
export const FilterIcon = icon(Filter, 18);
export const LockIcon = icon(Lock, 13);
export const CheckIcon = icon(Check, 14, "var(--g-green)");
export const XIcon = icon(X, 14, "var(--g-gray-500)");
export const BuildingIcon = icon(Building2, 18);
export const UserIcon = icon(User, 18);
export const ArrowRightIcon = icon(ArrowRight, 14, "#fff");
export const MoonIcon = fillableIcon(Moon, 18, "var(--g-ink)");
export const HomeIcon = fillableIcon(Home, 18, "var(--g-ink)");
export const ChatBubbleIcon = fillableIcon(MessageCircle, 18, "var(--g-ink)");
export const TableIcon = icon(Table, 18);
export const PartnerIcon = icon(Handshake, 18);
export const SettingsIcon = icon(Settings, 18);
export const ShieldIcon = icon(Shield, 20);
export const ShieldCheckIcon = icon(ShieldCheck, 20);
export const ClipboardIcon = icon(Clipboard, 20);
export const DownloadIcon = icon(Download, 20);
export const ClockIcon = icon(Clock, 20);
export const ZapIcon = icon(Zap, 20);
export const RadioIcon = icon(Radio, 20);
export const RefreshIcon = icon(RefreshCw, 14, "var(--g-gray-500)");
export const PinIcon = icon(MapPin, 16);
export const ChevronDownIcon = icon(ChevronDown, 14);
export const ChevronRightIcon = icon(ChevronRight, 14);
export const PlusIcon = icon(Plus, 16);
export const MinusIcon = icon(Minus, 16);
export const QuoteIcon = icon(Quote, 28, "var(--g-green)");
export const MailIcon = icon(Mail, 18);
export const PhoneIcon = icon(Phone, 18);
export const MapsPinIcon = icon(Map, 18);
export const PaperclipIcon = icon(Paperclip, 18);
export const LinkIcon = icon(Link2, 18);
export const MicIcon = icon(Mic, 18);
export const LightbulbIcon = icon(Lightbulb, 16);
export const ThumbsUpIcon = fillableIcon(ThumbsUp, 15, "var(--g-gray-500)");
export const ThumbsDownIcon = fillableIcon(ThumbsDown, 15, "var(--g-gray-500)");
export const SparkleIcon = icon(Sparkles, 14);

/* ---- Brand marks. lucide removed these, so they stay hand-drawn. ---- */

export function WhatsAppIcon({ color = "var(--g-ink)" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1 12.3-11 8.4 8.4 0 0 1 3.8 7.2Z" />
    </svg>
  );
}

export function LinkedInIcon({ color = "var(--g-ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10v6.5M7.5 7.5h.01M11.5 16.5V13a2 2 0 0 1 4 0v3.5M11.5 10v6.5" />
    </svg>
  );
}

export function XSocialIcon({ color = "var(--g-ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h4.2l4.1 5.6L16.8 4H20l-6.2 7.7L20.4 20H16.2l-4.5-6-5.4 6H3l6.7-8.2L4 4Z" />
    </svg>
  );
}

export function YouTubeIcon({ color = "var(--g-ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill={color} stroke="none" />
    </svg>
  );
}

export function InstagramIcon({ color = "var(--g-ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

export function FacebookIcon({ color = "var(--g-ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v7h3v-7h2.5l.5-3H14v-1.5a.5.5 0 0 1 .5-.5H15V8Z" />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  );
}
