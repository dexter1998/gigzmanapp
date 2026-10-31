/** ?connected= / ?error= from an OAuth round trip → the flash a setup screen shows once. */
export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
export function flashFrom(sp: Record<string, string | string[] | undefined>) {
  const connected = one(sp.connected), error = one(sp.error);
  if (connected) return { ok: true, text: `Connected ${connected.slice(0, 200)} — Mantis can send from it now.` };
  if (error) return { ok: false, text: error.slice(0, 300) };
  return null;
}
