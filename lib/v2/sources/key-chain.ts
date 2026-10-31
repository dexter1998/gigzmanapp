/**
 * Paid-API keys in order of use: `<NAME>` first, then `<NAME>_NEXT`. A key that answers "out of
 * credits / not allowed" is set aside for the life of the process and the call moves to the next
 * one — so an old key's remaining credits are used up before a new key is touched (Tarun,
 * 2026-10-23: "purani wali bhi exhaust krlena").
 */

const spent = new Set<string>();

export function keysFor(name: string): string[] {
  return [process.env[name], process.env[`${name}_NEXT`]].map((k) => k?.trim() ?? "").filter((k) => k && !spent.has(k));
}

export function hasKey(name: string): boolean {
  return keysFor(name).length > 0;
}

/** Marks a key exhausted; the next keysFor() call skips it. */
export function retireKey(key: string): void {
  spent.add(key);
}

/** HTTP answers that mean "this key can't pay for this call", not "this request is wrong". */
export function looksExhausted(status: number, body: string): boolean {
  if (status === 401 || status === 402) return true;
  return /credit|quota|insufficient|billing|limit exceeded|API_INACCESSIBLE|plan|invalid api key|unauthori[sz]ed/i.test(body) && status >= 400;
}
