/** Hotel booking engines (India-heavy list) by script/iframe/link fingerprints in the site's HTML. */
const ENGINES: Record<string, RegExp> = {
  synxis: /synxis\.com|be\.synxis|travelclick/i,
  ezee: /ezeeabsolute|ezee(centrix|reservation)|ipms247\.com/i,
  staah: /staah\.(net|com)|staahmax/i,
  cloudbeds: /cloudbeds\.com/i,
  simplotel: /simplotel/i,
  djubo: /djubo/i,
  asiatech: /asiatech(inc)?\.(in|com)|asiatechbooking/i,
  bookingjini: /bookingjini/i,
};

export function hasBookingEngine(html: string): { found: boolean; engines: string[] } {
  const engines = Object.entries(ENGINES).filter(([, re]) => re.test(html)).map(([k]) => k);
  return { found: engines.length > 0, engines };
}
