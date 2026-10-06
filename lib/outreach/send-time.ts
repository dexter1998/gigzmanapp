/**
 * When a follow-up should land.
 *
 * The question "what is the best hour to send" has no single answer once a list crosses borders,
 * because the only hour that matters is the recipient's. Measured on the Mantis list over four
 * days, bot-filtered (opens more than ten minutes after the send, which excludes the security
 * scanners that open within seconds of delivery):
 *
 *     00:00-06:00 IST   18,893 sends    103 human opens   0.55%
 *     10:00-17:00 IST  153,984 sends  3,398 human opens   2.21%
 *
 * Four times the engagement, and the worst hour against the best is a hundredfold. That list is
 * Indian, so IST is its local time and the window happens to work. The Stickly list is not: 48.4%
 * of it has no country at all, and 11:00 IST is 01:30 in New York.
 *
 * So the schedule is per recipient and the pipeline keeps running around the clock — somewhere it
 * is always morning. That is the only shape that works for every country at once.
 */

/** Target band in the recipient's own time. A band rather than an hour so that 42,000 follow-ups
 *  do not all come due in the same minute; the pacing would spread them anyway, but spreading them
 *  deliberately keeps the whole batch inside the hours that actually work. */
export const LOCAL_SEND_START_HOUR = 10;
export const LOCAL_SEND_END_HOUR = 16;

/**
 * Where a timezone can come from, best first.
 *
 * 'observed' leads because it is the only one measured rather than assumed: if this person opened
 * a previous email at 09:40 their time, that is their morning, whatever their domain says. It is
 * also free — the open timestamps are already recorded — and it is available exactly when it
 * matters, because a follow-up by definition comes after a first touch.
 */
export type TzSource = "observed" | "country" | "cctld" | "default";

/**
 * One representative zone per country. A country with several zones gets the one holding most of
 * its business population, because the alternative is pretending to a precision the source data
 * does not have: "usa" in a scraped CSV does not say Denver or Atlanta.
 */
export const COUNTRY_TZ: Record<string, string> = {
  usa: "America/New_York", "united states": "America/New_York", us: "America/New_York",
  canada: "America/Toronto", ca: "America/Toronto",
  uk: "Europe/London", "united kingdom": "Europe/London", gb: "Europe/London", england: "Europe/London",
  ireland: "Europe/Dublin", ie: "Europe/Dublin",
  germany: "Europe/Berlin", de: "Europe/Berlin",
  france: "Europe/Paris", fr: "Europe/Paris",
  netherlands: "Europe/Amsterdam", nl: "Europe/Amsterdam",
  spain: "Europe/Madrid", es: "Europe/Madrid",
  italy: "Europe/Rome", it: "Europe/Rome",
  poland: "Europe/Warsaw", pl: "Europe/Warsaw",
  sweden: "Europe/Stockholm", norway: "Europe/Oslo", denmark: "Europe/Copenhagen",
  finland: "Europe/Helsinki", switzerland: "Europe/Zurich", austria: "Europe/Vienna",
  belgium: "Europe/Brussels", portugal: "Europe/Lisbon", greece: "Europe/Athens",
  czechia: "Europe/Prague", "czech republic": "Europe/Prague", romania: "Europe/Bucharest",
  ukraine: "Europe/Kyiv", turkey: "Europe/Istanbul", russia: "Europe/Moscow",
  india: "Asia/Kolkata", in: "Asia/Kolkata",
  singapore: "Asia/Singapore", sg: "Asia/Singapore",
  australia: "Australia/Sydney", au: "Australia/Sydney",
  "new zealand": "Pacific/Auckland", nz: "Pacific/Auckland",
  japan: "Asia/Tokyo", jp: "Asia/Tokyo",
  china: "Asia/Shanghai", cn: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong", hk: "Asia/Hong_Kong",
  "south korea": "Asia/Seoul", korea: "Asia/Seoul", kr: "Asia/Seoul",
  indonesia: "Asia/Jakarta", id: "Asia/Jakarta",
  malaysia: "Asia/Kuala_Lumpur", my: "Asia/Kuala_Lumpur",
  philippines: "Asia/Manila", ph: "Asia/Manila",
  vietnam: "Asia/Ho_Chi_Minh", vn: "Asia/Ho_Chi_Minh",
  thailand: "Asia/Bangkok", th: "Asia/Bangkok",
  pakistan: "Asia/Karachi", pk: "Asia/Karachi",
  bangladesh: "Asia/Dhaka", bd: "Asia/Dhaka",
  uae: "Asia/Dubai", "united arab emirates": "Asia/Dubai", ae: "Asia/Dubai",
  israel: "Asia/Jerusalem", il: "Asia/Jerusalem",
  "saudi arabia": "Asia/Riyadh", sa: "Asia/Riyadh",
  brazil: "America/Sao_Paulo", br: "America/Sao_Paulo",
  mexico: "America/Mexico_City", mx: "America/Mexico_City",
  argentina: "America/Argentina/Buenos_Aires", ar: "America/Argentina/Buenos_Aires",
  chile: "America/Santiago", colombia: "America/Bogota", peru: "America/Lima",
  "south africa": "Africa/Johannesburg", za: "Africa/Johannesburg",
  nigeria: "Africa/Lagos", ng: "Africa/Lagos",
  kenya: "Africa/Nairobi", egypt: "Africa/Cairo",
};

/** Country-code TLDs that genuinely indicate where a business operates. Deliberately excludes the
 *  ones sold as generic vanity domains — .io, .ai, .co, .me, .tv, .cc, .ly — where the TLD says
 *  nothing about location and guessing from it would be worse than admitting we do not know. */
export const CCTLD_TZ: Record<string, string> = {
  in: "Asia/Kolkata", uk: "Europe/London", de: "Europe/Berlin", fr: "Europe/Paris",
  nl: "Europe/Amsterdam", es: "Europe/Madrid", it: "Europe/Rome", pl: "Europe/Warsaw",
  se: "Europe/Stockholm", no: "Europe/Oslo", dk: "Europe/Copenhagen", fi: "Europe/Helsinki",
  ch: "Europe/Zurich", at: "Europe/Vienna", be: "Europe/Brussels", pt: "Europe/Lisbon",
  gr: "Europe/Athens", cz: "Europe/Prague", ro: "Europe/Bucharest", ua: "Europe/Kyiv",
  tr: "Europe/Istanbul", ru: "Europe/Moscow", ie: "Europe/Dublin",
  au: "Australia/Sydney", nz: "Pacific/Auckland", jp: "Asia/Tokyo", cn: "Asia/Shanghai",
  hk: "Asia/Hong_Kong", kr: "Asia/Seoul", sg: "Asia/Singapore", my: "Asia/Kuala_Lumpur",
  ph: "Asia/Manila", vn: "Asia/Ho_Chi_Minh", th: "Asia/Bangkok", pk: "Asia/Karachi",
  bd: "Asia/Dhaka", ae: "Asia/Dubai", il: "Asia/Jerusalem", sa: "Asia/Riyadh",
  br: "America/Sao_Paulo", mx: "America/Mexico_City", ar: "America/Argentina/Buenos_Aires",
  cl: "America/Santiago", za: "Africa/Johannesburg",
  ng: "Africa/Lagos", ke: "Africa/Nairobi", eg: "Africa/Cairo", ca: "America/Toronto",
};

/**
 * The zone to assume when nothing is known.
 *
 * America/New_York rather than Asia/Kolkata, from the Stickly list's own opens: 285 of 408 human
 * opens landed between 13:00 and 17:00 UTC, which is the US morning. The list is where the
 * business is, not where we are.
 */
export const DEFAULT_TZ = "America/New_York";

export function tzFromCountry(country: string | null | undefined): string | null {
  const key = (country ?? "").trim().toLowerCase();
  if (!key || key === "unknown" || key === "other" || key === "europe") return null;
  return COUNTRY_TZ[key] ?? null;
}

export function tzFromDomain(domain: string | null | undefined): string | null {
  const d = (domain ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!d.includes(".")) return null;
  const parts = d.split(".");
  const last = parts[parts.length - 1];
  // "acme.co.uk" — the meaning is in the second-level part, not the last one.
  if (parts.length >= 3 && ["co", "com", "org", "net", "ac", "gov"].includes(parts[parts.length - 2])) {
    return CCTLD_TZ[last] ?? null;
  }
  return CCTLD_TZ[last] ?? null;
}

export function resolveTz(opts: { country?: string | null; domain?: string | null }):
  { tz: string; source: TzSource } {
  const byCountry = tzFromCountry(opts.country);
  if (byCountry) return { tz: byCountry, source: "country" };
  const byDomain = tzFromDomain(opts.domain);
  if (byDomain) return { tz: byDomain, source: "cctld" };
  return { tz: DEFAULT_TZ, source: "default" };
}

/**
 * The next moment inside the recipient's local send band, at least `minGapMinutes` from now.
 *
 * The minute is spread deterministically across the band from a per-recipient seed rather than at
 * random, so the same recipient keeps the same slot across touches and a re-run cannot move them.
 * Without the spread, every follow-up in a timezone comes due in the same minute and the batch
 * drains out of the good hours and into the mediocre ones behind them.
 */
export function nextLocalSlot(opts: {
  tz: string;
  minGapMinutes: number;
  seed: string;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  const earliest = new Date(now.getTime() + opts.minGapMinutes * 60_000);

  let h = 0;
  for (const c of opts.seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bandMinutes = (LOCAL_SEND_END_HOUR - LOCAL_SEND_START_HOUR) * 60;
  const offsetMinutes = h % bandMinutes;

  for (let day = 0; day <= 8; day++) {
    const probe = new Date(earliest.getTime() + day * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: opts.tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(probe);
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    const localDate = `${get("year")}-${get("month")}-${get("day")}`;

    // Build the candidate as "that local date at START + offset", then find the UTC instant whose
    // local rendering matches it. Two passes converge because the offset error is itself the
    // correction, and it survives a DST boundary where a fixed offset would not.
    const target = { h: LOCAL_SEND_START_HOUR + Math.floor(offsetMinutes / 60), m: offsetMinutes % 60 };
    let guess = new Date(`${localDate}T${String(target.h).padStart(2, "0")}:${String(target.m).padStart(2, "0")}:00Z`);
    for (let i = 0; i < 2; i++) {
      const p2 = new Intl.DateTimeFormat("en-CA", {
        timeZone: opts.tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).formatToParts(guess);
      const g = (t: string) => Number(p2.find((p) => p.type === t)!.value);
      const renderedUtcEquivalent = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
      const wanted = Date.UTC(
        Number(localDate.slice(0, 4)), Number(localDate.slice(5, 7)) - 1, Number(localDate.slice(8, 10)),
        target.h, target.m
      );
      guess = new Date(guess.getTime() + (wanted - renderedUtcEquivalent));
    }
    if (guess.getTime() >= earliest.getTime()) return guess;
  }
  return earliest;
}
