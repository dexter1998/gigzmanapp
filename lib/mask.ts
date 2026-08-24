/** Masks a name/label down to its first word's first 3 characters plus dots — e.g.
 * "Paid Media Advertiser" -> "Pai•••••••••••••". Shared between the API (real protection: an
 * unpurchased lead's identity shouldn't be recoverable from the raw response) and any client
 * rendering that still wants the same masked string as a fallback/display value. */
export function maskName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const head = first.slice(0, 3);
  return `${head}${"•".repeat(Math.max(3, first.length - 3))}`;
}
