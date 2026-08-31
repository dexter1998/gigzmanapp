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
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
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
