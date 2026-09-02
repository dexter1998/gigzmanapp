import type { Instrumentation } from "next";

/**
 * Global server-error collector. onRequestError fires for every uncaught error in a route
 * handler or server component — one hook instead of a logAppError call in every catch block.
 * Routes that swallow errors deliberately (payment fallbacks, Bedrock degradation) still call
 * logAppError themselves, because a swallowed error never reaches here.
 *
 * The user comes from the Auth.js session cookie, decoded best-effort — attribution is the whole
 * point of app_errors over CloudWatch, but a decode failure must never eat the error row.
 */
/**
 * A client that goes away mid-response is not an application error.
 *
 * Next prefetches on hover, so a user moving the mouse across a list of links opens and abandons
 * several streams a second; each one surfaces here as "aborted" or "The destination stream closed
 * early". Twenty-five of them arrived in one three-minute window and filled the admin panel's
 * error list, which is exactly how a real error gets missed.
 */
function isClientDisconnect(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /destination stream closed early|^aborted$|ECONNRESET|socket hang up|request aborted/i.test(msg);
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (isClientDisconnect(err)) return;
  try {
    const { logAppError } = await import("@/lib/app-errors");
    let userEmail: string | null = null;
    try {
      const cookieHeader = request.headers.cookie;
      const raw = typeof cookieHeader === "string" ? cookieHeader : "";
      const name = raw.includes("__Secure-authjs.session-token") ? "__Secure-authjs.session-token" : "authjs.session-token";
      const m = raw.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`));
      if (m && process.env.AUTH_SECRET) {
        const { decode } = await import("next-auth/jwt");
        const token = await decode({ token: decodeURIComponent(m[1]), secret: process.env.AUTH_SECRET, salt: name });
        userEmail = (token?.email as string | undefined) ?? null;
      }
    } catch { /* anonymous row is still worth keeping */ }
    await logAppError(request.path, err, {
      userEmail,
      context: { method: request.method, routerKind: context.routerKind, routeType: context.routeType },
    });
  } catch (hookErr) {
    console.error("onRequestError hook failed", hookErr);
  }
};
